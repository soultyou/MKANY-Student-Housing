import { StudentUser } from "@/components/auth/clerk-auth";
import { getUsersApi, updateUserVerificationApi, updateUserRoleApi, deleteUserApi } from "./api-client";

export type RegisteredUser = StudentUser;
export const USERS_CHANGE_EVENT = "mkany_users_updated";

// In-memory cache synced with real backend PostgreSQL users table
let cachedUsers: RegisteredUser[] = [];

export function getAllRegisteredUsers(): RegisteredUser[] {
  return cachedUsers;
}

export async function fetchUsersFromApi(): Promise<RegisteredUser[]> {
  try {
    const data = await getUsersApi();
    if (Array.isArray(data)) {
      cachedUsers = data.map((u: any) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phoneNumber: u.phoneNumber || "01000000000",
        nationalId: u.nationalId || "00000000000000",
        university: u.university || "جامعة كفر الشيخ",
        city: u.city || "كفر الشيخ",
        unitsCount: u.unitsCount || "1-3 وحدات",
        propertyTypes: u.propertyTypes || "شقق سكنية",
        role: u.role as "student" | "owner" | "admin" | "super_admin",
        isVerified: Boolean(u.isVerified),
        avatarUrl: u.avatarUrl,
      }));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(USERS_CHANGE_EVENT));
      }
    }
    return cachedUsers;
  } catch (err) {
    console.warn("Failed to fetch users from PostgreSQL API:", err);
    return cachedUsers;
  }
}

export async function toggleUserVerificationAsync(userId: string): Promise<RegisteredUser | null> {
  try {
    const target = cachedUsers.find((u) => u.id === userId);
    const newStatus = target ? !target.isVerified : true;
    const updated = await updateUserVerificationApi(userId, newStatus);
    
    // Update local cache
    cachedUsers = cachedUsers.map((u) => 
      u.id === userId ? { ...u, isVerified: Boolean(updated.isVerified) } : u
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(USERS_CHANGE_EVENT));
    }

    const updatedUser = cachedUsers.find((u) => u.id === userId) || null;
    return updatedUser;
  } catch (err) {
    console.error("Failed to toggle user verification via API:", err);
    return null;
  }
}

export function toggleUserVerification(userId: string): RegisteredUser | null {
  // Fire async update in background and return optimistic updated user
  const target = cachedUsers.find((u) => u.id === userId);
  if (target) {
    const optimisticUser = { ...target, isVerified: !target.isVerified };
    toggleUserVerificationAsync(userId);
    return optimisticUser;
  }
  return null;
}

export async function deleteUserFromDbAsync(userId: string): Promise<boolean> {
  try {
    await deleteUserApi(userId);
    cachedUsers = cachedUsers.filter((u) => u.id !== userId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(USERS_CHANGE_EVENT));
    }
    return true;
  } catch (err) {
    console.error("Failed to delete user via API:", err);
    return false;
  }
}

export async function updateUserRoleAsync(userId: string, newRole: "student" | "owner" | "admin" | "super_admin"): Promise<RegisteredUser | null> {
  try {
    const updated = await updateUserRoleApi(userId, newRole);
    cachedUsers = cachedUsers.map((u) => 
      u.id === userId || (u as any).clerkUserId === userId ? { ...u, role: updated.role } : u
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(USERS_CHANGE_EVENT));
    }

    return cachedUsers.find((u) => u.id === userId || (u as any).clerkUserId === userId) || null;
  } catch (err: any) {
    console.error("Failed to update user role via API:", err);
    throw err;
  }
}

export function deleteUserFromDb(userId: string): boolean {
  deleteUserFromDbAsync(userId);
  cachedUsers = cachedUsers.filter((u) => u.id !== userId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(USERS_CHANGE_EVENT));
  }
  return true;
}

// Keep favorites in localStorage since it's just non-sensitive preferences
export function getUserFavoritesKey(userId?: string): string {
  if (!userId || userId.trim() === "") return "mkany_favorites_guest_v1";
  return `mkany_favorites_${userId.trim()}_v1`;
}

export function getUserFavorites(userId?: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getUserFavoritesKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function toggleUserFavorite(userId: string | undefined, propertyId: number): number[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getUserFavoritesKey(userId);
    const current = getUserFavorites(userId);
    const updated = current.includes(propertyId)
      ? current.filter((id) => id !== propertyId)
      : [...current, propertyId];
    
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

export type { StudentUser } from "@/components/auth/clerk-auth";
