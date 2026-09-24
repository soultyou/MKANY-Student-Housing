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
  coordinates: [number, number][];
  isRealStreetRoute: boolean;
}

export function calcHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
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

export function formatDistanceArabic(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} م`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km.replace(".", "٫")} كم`;
}

export function formatWalkingTimeArabic(_meters?: number): string {
  return "بيانات مسار المشي غير متاحة";
}

export function formatTransitTimeArabic(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 300));
  if (minutes === 1) return "دقيقة واحدة بالسرفيس";
  if (minutes === 2) return "دقيقتان بالسرفيس";
  if (minutes >= 3 && minutes <= 10) return `${minutes} دقائق بالمواصلات`;
  return `${minutes} دقيقة بالمواصلات`;
}

export async function getWalkingRouteBetween(
  start: LatLngCoord,
  end: LatLngCoord
): Promise<RouteCalculationResult> {
  const straightDistance = calcHaversineDistanceMeters(
    start.lat,
    start.lng,
    end.lat,
    end.lng
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://router.project-osrm.org/route/v1/walking/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeDist = Math.round(route.distance);
        const coords: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        return {
          distanceMeters: routeDist,
          distanceFormatted: formatDistanceArabic(routeDist),
          walkMinutes: Math.max(1, Math.round(route.duration / 60)),
          walkTimeFormatted: formatWalkingTimeArabic(routeDist),
          transitMinutes: Math.max(1, Math.round(routeDist / 300)),
          transitTimeFormatted: formatTransitTimeArabic(routeDist),
          coordinates: coords,
          isRealStreetRoute: true,
        };
      }
    }
  } catch {
  }

  const actualWalkingMeters = Math.round(straightDistance * 1.25);
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;

  const streetCorner1: [number, number] = [start.lat, midLng];
  const streetCorner2: [number, number] = [midLat, end.lng];

  const fallbackCoords: [number, number][] = [
    [start.lat, start.lng],
    streetCorner1,
    [midLat, midLng],
    streetCorner2,
    [end.lat, end.lng],
  ];

  return {
    distanceMeters: actualWalkingMeters,
    distanceFormatted: formatDistanceArabic(actualWalkingMeters),
    walkMinutes: Math.max(1, Math.round(actualWalkingMeters / 80)),
    walkTimeFormatted: formatWalkingTimeArabic(actualWalkingMeters),
    transitMinutes: Math.max(1, Math.round(actualWalkingMeters / 300)),
    transitTimeFormatted: formatTransitTimeArabic(actualWalkingMeters),
    coordinates: fallbackCoords,
    isRealStreetRoute: false,
  };
}

export function getCityDefaultCoordinates(city: string = "", university: string = ""): LatLngCoord {
  const c = city.toLowerCase();
  const u = university.toLowerCase();

  if (c.includes("كفر الشيخ") || u.includes("كفر الشيخ")) {
    return { lat: 31.1128, lng: 30.9392 };
  }
  if (c.includes("منصورة") || u.includes("منصورة")) {
    return { lat: 31.0425, lng: 31.365 };
  }
  if (c.includes("طنطا") || u.includes("طنطا")) {
    return { lat: 30.7865, lng: 31.0004 };
  }
  if (c.includes("إسكندرية") || u.includes("إسكندرية")) {
    return { lat: 31.2001, lng: 29.9187 };
  }
  if (c.includes("قاهرة") || u.includes("قاهرة")) {
    return { lat: 30.0263, lng: 31.2114 };
  }
  if (c.includes("عين شمس") || u.includes("عين شمس")) {
    return { lat: 30.0771, lng: 31.2854 };
  }
  if (c.includes("حلوان") || u.includes("حلوان")) {
    return { lat: 29.8667, lng: 31.3167 };
  }
  if (c.includes("أسيوط") || u.includes("أسيوط")) {
    return { lat: 27.1866, lng: 31.1718 };
  }
  if (c.includes("زقازيق") || u.includes("زقازيق")) {
    return { lat: 30.5877, lng: 31.5035 };
  }
  if (c.includes("منوفية") || u.includes("منوفية")) {
    return { lat: 30.5594, lng: 31.0089 };
  }

  return { lat: 31.1128, lng: 30.9392 };
}

export function getDerivedAmenityCoords(
  baseLat: number,
  baseLng: number,
  key: string
): LatLngCoord {
  switch (key) {
    case "pharmacy":
      return { lat: baseLat - 0.0011, lng: baseLng + 0.0009 };
    case "cafeRestaurant":
      return { lat: baseLat + 0.0007, lng: baseLng - 0.0008 };
    case "transportation":
      return { lat: baseLat + 0.0016, lng: baseLng + 0.00014 };
    case "supermarket":
      return { lat: baseLat - 0.0022, lng: baseLng - 0.0018 };
    case "hospital":
      return { lat: baseLat + 0.0036, lng: baseLng - 0.0032 };
    case "universityGate":
    default:
      return { lat: baseLat + 0.0052, lng: baseLng + 0.0048 };
  }
}

export function getOpenStreetMapDirectionsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`;
}
