import { Router } from "express";
import { db, inspections, apartments, apartmentPhotos } from "@workspace/db";
import { eq, desc, and, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { requireAuth, requireAdmin, requireOwner } from "../middlewares/auth";
import { createNotification } from "../lib/notifications-helper";
import { resolveAndExtractMapLink, isValidCoordinate } from "../lib/link-parser";
import { fetchNearbyAmenitiesFromOverpass } from "../lib/overpass";
import { validateAmenitiesRatings, persistServiceRating } from "../lib/rating-validator";

const router = Router();

// GET /api/inspections - List inspections with role-aware data isolation (Requires Auth)
router.get("/", requireAuth, async (req, res) => {
  try {
    const dbUser = req.dbUser!;
    const auth = getAuth(req);
    const { ownerId, status } = req.query;
    const conditions = [];

    // Admins and Super Admins can see all inspections or filter by ownerId
    if (dbUser.role === "admin" || dbUser.role === "super_admin") {
      if (ownerId && typeof ownerId === "string") {
        conditions.push(eq(inspections.ownerId, ownerId));
      }
    } else {
      // Non-admins (owners, students) can ONLY see their own inspections
      const myIds: string[] = [dbUser.id];
      if (dbUser.clerkUserId && !myIds.includes(dbUser.clerkUserId)) {
        myIds.push(dbUser.clerkUserId);
      }
      if (auth.userId && !myIds.includes(auth.userId)) {
        myIds.push(auth.userId);
      }

      conditions.push(
        or(...myIds.map((idVal) => eq(inspections.ownerId, idVal)))
      );
    }

    if (status && typeof status === "string") {
      conditions.push(eq(inspections.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.query.inspections.findMany({
      where: whereClause,
      orderBy: [desc(inspections.createdAt)],
    });

    return res.json(list);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to fetch inspections" });
  }
});

// GET /api/inspections/:id - Get single inspection with strict privacy check (Requires Auth)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dbUser = req.dbUser!;
    const auth = getAuth(req);

    const item = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!item) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    // Role-based privacy: Admin or Super Admin can view all; Non-admin can only view their own
    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin";
    const isOwner =
      item.ownerId === dbUser.id ||
      item.ownerId === auth.userId ||
      (dbUser.clerkUserId !== null && dbUser.clerkUserId !== undefined && item.ownerId === dbUser.clerkUserId);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Cannot access inspection belonging to another user",
      });
    }

    return res.json(item);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/inspections - Create inspection request with verified identity (Requires Owner/Admin Auth)
