import { db, serviceRatings } from "@workspace/db";
import { and, eq } from "drizzle-orm";

/**
 * Validator and sanitizer for Mkany Admin service ratings.
 * 
 * Rules:
 * - Allowed range: 0 to 5
 * - Half-star increments: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
 * - Empty string, null, or undefined are treated as unrated ("لم يتم تقييمه بعد")
 * - Any other values must be rejected server-side.
 */

export function isValidMkanyRating(val: any): boolean {
  if (val === null || val === undefined || val === "") {
    return true; // Valid as unrated
  }
  const num = typeof val === "number" ? val : parseFloat(String(val).trim());
  if (isNaN(num)) return false;
  if (num < 0 || num > 5) return false;
  // Multiple of 0.5 check
  return Math.abs(Math.round(num * 2) - num * 2) < 0.0001;
}

export function parseMkanyRating(val: any): number | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }
  const num = typeof val === "number" ? val : parseFloat(String(val).trim());
  if (isNaN(num) || num < 0 || num > 5 || Math.abs(Math.round(num * 2) - num * 2) >= 0.0001) {
    return null;
  }
  return Math.round(num * 10) / 10;
}

export function formatMkanyRating(val: number | null | undefined): string | undefined {
  if (val === null || val === undefined) return undefined;
  return Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1);
}

export interface AmenityRatingEntry {
  osmType: string;
  osmId: string;
  rating: number;
  category?: string;
  placeName?: string;
}

/**
 * Validates all ratings inside a NearbyAmenities payload.
 * Returns { valid: true, sanitized, entriesToPersist } or { valid: false, error: string }.
 */
export function validateAmenitiesRatings(amenities: any): {
  valid: boolean;
  error?: string;
  sanitized?: any;
  entriesToPersist: AmenityRatingEntry[];
} {
  if (!amenities || typeof amenities !== "object") {
    return { valid: true, sanitized: amenities, entriesToPersist: [] };
  }

  const sanitized = JSON.parse(JSON.stringify(amenities));
  const entriesToPersist: AmenityRatingEntry[] = [];
  const categories = ["hospital", "pharmacy", "transportation", "supermarket", "cafeRestaurant", "universityGate"];

  for (const cat of categories) {
    // Check primary object
    const primary = sanitized[cat];
    if (primary && typeof primary === "object") {
      if (primary.rating !== undefined && primary.rating !== null && primary.rating !== "") {
        if (!isValidMkanyRating(primary.rating)) {
          return {
            valid: false,
            error: `التقييم "${primary.rating}" لـ (${primary.name || cat}) غير صالح. يجب أن يكون التقييم بين 0 و 5 وبمضاعفات النصف نجمة (0, 0.5, 1, ..., 5).`,
            entriesToPersist: [],
          };
        }
        const numRating = parseMkanyRating(primary.rating);
        if (numRating !== null) {
          primary.rating = formatMkanyRating(numRating);
          if (primary.osmType && primary.osmId) {
            entriesToPersist.push({
              osmType: String(primary.osmType),
              osmId: String(primary.osmId),
              rating: numRating,
              category: cat,
              placeName: primary.name,
            });
          }
        } else {
          primary.rating = undefined;
        }
      } else {
        primary.rating = undefined;
      }
    }

    // Check list items
    const list = sanitized[`${cat}List`];
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && typeof item === "object") {
          if (item.rating !== undefined && item.rating !== null && item.rating !== "") {
            if (!isValidMkanyRating(item.rating)) {
              return {
                valid: false,
                error: `التقييم "${item.rating}" لـ (${item.name || cat}) غير صالح. يجب أن يكون التقييم بين 0 و 5 وبمضاعفات النصف نجمة (0, 0.5, 1, ..., 5).`,
                entriesToPersist: [],
              };
            }
            const numRating = parseMkanyRating(item.rating);
            if (numRating !== null) {
              item.rating = formatMkanyRating(numRating);
              if (item.osmType && item.osmId) {
                entriesToPersist.push({
                  osmType: String(item.osmType),
                  osmId: String(item.osmId),
                  rating: numRating,
                  category: cat,
                  placeName: item.name,
                });
              }
            } else {
              item.rating = undefined;
            }
          } else {
            item.rating = undefined;
          }
        }
      }
    }
  }

  return { valid: true, sanitized, entriesToPersist };
}

/**
 * Upserts a single service rating into the database.
 */
export async function persistServiceRating(entry: AmenityRatingEntry, adminId?: string) {
  if (!entry.osmType || !entry.osmId) return null;

  const existing = await db.query.serviceRatings.findFirst({
    where: and(
      eq(serviceRatings.osmType, entry.osmType),
      eq(serviceRatings.osmId, entry.osmId)
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(serviceRatings)
      .set({
        rating: entry.rating,
        placeName: entry.placeName || existing.placeName,
        category: entry.category || existing.category,
        adminId: adminId || existing.adminId,
        updatedAt: new Date(),
      })
      .where(eq(serviceRatings.id, existing.id))
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(serviceRatings)
      .values({
        osmType: entry.osmType,
        osmId: entry.osmId,
        placeName: entry.placeName || null,
        category: entry.category || null,
        rating: entry.rating,
        adminId: adminId || null,
      })
      .returning();
    return inserted;
  }
}

