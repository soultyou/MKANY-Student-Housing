/**
 * منظومة الخرائط وحساب المسافات المجانية 100%
 * معتمدة بالكامل على OpenStreetMap و Leaflet.js
 * بدون أي تكلفة أو API keys مدفوعة
 */

export interface LatLngCoord {
  lat: number;
  lng: number;
}

export interface RouteCalculationResult {
  distanceMeters: number;
  distanceFormatted: string;
  walkMinutes: number;
  walkTimeFormatted: string;
  transitMinutes: number;
  transitTimeFormatted: string;
  coordinates: [number, number][]; // [lat, lng] array for Leaflet polyline
  isRealStreetRoute: boolean;
}

/**
 * حساب المسافة الجغرافية الدقيقة بين نقطتين بالأمتار (Haversine Formula)
 */
export function calcHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // نصف قطر الأرض بالمتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * تنسيق المسافة باللغة العربية بطريقة أنيقة للطلاب
 */
export function formatDistanceArabic(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} م`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km.replace(".", "٫")} كم`;
}

/**
 * وقت المشي: غير منفذ في هذه المرحلة. يتم عرض النص المعتمد لعدم توليد أوقات مشي تقديرية وهمية.
 */
export function formatWalkingTimeArabic(_meters?: number): string {
  return "بيانات مسار المشي غير متاحة";
}

/**
 * حساب وقت المواصلات / السرفيس (بناءً على سرعة ميكروباص وسط المدينة مع التوقف = 300 متر/دقيقة)
 */
export function formatTransitTimeArabic(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 300));
  if (minutes === 1) return "دقيقة واحدة بالسرفيس";
  if (minutes === 2) return "دقيقتان بالسرفيس";
  if (minutes >= 3 && minutes <= 10) return `${minutes} دقائق بالمواصلات`;
  return `${minutes} دقيقة بالمواصلات`;
}

/**
 * الحصول على مسار السير الفعلي للشوارع عبر محرك OSRM المفتوح المصدر (Open Source Routing Machine)
 * يستعلم من خادم المنصة الموثق لضمان الأمان والخصوصية وحماية الهوية الجغرافية للأفراد.
 */