router.post("/", requireAuth, requireOwner, async (req, res) => {
  try {
    const dbUser = req.dbUser!;
    const auth = getAuth(req);
    const body = req.body;

    // Derive owner identity strictly from authenticated user context
    const ownerId = dbUser.id || auth.userId!;
    const ownerName = dbUser.fullName || body.ownerName || "مالك عقار";
    const ownerEmail = dbUser.email || body.ownerEmail || `${ownerId}@mkany.eg`;
    const ownerPhone = dbUser.phoneNumber || body.ownerPhone || "01000000000";
    const university = body.university || dbUser.university || "جامعة كفر الشيخ";

    const id = body.id || `insp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const [created] = await db
      .insert(inspections)
      .values({
        id,
        ownerId,
        ownerName,
        ownerPhone,
        ownerEmail,
        title: body.title || "طلب معاينة سكن طلابي",
        address: body.address || "",
        city: body.city || "كفر الشيخ",
        university,
        roomType: body.roomType || "شقة مشتركة",
        pricePerMonth: Number(body.pricePerMonth) || 800,
        areaSqm: Number(body.areaSqm) || 100,
        bedrooms: Number(body.bedrooms) || 2,
        bathrooms: Number(body.bathrooms) || 1,
        floor: body.floor || "الدور الأول",
        furnishing: body.furnishing || "مفروشة بالكامل",
        initialPhotos: Array.isArray(body.initialPhotos) ? body.initialPhotos : [],
        notes: body.notes || "",
        preferredInspectionDate: body.preferredInspectionDate || "",
        status: "pending",
        lat: body.lat ? Number(body.lat) : undefined,
        lng: body.lng ? Number(body.lng) : undefined,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    try {
      await createNotification({
        userId: ownerId,
        type: "owner_inspection_created",
        title: "تم استلام طلب المعاينة",
        body: `تم استلام طلب المعاينة لعقارك بنجاح وجاري تنسيق الموعد وتحديث الحالة.`,
        referenceType: "inspection",
        referenceId: created.id,
      });

      await createNotification({
        userId: "admin",
        type: "admin_new_inspection",
        title: "طلب معاينة جديد",
        body: `قام المالك ${ownerName} بتقديم طلب معاينة جديد لسكن طلابي في ${created.city}.`,
        referenceType: "inspection",
        referenceId: created.id,
      });
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on inspection creation:", notifErr);
    }

    return res.status(201).json(created);
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to create inspection request", message: error?.message });
  }
});

// PATCH /api/inspections/:id - Update inspection with strict role authorization (Requires Auth)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = req.body;
    const dbUser = req.dbUser!;
    const auth = getAuth(req);

    const existing = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin";
    const isOwner =
      dbUser.id === existing.ownerId ||
      auth.userId === existing.ownerId ||
      (dbUser.clerkUserId !== null && dbUser.clerkUserId !== undefined && dbUser.clerkUserId === existing.ownerId);

    // Only the verified owner or an admin can modify
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to modify this inspection record.",
      });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (isAdmin) {
      // Admin fields (scheduling, inspector assignment, scoring, approving/rejecting, 360 tour, 3D model, final images, full details)
      if (body.status !== undefined) updateData.status = body.status;
      if (body.scheduledDate !== undefined) updateData.scheduledDate = body.scheduledDate;
      if (body.inspectorName !== undefined) updateData.inspectorName = body.inspectorName;
      if (body.inspectorReport !== undefined) updateData.inspectorReport = body.inspectorReport;
      if (body.livabilityScore !== undefined) updateData.livabilityScore = Number(body.livabilityScore);
      if (body.rejectionReason !== undefined) updateData.rejectionReason = body.rejectionReason;
      if (body.video360Url !== undefined) updateData.video360Url = body.video360Url;
      if (body.model3dUrl !== undefined) updateData.model3dUrl = body.model3dUrl;
      if (body.finalImages !== undefined) updateData.finalImages = body.finalImages;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.preferredInspectionDate !== undefined) updateData.preferredInspectionDate = body.preferredInspectionDate;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.university !== undefined) updateData.university = body.university;
      if (body.roomType !== undefined) updateData.roomType = body.roomType;
      if (body.pricePerMonth !== undefined) updateData.pricePerMonth = Number(body.pricePerMonth);
      if (body.areaSqm !== undefined) updateData.areaSqm = Number(body.areaSqm);
      if (body.bedrooms !== undefined) updateData.bedrooms = Number(body.bedrooms);
      if (body.bathrooms !== undefined) updateData.bathrooms = Number(body.bathrooms);
      if (body.floor !== undefined) updateData.floor = body.floor;
      if (body.furnishing !== undefined) updateData.furnishing = body.furnishing;
      if (body.lat !== undefined) updateData.lat = Number(body.lat);
      if (body.lng !== undefined) updateData.lng = Number(body.lng);
    } else if (isOwner) {
      // Owner-restricted updates (can only update pre-inspection details, notes, preferred date, initial photos)
      if (body.title !== undefined) updateData.title = body.title;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.preferredInspectionDate !== undefined) updateData.preferredInspectionDate = body.preferredInspectionDate;
      if (body.initialPhotos !== undefined) updateData.initialPhotos = body.initialPhotos;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.university !== undefined) updateData.university = body.university;
      if (body.roomType !== undefined) updateData.roomType = body.roomType;
      if (body.pricePerMonth !== undefined) updateData.pricePerMonth = Number(body.pricePerMonth);
      if (body.areaSqm !== undefined) updateData.areaSqm = Number(body.areaSqm);
      if (body.bedrooms !== undefined) updateData.bedrooms = Number(body.bedrooms);
      if (body.bathrooms !== undefined) updateData.bathrooms = Number(body.bathrooms);
      if (body.floor !== undefined) updateData.floor = body.floor;
      if (body.furnishing !== undefined) updateData.furnishing = body.furnishing;
      if (body.lat !== undefined) updateData.lat = Number(body.lat);
      if (body.lng !== undefined) updateData.lng = Number(body.lng);
    }

    const [updated] = await db
      .update(inspections)
      .set(updateData)
      .where(eq(inspections.id, id))
      .returning();

    try {
      if (isAdmin && body.status !== undefined && body.status !== existing.status) {
        if (body.status === "scheduled") {
          await createNotification({
            userId: existing.ownerId,
            type: "inspection_scheduled",
            title: "تم تحديد موعد المعاينة",
            body: `تم تحديد موعد معاينة عقارك بتاريخ: ${body.scheduledDate || updated.scheduledDate || ''} مع المفتش ${body.inspectorName || updated.inspectorName || ''}`,
            referenceType: "inspection",
            referenceId: id,
          });
        } else if (body.status === "completed") {
          await createNotification({
            userId: existing.ownerId,
            type: "inspection_completed",
            title: "اكتملت معاينة العقار",
            body: "اكتملت المعاينة والتقرير الخاص بعقارك بنجاح من قبل فريق مكاني وجاري إعداد التقرير النهائي.",
            referenceType: "inspection",
            referenceId: id,
          });
        } else if (body.status === "rejected") {
          await createNotification({
            userId: existing.ownerId,
            type: "inspection_rejected",
            title: "مرفوض طلب المعاينة",
            body: `تم رفض طلب المعاينة بسبب: ${body.rejectionReason || 'شروط غير مستوفاة'}`,
            referenceType: "inspection",
            referenceId: id,
          });
        }
      }
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on inspection patch:", notifErr);
    }

    // Prepare WhatsApp URL if appointment date or inspector was set/updated
    let whatsappUrl: string | null = null;
    let whatsappMessage: string | null = null;

    if (isAdmin && (body.scheduledDate || body.inspectorName || updated.scheduledDate)) {
      const inspectorName = body.inspectorName || updated.inspectorName || "ممثل فريق معاينات مكاني";
      const scheduledDate = body.scheduledDate || updated.scheduledDate || "في أقرب وقت ممكن";
      const propertyTitle = body.title || updated.title || "العقار المذكور";
      const ownerPhone = updated.ownerPhone || "01000000000";

      whatsappMessage = `السلام عليكم،
تم تأكيد موعد معاينة العقار من خلال Mkany.

اسم الشخص الذي سيقوم بالمعاينة: ${inspectorName}
تاريخ ووقت المعاينة: ${scheduledDate}
العقار: ${propertyTitle}

شكرًا لتعاونكم مع Mkany.`;

      const cleanPhone = ownerPhone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("0") ? `2${cleanPhone}` : cleanPhone.startsWith("20") ? cleanPhone : `20${cleanPhone}`;
      whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`;
    }

    return res.json({
      ...updated,
      whatsappUrl,
      whatsappMessage,
    });
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to update inspection", message: error?.message });
  }
});

