import { Router, type Request, type Response } from "express";
import { isValidCoordinate } from "../lib/link-parser";
import { fetchNearbyAmenitiesFromOverpass } from "../lib/overpass";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { db, serviceRatings, apartments } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  isValidMkanyRating,
  parseMkanyRating,
  formatMkanyRating,
  persistServiceRating,
} from "../lib/rating-validator";

const router = Router();

async function syncRatingToApartmentRecords(osmType: string, osmId: string, newRating: string | undefined) {
  try {
    const allApartments = await db.query.apartments.findMany({
      columns: { id: true, nearbyAmenities: true },
    });

    for (const apt of allApartments) {
      if (!apt.nearbyAmenities) continue;
      const amenities = JSON.parse(JSON.stringify(apt.nearbyAmenities));
      let changed = false;

      const categories = ["hospital", "pharmacy", "transportation", "supermarket", "cafeRestaurant", "universityGate"];
      for (const cat of categories) {
        const primary = amenities[cat];
        if (primary && primary.osmType === osmType && String(primary.osmId) === String(osmId)) {
          primary.rating = newRating;
          changed = true;
        }

        const list = amenities[`${cat}List`];
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.osmType === osmType && String(item.osmId) === String(osmId)) {
              item.rating = newRating;
              changed = true;
            }
          }
        }
      }

      if (changed) {
        await db
          .update(apartments)
          .set({ nearbyAmenities: amenities, updatedAt: new Date() })
          .where(eq(apartments.id, apt.id));
      }
    }
  } catch (err) {
    console.warn("Could not sync rating to apartments:", err);
  }
}

// Arabic translations for formatting distance and duration
function formatDistanceArabic(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} م`;
  } else {
    const km = meters / 1000;
    return `${km.toFixed(1).replace(".", "٫")} كم`;
  }
}

function formatDurationArabic(seconds: number, mode: "walking" | "driving"): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes === 1) {
    return mode === "walking" ? "دقيقة واحدة مشياً" : "دقيقة واحدة بالسيارة";
  }
  if (totalMinutes === 2) {
    return mode === "walking" ? "دقيقتان مشياً" : "دقيقتان بالسيارة";
  }
  
  const suffix = mode === "walking" ? "مشياً" : "بالسيارة";
  
  if (totalMinutes <= 10) {
    return `${totalMinutes} دقائق ${suffix}`;
  }
  
  if (totalMinutes < 60) {
    return `${totalMinutes} دقيقة ${suffix}`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  
  let hoursText = "";
  if (hours === 1) {
    hoursText = "ساعة";
  } else if (hours === 2) {
    hoursText = "ساعتان";
  } else if (hours <= 10) {
    hoursText = `${hours} ساعات`;
  } else {
    hoursText = `${hours} ساعة`;
  }
  
  if (remainingMinutes === 0) {
    return `${hoursText} ${suffix}`;
  }
  
  let minutesText = "";
  if (remainingMinutes === 1) {
    minutesText = "دقيقة واحدة";
  } else if (remainingMinutes === 2) {
    minutesText = "دقيقتان";
  } else if (remainingMinutes <= 10) {
    minutesText = `${remainingMinutes} دقائق`;
  } else {
    minutesText = `${remainingMinutes} دقيقة`;
  }
  
  return `${hoursText} و ${minutesText} ${suffix}`;
}

router.get("/route", async (req: Request, res: Response) => {
  try {
    const { originLat, originLng, destinationLat, destinationLng, mode } = req.query;

    const oLat = Number(originLat);
    const oLng = Number(originLng);
    const dLat = Number(destinationLat);
    const dLng = Number(destinationLng);

    if (!isValidCoordinate(oLat, oLng) || !isValidCoordinate(dLat, dLng)) {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "الإحداثيات المدخلة غير صالحة.",
      });
      return;
    }

    if (mode !== "walking" && mode !== "driving") {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "نمط الحركة غير صالح. يجب أن يكون walking أو driving.",
      });
      return;
    }

    // Determine profile
    // OSRM walking profiles can be 'foot' or 'walking' depending on the public demo server instance setup.
    // Let's support both: we try 'foot' first, and if that fails, try 'walking'.
    const profiles = mode === "walking" ? ["foot", "walking"] : ["driving"];
    
    let routeData: any = null;
    let fetchError: any = null;

    for (const profile of profiles) {
      const url = `https://router.project-osrm.org/route/v1/${profile}/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as any;
          if (data.code === "Ok" && data.routes && data.routes.length > 0) {
            routeData = data.routes[0];
            break;
          }
        }
      } catch (err) {
        fetchError = err;
      }
    }

    if (!routeData) {
      res.status(502).json({
        success: false,
        error: "Routing Failed",
        message: mode === "walking" ? "تعذر حساب مسار المشي" : "تعذر حساب مسار السيارة",
        details: fetchError?.message || "OSRM did not return any route"
      });
      return;
    }

    const distanceMeters = Math.round(routeData.distance);
    const durationSeconds = Math.round(routeData.duration);

    // Map geometry coordinates [lng, lat] to [lat, lng] for frontend leafet mapping
    let coordinates: [number, number][] = [];
    if (routeData.geometry && Array.isArray(routeData.geometry.coordinates)) {
      coordinates = routeData.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    }

    res.json({
      success: true,
      distanceMeters,
      durationSeconds,
      distanceFormatted: formatDistanceArabic(distanceMeters),
      durationFormatted: formatDurationArabic(durationSeconds, mode),
      coordinates,
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "حدث خطأ أثناء حساب المسار الجغرافي.",
      details: error?.message
    });
  }
});

