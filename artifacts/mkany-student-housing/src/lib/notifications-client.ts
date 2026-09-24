/**
 * عميل إشعارات مكاني (Mkany Notifications API Client)
 * متصل بـ Express Backend API (/api/notifications)
 */

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

import { apiFetch } from "./api-client";

/**
 * جلب إشعارات المستخدم الحالي من الخادم
 */
export async function getNotificationsApi(): Promise<Notification[]> {
  try {
    const data: any = await apiFetch("/api/notifications");
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    if (err?.status !== 401 && !err?.message?.includes("Failed to fetch")) {
      console.error("Failed to fetch notifications:", err);
    }
    return [];
  }
}

/**
 * تعليم كافة الإشعارات كمقروءة
 */
export async function markAllReadApi(): Promise<boolean> {
  try {
    await apiFetch("/api/notifications/read-all", {
      method: "PATCH",
    });
    return true;
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
    return false;
  }
}

/**
 * تعليم إشعار واحد كمقروء
 */
export async function markReadApi(id: string): Promise<boolean> {
  try {
    await apiFetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
    return true;
  } catch (err) {
    console.error(`Failed to mark notification ${id} as read:`, err);
    return false;
  }
}