// POST /api/inspections/:id/publish - Strict Admin-only endpoint to approve inspection & publish property
router.post("/:id/publish", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = req.body;

    const inspection = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!inspection) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    const now = new Date();

    // 1. Determine images to persist
    const imagesToPersist: string[] =
      body.finalImages && Array.isArray(body.finalImages) && body.finalImages.length > 0
        ? body.finalImages
        : body.images && Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : inspection.finalImages && (inspection.finalImages as string[]).length > 0
        ? (inspection.finalImages as string[])
        : (inspection.initialPhotos as string[]) || [];

    // Extract property fields with body overrides
    const title = body.title || inspection.title;
    const description = body.description || inspection.notes || `سكن طلابي موثق ومفحوص ميدانياً في ${body.address || inspection.address}`;
    const pricePerMonth = body.pricePerMonth ? Number(body.pricePerMonth) : body.price ? Number(body.price) : inspection.pricePerMonth;
    const city = body.city || inspection.city;
    const address = body.address || inspection.address;
    const university = body.university || inspection.university;
    const roomType = body.roomType || inspection.roomType;
    const areaSqm = body.areaSqm ? Number(body.areaSqm) : inspection.areaSqm;
    const bedrooms = body.bedrooms ? Number(body.bedrooms) : inspection.bedrooms;
    const bathrooms = body.bathrooms ? Number(body.bathrooms) : inspection.bathrooms;
    const floor = body.floor || inspection.floor;
    const furnishing = body.furnishing || inspection.furnishing;
    const availableFrom = body.availableFrom || "متاح الآن فوراً";
    const video360Url = body.video360Url || inspection.video360Url || null;
    const model3dUrl = body.model3dUrl || inspection.model3dUrl || null;
    const livabilityScore = body.livabilityScore ? Number(body.livabilityScore) : inspection.livabilityScore || 95;
    // 1. Google Maps link resolution and coordinates extraction
    let lat = body.lat !== undefined ? Number(body.lat) : (inspection.lat !== null ? Number(inspection.lat) : undefined);
    let lng = body.lng !== undefined ? Number(body.lng) : (inspection.lng !== null ? Number(inspection.lng) : undefined);
    const mapLink = body.mapLink || body.googleMapsLink || body.locationLink;

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

    // 3. Real OSM Overpass Fetching & Admin Ratings
    let nearbyAmenities = null;

    // If Admin provided amenities/ratings in request body, validate them strictly
    let adminProvidedAmenities: any = null;
    if (body.nearbyAmenities) {
      const ratingValidation = validateAmenitiesRatings(body.nearbyAmenities);
      if (!ratingValidation.valid) {
        return res.status(400).json({
          error: "Bad Request",
          message: ratingValidation.error || "التقييم المدخل غير صالح. تقييم مكاني يجب أن يكون بين 0 و 5 وبمضاعفات النصف نجمة (0, 0.5, 1, 1.5, ... 5).",
        });
      }
      adminProvidedAmenities = ratingValidation.sanitized;

      // Persist any rated entries into serviceRatings linked by real OSM identity
      for (const entry of ratingValidation.entriesToPersist) {
        try {
          await persistServiceRating(entry, req.dbUser?.id);
        } catch (persistErr) {
          req.log.warn({ persistErr, entry }, "Failed to persist service rating to DB table");
        }
      }
    }

    if (lat !== undefined && lng !== undefined) {
      try {
        const fetchedAmenities = await fetchNearbyAmenitiesFromOverpass(lat, lng);
        if (adminProvidedAmenities) {
          // Merge admin provided ratings onto fetched places
          const categories = ["hospital", "pharmacy", "transportation", "supermarket", "cafeRestaurant", "universityGate"];
          for (const cat of categories) {
            if (adminProvidedAmenities[cat]?.rating !== undefined) {
              if ((fetchedAmenities as any)[cat]) {
                (fetchedAmenities as any)[cat].rating = adminProvidedAmenities[cat].rating;
              }
            }
            const adminList = adminProvidedAmenities[`${cat}List`];
            const fetchedList = (fetchedAmenities as any)[`${cat}List`];
            if (Array.isArray(adminList) && Array.isArray(fetchedList)) {
              for (const adminItem of adminList) {
                if (adminItem.rating !== undefined && (adminItem.osmId || adminItem.name)) {
                  const match = fetchedList.find(
                    (f: any) =>
                      (adminItem.osmId && f.osmId === adminItem.osmId) ||
                      (adminItem.name && f.name === adminItem.name)
                  );
                  if (match) {
                    match.rating = adminItem.rating;
                  }
                }
              }
            }
          }
          nearbyAmenities = fetchedAmenities;
        } else {
          nearbyAmenities = fetchedAmenities;
        }
      } catch (overpassErr) {
        console.error("Failed to fetch amenities from Overpass during publish:", overpassErr);
        nearbyAmenities = adminProvidedAmenities;
      }
    } else if (adminProvidedAmenities) {
      nearbyAmenities = adminProvidedAmenities;
    }

    let apartment: any = null;

    // Check if property is already published and needs update
    if (inspection.publishedPropertyId) {
      const apartmentIdNum = parseInt(inspection.publishedPropertyId, 10);
      if (!isNaN(apartmentIdNum)) {
        const existingApt = await db.query.apartments.findFirst({
          where: eq(apartments.id, apartmentIdNum),
        });
        if (existingApt) {
          const [updatedApt] = await db
            .update(apartments)
            .set({
              title,
              description,
              pricePerMonth,
              city,
              address,
              university,
              roomType,
              areaSqm,
              bedrooms,
              bathrooms,
              floor,
              furnishing,
              availableFrom,
              images: imagesToPersist,
              video360Url,
              model3dUrl,
              verified: true,
              premium: true,
              livabilityScore,
              status: "متاح",
              lat,
              lng,
              nearbyAmenities,
              updatedAt: now,
            })
            .where(eq(apartments.id, existingApt.id))
            .returning();
          apartment = updatedApt;
        }
      }
    }

    if (!apartment) {
      // Create new Apartment record in PostgreSQL
      const [newApt] = await db
        .insert(apartments)
        .values({
          ownerId: inspection.ownerId,
          title,
          description,
          pricePerMonth,
          city,
          address,
          university,
          roomType,
          areaSqm,
          bedrooms,
          bathrooms,
          floor,
          furnishing,
          availableFrom,
          currentRoommates: 0,
          images: imagesToPersist,
          video360Url,
          model3dUrl,
          verified: true,
          premium: true,
          livabilityScore,
          status: "متاح",
          lat,
          lng,
          nearbyAmenities,
          inspectionId: inspection.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      apartment = newApt;
    }

    // Persist Apartment Photos in apartment_photos table
    if (imagesToPersist.length > 0 && apartment) {
      await db.delete(apartmentPhotos).where(eq(apartmentPhotos.apartmentId, apartment.id));
      const photoValues = imagesToPersist.map((url, idx) => ({
        apartmentId: apartment.id,
        url,
        displayOrder: idx,
        isCover: idx === 0,
        createdAt: now,
        updatedAt: now,
      }));
      await db.insert(apartmentPhotos).values(photoValues);
    }

    // Update Inspection Status to Approved
    const [updatedInspection] = await db
      .update(inspections)
      .set({
        status: "approved",
        publishedPropertyId: apartment.id.toString(),
        video360Url,
        model3dUrl,
        finalImages: imagesToPersist,
        livabilityScore,
        inspectorReport: body.inspectorReport || inspection.inspectorReport,
        updatedAt: now,
      })
      .where(eq(inspections.id, id))
      .returning();

    try {
      await createNotification({
        userId: inspection.ownerId,
        type: "inspection_approved_published",
        title: "تم اعتماد ونشر عقارك",
        body: `تهانينا! تم فحص عقارك "${title}" واعتماده ونشره بنجاح للطلاب على منصة مكاني كعقار موثق ومميز.`,
        referenceType: "property",
        referenceId: apartment.id.toString(),
      });
    } catch (notifErr) {
      console.error("Failed to dispatch publish notification to owner:", notifErr);
    }

    // Prepare WhatsApp Message for Owner
    const inspectorName = body.inspectorName || inspection.inspectorName || "فريق فحص مكاني";
    const scheduledDate = body.scheduledDate || inspection.scheduledDate || "تم الفحص والاعتماد";
    const propertyTitle = title;
    const ownerPhone = inspection.ownerPhone || "01000000000";

    const whatsappMessage = `السلام عليكم،
تم تأكيد معاينة ونشر العقار عبر منصة مكاني (Mkany).

اسم المعاين: ${inspectorName}
تاريخ المعاينة: ${scheduledDate}
العقار: ${propertyTitle}
الحالة: متاح وموثق للطلاب رسمياً

شكرًا لتعاونكم مع Mkany.`;

    const cleanPhone = ownerPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `2${cleanPhone}` : cleanPhone.startsWith("20") ? cleanPhone : `20${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    return res.status(200).json({
      property: apartment,
      inspection: updatedInspection,
      whatsappUrl,
      whatsappMessage,
    });
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to publish property", message: error?.message });
  }
});

export default router;
