import { Router } from "express";
import { requireAuth, requireOwner, requireAdmin } from "../middlewares/auth";
import { db, apartments, apartmentPhotos, users, bookings } from "@workspace/db";
import { eq, and, or, desc, asc, sql, ilike } from "drizzle-orm";
import { insertApartmentSchema } from "@workspace/db/schema";
import { getAuth } from "@clerk/express";
import { ensureSeedApartments } from "../lib/seed-apartments";
import { createNotification } from "../lib/notifications-helper";
import { resolveAndExtractMapLink, isValidCoordinate } from "../lib/link-parser";
import { fetchNearbyAmenitiesFromOverpass, invalidateOverpassCache } from "../lib/overpass";
import { validateAmenitiesRatings, persistServiceRating } from "../lib/rating-validator";

const router = Router();

// Browse apartments (public or student or filtering by query parameters)
router.get("/", async (req, res) => {
  try {
    const { 
      city, 
      university, 
      minPrice, 
      maxPrice, 
      bedrooms, 
      status, 
      ownerId, 
      page = "1", 
      limit = "50",
      q,
      search,
      roomType,
      availableOnly,
      availablePlacesOnly,
      sort
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    // Text Search query (title, description, city, university, address)
    const rawSearch = String(q || search || "").trim();
    if (rawSearch.length > 0) {
      const searchQuery = rawSearch.slice(0, 100);
      const pattern = `%${searchQuery}%`;
      conditions.push(
        or(
          ilike(apartments.title, pattern),
          ilike(apartments.description, pattern),
          ilike(apartments.city, pattern),
          ilike(apartments.university, pattern),
          ilike(apartments.address, pattern)
        )
      );
    }

    if (city && typeof city === "string" && city.trim()) {
      conditions.push(eq(apartments.city, city.trim().slice(0, 50)));
    }
    if (university && typeof university === "string" && university.trim()) {
      conditions.push(eq(apartments.university, university.trim().slice(0, 50)));
    }
    if (roomType && typeof roomType === "string" && roomType.trim()) {
      conditions.push(eq(apartments.roomType, roomType.trim().slice(0, 50)));
    }

    if (minPrice) {
      const minVal = parseInt(minPrice as string, 10);
      if (!isNaN(minVal) && minVal >= 0) {
        conditions.push(sql`${apartments.pricePerMonth} >= ${minVal}`);
      }
    }
    if (maxPrice) {
      const maxVal = parseInt(maxPrice as string, 10);
      if (!isNaN(maxVal) && maxVal >= 0) {
        conditions.push(sql`${apartments.pricePerMonth} <= ${maxVal}`);
      }
    }
    if (bedrooms) {
      const bedVal = parseInt(bedrooms as string, 10);
      if (!isNaN(bedVal) && bedVal >= 0) {
        conditions.push(eq(apartments.bedrooms, bedVal));
      }
    }
    if (ownerId && typeof ownerId === "string") {
      conditions.push(eq(apartments.ownerId, ownerId));
    }

    // CRITICAL SECURITY RULE: Students and public users MUST ONLY see "متاح" (approved & available) properties.
    // Pending ("قيد المراجعة") or rejected ("مرفوض") properties are never returned to students/public.
    const auth = getAuth(req);
    let isRequesterAdmin = false;
    let requesterId: string | null = null;
    let requesterClerkId: string | null = null;

    if (auth?.userId) {
      const authUser = await db.query.users.findFirst({
        where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
      });
      if (authUser) {
        if (authUser.role === "admin" || authUser.role === "super_admin") isRequesterAdmin = true;
        requesterId = authUser.id;
        requesterClerkId = authUser.clerkUserId;
      }
    }

    if (isRequesterAdmin) {
      // Admins can see all or filter by requested status
      if (status && status !== "all" && typeof status === "string") {
        conditions.push(eq(apartments.status, status));
      }
    } else if (ownerId && requesterId && (ownerId === requesterId || (requesterClerkId && ownerId === requesterClerkId))) {
      // The owner themselves querying their own apartments can see their pending/rejected units
      if (status && status !== "all" && typeof status === "string") {
        conditions.push(eq(apartments.status, status));
      }
    } else {
      // For general student/public browsing or other owners, strictly restrict to "متاح"
      conditions.push(eq(apartments.status, "متاح"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Strict allowed sort values mapping
    let orderByClause: any[] = [desc(apartments.createdAt)];
    if (sort === "price_asc") {
      orderByClause = [asc(apartments.pricePerMonth)];
    } else if (sort === "price_desc") {
      orderByClause = [desc(apartments.pricePerMonth)];
    } else if (sort === "newest") {
      orderByClause = [desc(apartments.createdAt)];
    } else if (sort === "livability") {
      orderByClause = [desc(apartments.livabilityScore)];
    }

    let data = await db.query.apartments.findMany({
      where: whereClause,
      limit: limitNum,
      offset,
      orderBy: orderByClause,
      with: {
        photos: {
          orderBy: [asc(apartmentPhotos.displayOrder)],
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (data.length === 0 && !city && !university && !ownerId && !rawSearch) {
      await ensureSeedApartments();
      data = await db.query.apartments.findMany({
        where: whereClause,
        limit: limitNum,
        offset,
        orderBy: orderByClause,
        with: {
          photos: {
            orderBy: [asc(apartmentPhotos.displayOrder)],
          },
          owner: {
            columns: {
              fullName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      });
    }

    // Recalculate dynamic availablePlaces and append activeBookings
    const aptIds = data.map((a: any) => a.id);
    let allActiveBookings: any[] = [];
    if (aptIds.length > 0) {
      allActiveBookings = await db.query.bookings.findMany({
        where: and(
          or(...aptIds.map((id: number) => eq(bookings.propertyId, id))),
          or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
        ),
        columns: {
          id: true,
          propertyId: true,
          appointmentDate: true,
          status: true,
        }
      });
    }

    let enhancedData = data.map((apt: any) => {
      const aptBookings = allActiveBookings.filter((b: any) => b.propertyId === apt.id);
      const capacity = apt.bedrooms || 0;
      const currentRoommates = apt.currentRoommates || 0;
      const occupiedPlaces = currentRoommates + aptBookings.length;
      const availablePlaces = Math.max(0, capacity - occupiedPlaces);
      const hasValidCoords = apt.lat !== null && apt.lat !== undefined && apt.lng !== null && apt.lng !== undefined && !isNaN(Number(apt.lat)) && !isNaN(Number(apt.lng));
      return {
        ...apt,
        nearbyAmenities: hasValidCoords ? apt.nearbyAmenities : null,
        activeBookings: aptBookings,
        availablePlaces,
      };
    });

    // Authoritative server-side availablePlaces filter
    if (availableOnly === "true" || availablePlacesOnly === "true") {
      enhancedData = enhancedData.filter((apt: any) => apt.availablePlaces > 0);
    }

    return res.json(enhancedData);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Authenticated Owner endpoint to retrieve all their apartments (all statuses)
router.get("/mine", requireAuth, requireOwner, async (req, res) => {
  try {
    const dbUser = req.dbUser!;
    
    // Support filtering by ownerId (or clerkUserId)
    const userConditions = [eq(apartments.ownerId, dbUser.id)];
    if (dbUser.clerkUserId) {
      userConditions.push(eq(apartments.ownerId, dbUser.clerkUserId));
    }

    const data = await db.query.apartments.findMany({
      where: or(...userConditions),
      orderBy: [desc(apartments.createdAt)],
      with: {
        photos: {
          orderBy: [asc(apartmentPhotos.displayOrder)],
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            phoneNumber: true,
            isVerified: true,
          },
        },
      },
    });

    // Recalculate dynamic availablePlaces and append activeBookings
    const aptIds = data.map((a: any) => a.id);
    let allActiveBookings: any[] = [];
    if (aptIds.length > 0) {
      allActiveBookings = await db.query.bookings.findMany({
        where: and(
          or(...aptIds.map((id: number) => eq(bookings.propertyId, id))),
          or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
        ),
        columns: {
          id: true,
          propertyId: true,
          appointmentDate: true,
          status: true,
        }
      });
    }

    const enhancedData = data.map((apt: any) => {
      const aptBookings = allActiveBookings.filter((b: any) => b.propertyId === apt.id);
      const capacity = apt.bedrooms || 0;
      const currentRoommates = apt.currentRoommates || 0;
      const occupiedPlaces = currentRoommates + aptBookings.length;
      const availablePlaces = Math.max(0, capacity - occupiedPlaces);
      const hasValidCoords = apt.lat !== null && apt.lat !== undefined && apt.lng !== null && apt.lng !== undefined && !isNaN(Number(apt.lat)) && !isNaN(Number(apt.lng));
      return {
        ...apt,
        nearbyAmenities: hasValidCoords ? apt.nearbyAmenities : null,
        activeBookings: aptBookings,
        availablePlaces,
      };
    });

    return res.json(enhancedData);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get single apartment details by ID
router.get("/:id", async (req, res) => {
  try {
    const apartmentId = parseInt(req.params.id as string, 10);
    if (Number.isNaN(apartmentId)) {
      return res.status(400).json({ error: "Invalid apartment ID" });
    }

    let data = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
      with: {
        photos: {
          orderBy: [asc(apartmentPhotos.displayOrder)],
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (!data) {
      await ensureSeedApartments();
      data = await db.query.apartments.findFirst({
        where: eq(apartments.id, apartmentId),
        with: {
          photos: {
            orderBy: [asc(apartmentPhotos.displayOrder)],
          },
          owner: {
            columns: {
              fullName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      });
    }

    if (!data) {
      return res.status(404).json({ error: "Not found", message: "الوحدة السكنية غير موجودة" });
    }

    // Strict privacy: if property is not approved/available ("متاح"), only Admin or the property Owner can view it
    if (data.status !== "متاح") {
      const auth = getAuth(req);
      let canViewUnapproved = false;
      if (auth?.userId) {
        const authUser = await db.query.users.findFirst({
          where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
        });
        if (authUser) {
          if (authUser.role === "admin" || authUser.role === "super_admin" || authUser.id === data.ownerId || authUser.clerkUserId === data.ownerId) {
            canViewUnapproved = true;
          }
        }
      }
      if (!canViewUnapproved) {
        return res.status(404).json({ error: "Not found", message: "الوحدة السكنية غير متاحة أو قيد مراجعة الإدارة" });
      }
    }

    // Fetch active bookings for this apartment
    const activeBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.propertyId, data.id),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
      ),
      columns: {
        id: true,
        propertyId: true,
        appointmentDate: true,
        status: true,
      }
    });

    const capacity = data.bedrooms || 0;
    const currentRoommates = data.currentRoommates || 0;
    const occupiedPlaces = currentRoommates + activeBookings.length;
    const availablePlaces = Math.max(0, capacity - occupiedPlaces);

    const hasValidCoords = data.lat !== null && data.lat !== undefined && data.lng !== null && data.lng !== undefined && !isNaN(Number(data.lat)) && !isNaN(Number(data.lng));
    const enhancedData = {
      ...data,
      nearbyAmenities: hasValidCoords ? data.nearbyAmenities : null,
      activeBookings,
      availablePlaces,
    };

    return res.json(enhancedData);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Protected routes for owner: Create apartment
router.post("/", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const { photos, ...bodyData } = req.body;

  const result = insertApartmentSchema.safeParse(bodyData);
  if (!result.success) {
    return res.status(400).json({ error: "Bad Request", issues: result.error.format() });
  }

  try {
    // 1. Google Maps link resolution and coordinates extraction
    let lat = bodyData.lat !== undefined ? Number(bodyData.lat) : undefined;
    let lng = bodyData.lng !== undefined ? Number(bodyData.lng) : undefined;
    const mapLink = bodyData.mapLink || bodyData.googleMapsLink || bodyData.locationLink;

    if (mapLink) {
      const resolved = await resolveAndExtractMapLink(mapLink);
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      } else {
        return res.status(400).json({
          error: "Bad Request",
          message: "لم نتمكن من استخراج الإحداثيات من رابط الخريطة المدخل. يرجى توفير رابط Google Maps صالح أو إدخال الإحداثيات مباشرة.",
        });
      }
    }

    // 2. Coordinates Range Validation
    if (lat !== undefined || lng !== undefined) {
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          error: "Bad Request",
          message: "يجب تحديد خط العرض وخط الطول معاً لتحديد الموقع.",
        });
      }

      if (!isValidCoordinate(lat, lng)) {
        return res.status(400).json({
          error: "Bad Request",
          message: `الإحداثيات المدخلة غير صالحة (خط العرض: ${lat}، خط الطول: ${lng}). يجب أن يكون خط العرض بين -90 و 90، وخط الطول بين -180 و 180.`,
        });
      }
    }

    // 3. Real OSM Overpass Fetching or Admin-provided nearbyAmenities with Mkany ratings
    let nearbyAmenities = null;
    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      if (req.body.nearbyAmenities !== undefined) {
        if (dbUser.role === "admin" || dbUser.role === "super_admin") {
          const ratingValidation = validateAmenitiesRatings(req.body.nearbyAmenities);
          if (!ratingValidation.valid) {
            return res.status(400).json({
              error: "Bad Request",
              message: ratingValidation.error || "التقييم المدخل غير صالح. تقييم مكاني يجب أن يكون بين 0 و 5 وبمضاعفات النصف نجمة (0, 0.5, 1, 1.5, ... 5).",
            });
          }
          nearbyAmenities = ratingValidation.sanitized;
          for (const entry of ratingValidation.entriesToPersist) {
            try {
              await persistServiceRating(entry, dbUser.id);
            } catch (persistErr) {
              req.log.warn({ persistErr, entry }, "Failed to persist service rating to DB table");
            }
          }
        }
      } else {
        try {
          nearbyAmenities = await fetchNearbyAmenitiesFromOverpass(lat, lng);
        } catch (overpassErr) {
          console.error("Failed to fetch amenities from Overpass:", overpassErr);
        }
      }
    }

    // Extract images list from photos or images array
    const photoUrls: string[] = Array.isArray(photos) && photos.length > 0
      ? photos
      : (Array.isArray(result.data.images) ? result.data.images : []);

    // WORKFLOW RULE: If created by an Owner (non-admin), property starts in "قيد المراجعة" (Pending Review) and unverified.
    // Admin / Super Admin submissions can immediately be "متاح" and verified.
    const initialStatus = (dbUser.role === "admin" || dbUser.role === "super_admin") 
      ? (result.data.status || "متاح") 
      : "قيد المراجعة";

    const initialVerified = (dbUser.role === "admin" || dbUser.role === "super_admin") 
      ? (result.data.verified ?? true) 
      : false;

    const [apartment] = await db
      .insert(apartments)
      .values({
        ...result.data,
        lat,
        lng,
        nearbyAmenities,
        images: photoUrls,
        ownerId: dbUser.id,
        status: initialStatus,
        verified: initialVerified,
      })
      .returning();

    // Persist photos into apartment_photos table
    let savedPhotos: any[] = [];
    if (photoUrls.length > 0) {
      const photoInserts = photoUrls.map((url, index) => ({
        apartmentId: apartment.id,
        url,
        displayOrder: index,
        isCover: index === 0,
      }));

      savedPhotos = await db.insert(apartmentPhotos).values(photoInserts).returning();
    }

    try {
      if (dbUser.role !== "admin" && dbUser.role !== "super_admin") {
        // Owner submitted a property for review
        await createNotification({
          userId: dbUser.id,
          type: "owner_property_submitted",
          title: "تم تقديم العقار للمراجعة",
          body: `تم استلام تفاصيل عقارك "${apartment.title}" بنجاح وهو قيد المراجعة حالياً من قبل الإدارة.`,
          referenceType: "property",
          referenceId: String(apartment.id),
        });

        await createNotification({
          userId: "admin",
          type: "admin_property_submitted",
          title: "عقار جديد بانتظار المراجعة والاعتماد",
          body: `قام المالك ${dbUser.fullName} بتقديم عقار جديد للمراجعة والاعتماد: "${apartment.title}"`,
          referenceType: "property",
          referenceId: String(apartment.id),
        });
      }
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on apartment creation:", notifErr);
    }

    return res.status(201).json({
      ...apartment,
      photos: savedPhotos,
    });
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update apartment
router.patch("/:id", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  const { photos, ...bodyData } = req.body;
  const result = insertApartmentSchema.partial().safeParse(bodyData);
  if (!result.success) {
    return res.status(400).json({ error: "Bad Request", issues: result.error.format() });
  }

  try {
    // Check ownership or admin
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
      with: { photos: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && dbUser.role !== "super_admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden: You do not own this apartment" });
    }

    // 1. Google Maps link resolution and coordinates extraction
    let lat = bodyData.lat !== undefined ? Number(bodyData.lat) : undefined;
    let lng = bodyData.lng !== undefined ? Number(bodyData.lng) : undefined;
    const mapLink = bodyData.mapLink || bodyData.googleMapsLink || bodyData.locationLink;

    if (mapLink) {
      const resolved = await resolveAndExtractMapLink(mapLink);
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      } else {
        return res.status(400).json({
          error: "Bad Request",
          message: "لم نتمكن من استخراج الإحداثيات من رابط الخريطة المدخل. يرجى توفير رابط Google Maps صالح أو إدخال الإحداثيات مباشرة.",
        });
      }
    }

    // 2. Coordinates Range Validation
    if (lat !== undefined || lng !== undefined) {
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          error: "Bad Request",
          message: "يجب تحديد خط العرض وخط الطول معاً لتحديد الموقع.",
        });
      }

      if (!isValidCoordinate(lat, lng)) {
        return res.status(400).json({
          error: "Bad Request",
          message: `الإحداثيات المدخلة غير صالحة (خط العرض: ${lat}، خط الطول: ${lng}). يجب أن يكون خط العرض بين -90 و 90، وخط الطول بين -180 و 180.`,
        });
      }
    }

    const updatePayload: any = {
      ...result.data,
      updatedAt: new Date(),
    };

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin";

    // Always persist lat/lng if provided
    if (lat !== undefined && lng !== undefined) {
      updatePayload.lat = lat;
      updatePayload.lng = lng;
      if (existing.lat !== lat || existing.lng !== lng || req.body.nearbyAmenities === undefined) {
        try {
          invalidateOverpassCache(existing.lat, existing.lng);
          invalidateOverpassCache(lat, lng);
          const freshAmenities = await fetchNearbyAmenitiesFromOverpass(lat, lng);
          if (req.body.nearbyAmenities === undefined) {
            updatePayload.nearbyAmenities = freshAmenities;
          }
        } catch (overpassErr) {
          console.error("Failed to fetch amenities from Overpass during patch:", overpassErr);
        }
      }
    }

    // Handle nearbyAmenities and Mkany Admin ratings
    if (req.body.nearbyAmenities !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({
          error: "Forbidden",
          message: "تعديل تقييمات وخدمات المنطقة المحيطة متاح فقط لمشرفي إدارة مكاني",
        });
      }

      const ratingValidation = validateAmenitiesRatings(req.body.nearbyAmenities);
      if (!ratingValidation.valid) {
        return res.status(400).json({
          error: "Bad Request",
          message: ratingValidation.error || "التقييم المدخل غير صالح. تقييم مكاني يجب أن يكون بين 0 و 5 وبمضاعفات النصف نجمة (0, 0.5, 1, 1.5, ... 5).",
        });
      }

      updatePayload.nearbyAmenities = ratingValidation.sanitized;

      // Persist any rated entries into serviceRatings linked by real OSM identity (osmType, osmId)
      for (const entry of ratingValidation.entriesToPersist) {
        try {
          await persistServiceRating(entry, dbUser.id);
        } catch (persistErr) {
          req.log.warn({ persistErr, entry }, "Failed to persist service rating to DB table");
        }
      }
    }

    // If non-admin user (Owner), prevent self-verification and self-approval
    if (!isAdmin) {
      if ("verified" in req.body) {
        return res.status(403).json({
          error: "Forbidden",
          message: "لا يمكن للمالك تعديل حالة توثيق العقار - التوثيق والاعتماد حصري لإدارة مكاني",
        });
      }

      delete updatePayload.ownerId; // Owners cannot transfer ownership

      // Critical Status Transition Security for Owners:
      // Rejection and approval are strictly administrative powers.
      if (req.body.status && req.body.status !== existing.status) {
        // 1. Owner can never set status to "مرفوض" (admin rejection only)
        if (req.body.status === "مرفوض") {
          return res.status(403).json({
            error: "Forbidden",
            message: "رفض العقار قرار حصري لإدارة مكاني",
          });
        }

        // 2. Owner cannot change status if currently "قيد المراجعة" or "مرفوض"
        // Specifically blocks "قيد المراجعة" -> "متاح" and "قيد المراجعة" -> "مرفوض"
        if (existing.status === "قيد المراجعة" || existing.status === "مرفوض") {
          return res.status(403).json({
            error: "Forbidden",
            message: "لا يمكن للمالك تغيير حالة العقار عندما يكون قيد المراجعة أو مرفوضاً - القرار حصري لإدارة مكاني",
          });
        }

        // 3. For approved properties, owner can only toggle between "متاح" and "مشغول"
        if (req.body.status !== "متاح" && req.body.status !== "مشغول") {
          return res.status(403).json({
            error: "Forbidden",
            message: "يمكن للمالك فقط تبديل الحالة بين متاح ومشغول للوحدات المعتمدة",
          });
        }
      }
    }

    if (Array.isArray(photos)) {
      updatePayload.images = photos;
      // Replace or update apartmentPhotos if a new list is explicitly provided
      await db.delete(apartmentPhotos).where(eq(apartmentPhotos.apartmentId, apartmentId));
      if (photos.length > 0) {
        await db.insert(apartmentPhotos).values(
          photos.map((url: string, index: number) => ({
            apartmentId,
            url,
            displayOrder: index,
            isCover: index === 0,
          }))
        );
      }
    }

    const [updated] = await db
      .update(apartments)
      .set(updatePayload)
      .where(eq(apartments.id, apartmentId))
      .returning();

    const currentPhotos = await db.query.apartmentPhotos.findMany({
      where: eq(apartmentPhotos.apartmentId, apartmentId),
      orderBy: [asc(apartmentPhotos.displayOrder)],
    });

    return res.json({
      ...updated,
      photos: currentPhotos,
    });
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete apartment
router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  try {
    // Check ownership or admin
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && dbUser.role !== "super_admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden: You do not own this apartment" });
    }

    await db.delete(apartments).where(eq(apartments.id, apartmentId));
    return res.status(204).send();
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/apartments/:id/approve - Strict Admin-only endpoint to approve property
router.post("/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const [updated] = await db
      .update(apartments)
      .set({
        status: "متاح",
        verified: true,
        updatedAt: new Date(),
      })
      .where(eq(apartments.id, apartmentId))
      .returning();

    try {
      if (existing.ownerId) {
        await createNotification({
          userId: existing.ownerId,
          type: "owner_property_approved",
          title: "تم اعتماد عقارك ونشره",
          body: `تمت مراجعة عقارك "${existing.title}" واعتماده بنجاح من قبل الإدارة، وهو الآن متاح للطلاب.`,
          referenceType: "property",
          referenceId: String(apartmentId),
        });
      }
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on apartment approval:", notifErr);
    }

    req.log.info({ adminId: req.dbUser!.id, apartmentId }, "Admin approved apartment for listing");
    return res.json(updated);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/apartments/:id/reject - Strict Admin-only endpoint to reject property
router.post("/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const [updated] = await db
      .update(apartments)
      .set({
        status: "مرفوض",
        verified: false,
        updatedAt: new Date(),
      })
      .where(eq(apartments.id, apartmentId))
      .returning();

    try {
      if (existing.ownerId) {
        await createNotification({
          userId: existing.ownerId,
          type: "owner_property_rejected",
          title: "تم رفض طلب إضافة العقار",
          body: `تم رفض طلب إضافة عقارك "${existing.title}" بعد مراجعته من قبل الإدارة.`,
          referenceType: "property",
          referenceId: String(apartmentId),
        });
      }
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on apartment rejection:", notifErr);
    }

    req.log.info({ adminId: req.dbUser!.id, apartmentId }, "Admin rejected apartment");
    return res.json(updated);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Photo management endpoints
router.post("/:id/photos", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }
  const { url, isCover, displayOrder } = req.body;

  if (typeof url !== "string" || !url.startsWith("http")) {
    return res.status(400).json({ error: "Bad Request: invalid url" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && dbUser.role !== "super_admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [photo] = await db
      .insert(apartmentPhotos)
      .values({
        apartmentId,
        url,
        isCover: Boolean(isCover),
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      })
      .returning();

    // Update images array in apartment
    const allPhotos = await db.query.apartmentPhotos.findMany({
      where: eq(apartmentPhotos.apartmentId, apartmentId),
      orderBy: [asc(apartmentPhotos.displayOrder)],
    });
    await db
      .update(apartments)
      .set({ images: allPhotos.map((p: any) => p.url) })
      .where(eq(apartments.id, apartmentId));

    return res.status(201).json(photo);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id/photos/:photoId", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  const photoId = req.params.photoId as string;
  if (Number.isNaN(apartmentId) || !photoId) {
    return res.status(400).json({ error: "Invalid apartment ID or photo ID" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && dbUser.role !== "super_admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(apartmentPhotos).where(
      and(
        eq(apartmentPhotos.id, photoId),
        eq(apartmentPhotos.apartmentId, apartmentId)
      )
    );

    // Update images array in apartment
    const remainingPhotos = await db.query.apartmentPhotos.findMany({
      where: eq(apartmentPhotos.apartmentId, apartmentId),
      orderBy: [asc(apartmentPhotos.displayOrder)],
    });
    await db
      .update(apartments)
      .set({ images: remainingPhotos.map((p: any) => p.url) })
      .where(eq(apartments.id, apartmentId));

    return res.status(204).send();
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
