/**
 * عميل إشعارات مكاني (Mkany Notifications API Client for Admin)
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

/**
 * جلب إشعارات المشرف من الخادم
 */
export async function getNotificationsApi(): Promise<Notification[]> {
  try {
    const res = await fetch("/api/notifications");
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return [];
  }
}

/**
 * تعليم كافة الإشعارات كمقروءة
 */
export async function markAllReadApi(): Promise<boolean> {
  try {
    const res = await fetch("/api/notifications/read-all", {
      method: "PATCH",
    });
    return res.ok;
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
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to mark notification ${id} as read:`, err);
    return false;
  }
}
