/**
 * مخزن مفضلة الطلاب (Student Favorites Store)
 * متصل بقاعدة بيانات PostgreSQL عبر /api/favorites
 */

export interface StudentFavorite {
  id: string;
  studentId: string;
  propertyId: number;
  createdAt: string;
  property: {
    id: number;
    title: string;
    address: string;
    city: string;
    university: string;
    pricePerMonth: number;
    roomType: string;
    areaSqm?: number;
    bedrooms?: number;
    bathrooms?: number;
    floor?: string;
    furnishing?: string;
    availableFrom?: string;
    images: string[];
    video360Url?: string | null;
    verified: boolean;
    premium: boolean;
    livabilityScore: number;
    status: string;
    photos?: Array<{ id: number; url: string; isCover: boolean }>;
  };
}

export interface FavoritesResponse {
  favorites: StudentFavorite[];
  propertyIds: number[];
}

import { apiFetch } from "./api-client";

/**
 * جلب قائمة العقارات المفضلة للطالب من PostgreSQL
 */
export async function getStudentFavoritesApi(): Promise<FavoritesResponse> {
  try {
    const data: any = await apiFetch("/api/favorites");
    return {
      favorites: Array.isArray(data?.favorites) ? data.favorites : [],
      propertyIds: Array.isArray(data?.propertyIds) ? data.propertyIds : [],
    };
  } catch (err: any) {
    if (err?.status !== 401 && !err?.message?.includes("Failed to fetch")) {
      console.error("Failed to fetch student favorites:", err);
    }
    return { favorites: [], propertyIds: [] };
  }
}

/**
 * إضافة عقار إلى مفضلة الطالب في PostgreSQL
 */
export async function addFavoriteApi(propertyId: number): Promise<{ success: boolean; message?: string }> {
  try {
    await apiFetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to add favorite:", err);
    return { success: false, message: err?.message || "فشل في إضافة العقار للمفضلة" };
  }
}

/**
 * حذف عقار من مفضلة الطالب في PostgreSQL
 */
export async function removeFavoriteApi(propertyId: number): Promise<{ success: boolean; message?: string }> {
  try {
    await apiFetch(`/api/favorites/${propertyId}`, {
      method: "DELETE",
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to remove favorite:", err);
    return { success: false, message: err?.message || "فشل في إزالة العقار من المفضلة" };
  }
}