export async function getRouteBetween(
  start: LatLngCoord,
  end: LatLngCoord,
  mode: "walking" | "driving"
): Promise<RouteCalculationResult> {
  const straightDistance = calcHaversineDistanceMeters(
    start.lat,
    start.lng,
    end.lat,
    end.lng
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `/api/geo/route?originLat=${start.lat}&originLng=${start.lng}&destinationLat=${end.lat}&destinationLng=${end.lng}&mode=${mode}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          distanceMeters: data.distanceMeters,
          distanceFormatted: data.distanceFormatted,
          walkMinutes: Math.max(1, Math.round(data.durationSeconds / 60)),
          walkTimeFormatted: data.durationFormatted,
          transitMinutes: Math.max(1, Math.round(data.durationSeconds / 60)),
          transitTimeFormatted: data.durationFormatted,
          coordinates: data.coordinates || [],
          isRealStreetRoute: true,
        };
      }
    }
  } catch (err) {
    console.error(`Route fetching failed for mode ${mode}:`, err);
  }

  // Fallback safe: Return a structured error response with geographic distance as fallback without inventing travel times
  return {
    distanceMeters: straightDistance,
    distanceFormatted: formatDistanceArabic(straightDistance),
    walkMinutes: 0,
    walkTimeFormatted: mode === "walking" ? "تعذر حساب مسار المشي" : "تعذر حساب مسار السيارة",
    transitMinutes: 0,
    transitTimeFormatted: mode === "walking" ? "تعذر حساب مسار المشي" : "تعذر حساب مسار السيارة",
    coordinates: [[start.lat, start.lng], [end.lat, end.lng]],
    isRealStreetRoute: false,
  };
}

export async function getWalkingRouteBetween(
  start: LatLngCoord,
  end: LatLngCoord
): Promise<RouteCalculationResult> {
  return getRouteBetween(start, end, "walking");
}

/**
 * إحداثيات المدن والجامعات المصرية الافتراضية
 */
export function getCityDefaultCoordinates(city: string = "", university: string = ""): LatLngCoord {
  const c = city.toLowerCase();
  const u = university.toLowerCase();

  if (c.includes("كفر الشيخ") || u.includes("كفر الشيخ")) {
    return { lat: 31.1128, lng: 30.9392 }; // قرب جامعة كفر الشيخ وكلية الزراعة
  }
  if (c.includes("منصورة") || u.includes("منصورة")) {
    return { lat: 31.0425, lng: 31.365 }; // قرب جامعة المنصورة وبوابة الجلاء
  }
  if (c.includes("طنطا") || u.includes("طنطا")) {
    return { lat: 30.7865, lng: 31.0004 }; // مجمع الكليات الطبي بطنطا
  }
  if (c.includes("إسكندرية") || u.includes("إسكندرية")) {
    return { lat: 31.2001, lng: 29.9187 }; // جامعة الإسكندرية الشاطبي
  }
  if (c.includes("قاهرة") || u.includes("قاهرة")) {
    return { lat: 30.0263, lng: 31.2114 }; // جامعة القاهرة بين السرايات
  }
  if (c.includes("عين شمس") || u.includes("عين شمس")) {
    return { lat: 30.0771, lng: 31.2854 }; // جامعة عين شمس العباسية
  }
  if (c.includes("حلوان") || u.includes("حلوان")) {
    return { lat: 29.8667, lng: 31.3167 }; // جامعة حلوان
  }
  if (c.includes("أسيوط") || u.includes("أسيوط")) {
    return { lat: 27.1866, lng: 31.1718 }; // جامعة أسيوط
  }
  if (c.includes("زقازيق") || u.includes("زقازيق")) {
    return { lat: 30.5877, lng: 31.5035 }; // جامعة الزقازيق
  }
  if (c.includes("منوفية") || u.includes("منوفية")) {
    return { lat: 30.5594, lng: 31.0089 }; // جامعة المنوفية شبين الكوم
  }

  // الافتراضي: كفر الشيخ
  return { lat: 31.1128, lng: 30.9392 };
}

/**
 * توليد إحداثيات واقعية للخدمات الست المحيطة بالعقار عند عدم توفر إحداثيات محددة مسبقاً
 */
export function getDerivedAmenityCoords(
  baseLat: number,
  baseLng: number,
  key: string
): LatLngCoord {
  // إزاحات جغرافية دقيقة تعكس مسافات بين 50 متر إلى 800 متر
  switch (key) {
    case "pharmacy":
      // ~100-150 متر
      return { lat: baseLat - 0.0011, lng: baseLng + 0.0009 };
    case "cafeRestaurant":
      // ~80-120 متر
      return { lat: baseLat + 0.0007, lng: baseLng - 0.0008 };
    case "transportation":
      // ~180-220 متر
      return { lat: baseLat + 0.0016, lng: baseLng + 0.0014 };
    case "supermarket":
      // ~250-320 متر
      return { lat: baseLat - 0.0022, lng: baseLng - 0.0018 };
    case "hospital":
      // ~450-550 متر
      return { lat: baseLat + 0.0036, lng: baseLng - 0.0032 };
    case "universityGate":
    default:
      // ~600-800 متر
      return { lat: baseLat + 0.0052, lng: baseLng + 0.0048 };
  }
}

/**
 * توليد رابط التوجيه المباشر في OpenStreetMap
 */
export function getOpenStreetMapDirectionsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: "university" | "hospital" | "pharmacy" | "transportation" | "supermarket" | "cafe";
  categoryLabel: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  distanceFormatted: string;
  address?: string;
}

export async function searchNearbyRealPlaces(
  lat: number,
  lng: number,
  city: string = "كفر الشيخ",
  signal?: AbortSignal
): Promise<{
  universities: NearbyPlace[];
  hospitals: NearbyPlace[];
  pharmacies: NearbyPlace[];
  transportation: NearbyPlace[];
  supermarkets: NearbyPlace[];
  cafes: NearbyPlace[];
  all: NearbyPlace[];
}> {
  const cleanCity = city.trim() || "كفر الشيخ";
  const primaryQueries = [
    { q: `جامعة ${cleanCity}`, category: "university" as const, label: "جامعة" },
    { q: `جامعة خاصة ${cleanCity}`, category: "university" as const, label: "جامعة خاصة" },
    { q: `جامعة أهلية ${cleanCity}`, category: "university" as const, label: "جامعة أهلية" },
    { q: `معهد عالي ${cleanCity}`, category: "university" as const, label: "معهد عالي" },
    { q: `أكاديمية ${cleanCity}`, category: "university" as const, label: "أكاديمية" },
    { q: `معهد ${cleanCity}`, category: "university" as const, label: "معهد" },
    { q: `مستشفى ${cleanCity}`, category: "hospital" as const, label: "مستشفى" },
    { q: `صيدلية ${cleanCity}`, category: "pharmacy" as const, label: "صيدلية" },
    { q: `محطة مواصلات ${cleanCity}`, category: "transportation" as const, label: "محطة مواصلات" },
    { q: `سوبر ماركت ${cleanCity}`, category: "supermarket" as const, label: "سوبر ماركت" },
    { q: `مطعم كافيه ${cleanCity}`, category: "cafe" as const, label: "مطعم / كافيه" },
  ];

  const fallbackQueries = [
    { q: "جامعة", category: "university" as const, label: "جامعة" },
    { q: "معهد", category: "university" as const, label: "معهد" },
    { q: "أكاديمية", category: "university" as const, label: "أكاديمية" },
    { q: "مستشفى", category: "hospital" as const, label: "مستشفى" },
    { q: "صيدلية", category: "pharmacy" as const, label: "صيدلية" },
    { q: "موقف سيارات محطة", category: "transportation" as const, label: "محطة مواصلات" },
    { q: "سوبر ماركت", category: "supermarket" as const, label: "سوبر ماركت" },
    { q: "مطعم", category: "cafe" as const, label: "مطعم / كافيه" },
  ];

  const allPlaces: NearbyPlace[] = [];

  const executeQueries = async (queryList: typeof primaryQueries) => {
    if (signal?.aborted) return;
    await Promise.all(
      queryList.map(async (item) => {
        if (signal?.aborted) return;
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            item.q
          )}&countrycodes=eg&limit=8&accept-language=ar`;
          const res = await fetch(url, { signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              data.forEach((place: any, index: number) => {
                const pLat = parseFloat(place.lat);
                const pLng = parseFloat(place.lon);
                if (!isNaN(pLat) && !isNaN(pLng)) {
                  const dist = calcHaversineDistanceMeters(lat, lng, pLat, pLng);
                  const addressStr = place.display_name || "";

                  allPlaces.push({
                    id: `${item.category}-${place.place_id || index}-${pLat}-${pLng}`,
                    name: addressStr ? addressStr.split(",")[0] : `${item.label} (${index + 1})`,
                    category: item.category,
                    categoryLabel: item.label,
                    lat: pLat,
                    lng: pLng,
                    distanceMeters: dist,
                    distanceFormatted: formatDistanceArabic(dist),
                    address: addressStr,
                  });
                }
              });
            }
          }
        } catch (err: any) {
          if (err?.name === "AbortError") throw err;
        }
      })
    );
  };

  try {
    await executeQueries(primaryQueries);
    if (!signal?.aborted && !allPlaces.some(p => p.category === "university")) {
      await executeQueries(fallbackQueries);
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
  }

  // Remove duplicates by coordinates proximity
  const uniquePlaces: NearbyPlace[] = [];
  allPlaces.forEach((p) => {
    const exists = uniquePlaces.some(
      (up) => up.category === p.category && Math.abs(up.lat - p.lat) < 0.0005 && Math.abs(up.lng - p.lng) < 0.0005
    );
    if (!exists) {
      uniquePlaces.push(p);
    }
  });

  // Filter universities & institutes: sort ascending by distance. Cross-city filter.
  const universities = uniquePlaces
    .filter((p) => {
      if (p.category !== "university") return false;
      const addr = (p.address || "").toLowerCase();
      const nameLower = (p.name || "").toLowerCase();
      
      if (cleanCity.includes("طنطا")) {
        if ((addr.includes("القاهرة") || addr.includes("الإسكندرية") || addr.includes("المنصورة") || addr.includes("كفر الشيخ")) && !addr.includes("طنطا") && !nameLower.includes("طنطا")) {
          return false;
        }
      }
      if (cleanCity.includes("كفر الشيخ")) {
        if ((addr.includes("القاهرة") || addr.includes("طنطا") || addr.includes("المنصورة")) && !addr.includes("كفر الشيخ") && !nameLower.includes("كفر الشيخ")) {
          return false;
        }
      }
      if (cleanCity.includes("المنصورة")) {
        if ((addr.includes("القاهرة") || addr.includes("طنطا") || addr.includes("كفر الشيخ")) && !addr.includes("المنصورة") && !nameLower.includes("المنصورة")) {
          return false;
        }
      }
      if (cleanCity.includes("الزقازيق")) {
        if ((addr.includes("القاهرة") || addr.includes("طنطا")) && !addr.includes("الزقازيق") && !nameLower.includes("الزقازيق")) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Normal services rule: STRICTLY <= 1000 meters (1 km)
  const filterNormalService = (cat: string) => {
    return uniquePlaces
      .filter((p) => p.category === cat && p.distanceMeters <= 1000)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  };

  const hospitals = filterNormalService("hospital");
  const pharmacies = filterNormalService("pharmacy");
  const transportation = filterNormalService("transportation");
  const supermarkets = filterNormalService("supermarket");
  const cafes = filterNormalService("cafe");

  const validAll = [
    ...universities,
    ...hospitals,
    ...pharmacies,
    ...transportation,
    ...supermarkets,
    ...cafes,
  ];

  return {
    universities,
    hospitals,
    pharmacies,
    transportation,
    supermarkets,
    cafes,
    all: validAll,
  };
}
