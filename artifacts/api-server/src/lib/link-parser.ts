/**
 * Google Maps and OpenStreetMap Link Parser
 * Extracts latitude and longitude from location URLs.
 */

export interface ParsedCoords {
  lat: number;
  lng: number;
}

/**
 * Attempts to extract coordinates from standard Map URLs (Google Maps, OpenStreetMap)
 */
export function extractCoordsFromUrlString(url: string): ParsedCoords | null {
  try {
    // 1. Google Maps @lat,lng format (e.g. maps/@31.1128,30.9392,17z)
    const atRegex = /@([0-9.-]+),([0-9.-]+)/;
    const atMatch = url.match(atRegex);
    if (atMatch && atMatch[1] && atMatch[2]) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    // 2. Query param q=lat,lng or query=lat,lng format
    const qRegex = /[?&](q|query|mlat|lat)=([0-9.-]+)[,&](mlon|lon|lng)?=([0-9.-]+)/;
    const qMatch = url.match(qRegex);
    if (qMatch && qMatch[2] && qMatch[4]) {
      const lat = parseFloat(qMatch[2]);
      const lng = parseFloat(qMatch[4]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    // Another format: ?q=lat,lng
    const qCommaRegex = /[?&]q=([0-9.-]+),([0-9.-]+)/;
    const qCommaMatch = url.match(qCommaRegex);
    if (qCommaMatch && qCommaMatch[1] && qCommaMatch[2]) {
      const lat = parseFloat(qCommaMatch[1]);
      const lng = parseFloat(qCommaMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    // 3. Google Maps place/lat,lng format
    const placeRegex = /place\/([0-9.-]+),([0-9.-]+)/;
    const placeMatch = url.match(placeRegex);
    if (placeMatch && placeMatch[1] && placeMatch[2]) {
      const lat = parseFloat(placeMatch[1]);
      const lng = parseFloat(placeMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    // 4. Just comma separated numbers in URL or text
    const textCoordsRegex = /([0-9.-]+)\s*,\s*([0-9.-]+)/;
    const textCoordsMatch = url.match(textCoordsRegex);
    if (textCoordsMatch && textCoordsMatch[1] && textCoordsMatch[2]) {
      const lat = parseFloat(textCoordsMatch[1]);
      const lng = parseFloat(textCoordsMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }
  } catch (err) {
    console.error("Error in extractCoordsFromUrlString:", err);
  }
  return null;
}

/**
 * Resolves a shortened URL (like maps.app.goo.gl) to its final location URL
 * and extracts the coordinates.
 */
export async function resolveAndExtractMapLink(url: string): Promise<ParsedCoords | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // If it's a simple coordinate string, parse it directly first
  const simpleCoords = extractCoordsFromUrlString(trimmed);
  if (simpleCoords) {
    return simpleCoords;
  }

  // If it is a shortened Google Maps URL, follow redirect
  if (trimmed.includes("maps.app.goo.gl") || trimmed.includes("goo.gl/maps")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

      const res = await fetch(trimmed, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const finalUrl = res.url;
      if (finalUrl && finalUrl !== trimmed) {
        return extractCoordsFromUrlString(finalUrl);
      }
    } catch (err) {
      console.error("Failed to resolve map link redirect:", err);
    }
  }

  return null;
}

/**
 * Checks if coordinates are valid numbers and inside the correct boundaries
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
