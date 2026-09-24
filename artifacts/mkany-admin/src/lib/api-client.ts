import { customFetch, ApiError, type CustomFetchOptions } from "@workspace/api-client-react";

export class ApplicationApiError extends Error {
  status: number;
  statusText: string;
  data: any;

  constructor(status: number, statusText: string, data: any, message?: string) {
    super(message || data?.message || data?.error || `API Error: ${status} ${statusText}`);
    this.name = "ApplicationApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: CustomFetchOptions = {}
): Promise<T> {
  try {
    return await customFetch<T>(endpoint, options);
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw new ApplicationApiError(
        err.status,
        err.statusText,
        err.data,
        err.data?.message || err.data?.error || `Request failed with status ${err.status}`
      );
    }
    throw err;
  }
}

export async function getProfileApi() {
  return apiFetch("/api/profile", { method: "GET" });
}

export async function updateProfileApi(data: {
  fullName?: string;
  nationalId?: string;
  phoneNumber?: string;
  university?: string;
  avatarUrl?: string | null;
}) {
  return apiFetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function uploadSingleImageApi(file: File): Promise<{ url: string; path: string; filename: string }> {
  const formData = new FormData();
  formData.append("image", file);

  return apiFetch("/api/upload/single", {
    method: "POST",
    body: formData,
  });
}

export async function uploadMultipleImagesApi(files: File[]): Promise<{ urls: string[]; files: any[] }> {
  if (files.length === 0) return { urls: [], files: [] };
  
  const formData = new FormData();
  for (const f of files) {
    formData.append("images", f);
  }

  return apiFetch("/api/upload/multiple", {
    method: "POST",
    body: formData,
  });
}

export async function uploadPrivateVerificationApi(file: File): Promise<{ url: string; path: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/api/upload/private/verification", {
    method: "POST",
    body: formData,
  });
}

export async function getPrivateFileUrlApi(path: string): Promise<{ url: string; path: string }> {
  return apiFetch(`/api/upload/private/url?path=${encodeURIComponent(path)}`, {
    method: "GET",
  });
}

export async function getInspectionsApi() {
  return apiFetch("/api/inspections", { method: "GET" });
}

export async function getInspectionByIdApi(id: string) {
  return apiFetch(`/api/inspections/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function createInspectionApi(data: any) {
  return apiFetch("/api/inspections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateInspectionApi(id: string, data: any) {
  return apiFetch(`/api/inspections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function publishInspectionApi(id: string, data: any) {
  return apiFetch(`/api/inspections/${encodeURIComponent(id)}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getApartmentsApi(params?: Record<string, any>) {
  let url = "/api/apartments";
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return apiFetch(url, { method: "GET" });
}

export async function getMyApartmentsApi() {
  return apiFetch("/api/apartments/mine", { method: "GET" });
}

export async function getApartmentByIdApi(id: number) {
  return apiFetch(`/api/apartments/${id}`, { method: "GET" });
}

export async function createApartmentApi(data: any) {
  return apiFetch("/api/apartments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateApartmentApi(id: number, data: any) {
  return apiFetch(`/api/apartments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteApartmentApi(id: number) {
  return apiFetch(`/api/apartments/${id}`, {
    method: "DELETE",
  });
}

export async function addApartmentPhotoApi(apartmentId: number, data: { url: string; isCover?: boolean; displayOrder?: number }) {
  return apiFetch(`/api/apartments/${apartmentId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteApartmentPhotoApi(apartmentId: number, photoId: string) {
  return apiFetch(`/api/apartments/${apartmentId}/photos/${photoId}`, {
    method: "DELETE",
  });
}

export async function getUsersApi(params?: { role?: string; isVerified?: boolean; search?: string }) {
  const query = new URLSearchParams();
  if (params?.role) query.append("role", params.role);
  if (params?.isVerified !== undefined) query.append("isVerified", String(params.isVerified));
  if (params?.search) query.append("search", params.search);
  const qs = query.toString();
  return apiFetch(`/api/users${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getUserByIdApi(id: string) {
  return apiFetch(`/api/users/${id}`, { method: "GET" });
}

export async function updateUserVerificationApi(id: string, isVerified: boolean) {
  return apiFetch(`/api/users/${id}/verification`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isVerified }),
  });
}

export async function updateUserRoleApi(id: string, role: "student" | "owner" | "admin" | "super_admin") {
  return apiFetch(`/api/users/${id}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function deleteUserApi(id: string) {
  return apiFetch(`/api/users/${id}`, {
    method: "DELETE",
  });
}

export async function approveApartmentApi(apartmentId: number) {
  return apiFetch(`/api/apartments/${apartmentId}/approve`, {
    method: "POST",
  });
}

export async function rejectApartmentApi(apartmentId: number) {
  return apiFetch(`/api/apartments/${apartmentId}/reject`, {
    method: "POST",
  });
}

export async function getAdminAdminsApi() {
  return apiFetch("/api/admin/admins", { method: "GET" });
}

export async function createAdminAdminApi(data: {
  fullName: string;
  email: string;
  role: "admin" | "super_admin";
  phoneNumber?: string;
  nationalId?: string;
  university?: string;
}) {
  return apiFetch("/api/admin/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateAdminAdminApi(id: string, data: {
  role?: "admin" | "super_admin" | "student" | "owner";
  fullName?: string;
  isVerified?: boolean;
}) {
  return apiFetch(`/api/admin/admins/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminAdminApi(id: string) {
  return apiFetch(`/api/admin/admins/${id}`, {
    method: "DELETE",
  });
}

// ==========================================
// Service Ratings (Mkany Admin Source of Truth)
// ==========================================

export async function getServiceRatingsApi(params?: { osmType?: string; osmId?: string; category?: string }) {
  const q = new URLSearchParams();
  if (params?.osmType) q.set("osmType", params.osmType);
  if (params?.osmId) q.set("osmId", params.osmId);
  if (params?.category) q.set("category", params.category);
  const queryStr = q.toString();
  return apiFetch(`/api/geo/ratings${queryStr ? `?${queryStr}` : ""}`, { method: "GET" });
}

export async function setServiceRatingApi(data: {
  osmType: string;
  osmId: string;
  rating: number | null | string;
  category?: string;
  placeName?: string;
  notes?: string;
}) {
  return apiFetch("/api/geo/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteServiceRatingApi(osmType: string, osmId: string) {
  return apiFetch(`/api/geo/ratings?osmType=${encodeURIComponent(osmType)}&osmId=${encodeURIComponent(osmId)}`, {
    method: "DELETE",
  });
}