router.get("/amenities", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const propertyId = Number(req.query.propertyId || req.query.apartmentId);

    if (!isValidCoordinate(lat, lng)) {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "الإحداثيات المدخلة غير صالحة.",
      });
      return;
    }

    const amenities = await fetchNearbyAmenitiesFromOverpass(lat, lng);

    if (propertyId && !isNaN(propertyId)) {
      try {
        await db
          .update(apartments)
          .set({ nearbyAmenities: amenities, updatedAt: new Date() })
          .where(eq(apartments.id, propertyId));
      } catch (cacheErr) {
        console.warn("Could not cache nearbyAmenities into apartment:", cacheErr);
      }
    }

    res.json({
      success: true,
      amenities,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "حدث خطأ أثناء جلب الخدمات الجغرافية.",
      details: error?.message,
    });
  }
});

// GET /api/geo/ratings - Public read access for approved Mkany Admin service ratings
router.get("/ratings", async (req: Request, res: Response) => {
  try {
    const { osmType, osmId, category } = req.query;

    if (osmType && osmId) {
      const found = await db.query.serviceRatings.findFirst({
        where: and(
          eq(serviceRatings.osmType, String(osmType)),
          eq(serviceRatings.osmId, String(osmId))
        ),
      });
      res.json({ success: true, rating: found || null });
      return;
    }

    if (category) {
      const list = await db.query.serviceRatings.findMany({
        where: eq(serviceRatings.category, String(category)),
        orderBy: [desc(serviceRatings.updatedAt)],
      });
      res.json({ success: true, ratings: list });
      return;
    }

    const all = await db.query.serviceRatings.findMany({
      orderBy: [desc(serviceRatings.updatedAt)],
      limit: 500,
    });
    res.json({ success: true, ratings: all });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Internal Server Error", message: error?.message });
  }
});

// POST /api/geo/ratings - Strict Admin-only endpoint to assign or update Mkany service ratings
router.post("/ratings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { osmType, osmId, rating, category, placeName, notes } = req.body;

    if (!osmType || !osmId) {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "يجب تحديد هوية المكان من OpenStreetMap (osmType و osmId) لربط التقييم بالمكان الفعلي.",
      });
      return;
    }

    const cleanOsmType = String(osmType).trim().toLowerCase();
    const cleanOsmId = String(osmId).trim();

    // If rating is explicitly empty or null, admin wants to clear/delete the rating
    if (rating === null || rating === undefined || rating === "") {
      await db
        .delete(serviceRatings)
        .where(
          and(
            eq(serviceRatings.osmType, cleanOsmType),
            eq(serviceRatings.osmId, cleanOsmId)
          )
        );
      await syncRatingToApartmentRecords(cleanOsmType, cleanOsmId, undefined);
      res.json({
        success: true,
        message: "تم إلغاء التقييم بنجاح وإعادة المكان لحالة (لم يتم تقييمه بعد).",
      });
      return;
    }

    // Server-side rating validation: 0–5 in 0.5 increments
    if (!isValidMkanyRating(rating)) {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "التقييم المدخل غير صالح. تقييم مكاني يجب أن يكون بين 0 و 5 وبمضاعفات النصف نجمة (0, 0.5, 1, 1.5, ... 5).",
      });
      return;
    }

    const parsedRating = parseMkanyRating(rating);
    if (parsedRating === null) {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "تعذر قراءة التقييم. القيم المقبولة هي من 0 إلى 5 بمضاعفات 0.5.",
      });
      return;
    }

    const saved = await persistServiceRating(
      {
        osmType: cleanOsmType,
        osmId: cleanOsmId,
        rating: parsedRating,
        category: category ? String(category) : undefined,
        placeName: placeName ? String(placeName) : undefined,
      },
      req.dbUser?.id
    );

    const formatted = formatMkanyRating(parsedRating);
    await syncRatingToApartmentRecords(cleanOsmType, cleanOsmId, formatted);

    res.json({
      success: true,
      message: `تم اعتماد تقييم مكاني (${formatted} / 5) للمكان بنجاح.`,
      rating: saved,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "حدث خطأ أثناء حفظ تقييم الخدمة.",
      details: error?.message,
    });
  }
});

// DELETE /api/geo/ratings - Strict Admin-only endpoint to remove an Admin rating
router.delete("/ratings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const osmType = String(req.query.osmType || req.body.osmType || "").trim().toLowerCase();
    const osmId = String(req.query.osmId || req.body.osmId || "").trim();

    if (!osmType || !osmId) {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "يجب تحديد osmType و osmId لحذف التقييم.",
      });
      return;
    }

    await db
      .delete(serviceRatings)
      .where(
        and(
          eq(serviceRatings.osmType, osmType),
          eq(serviceRatings.osmId, osmId)
        )
      );

    await syncRatingToApartmentRecords(osmType, osmId, undefined);

    res.json({
      success: true,
      message: "تم حذف التقييم وإعادة المكان لحالة غير مقيم بنجاح.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "حدث خطأ أثناء حذف التقييم.",
      details: error?.message,
    });
  }
});

export default router;
