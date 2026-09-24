/**
 * عميل ومخزن API لدعم مكاني الفني وتذاكر المحادثات
 * يضمن تواصل الطلاب والملاك حصراً مع فريق دعم مكاني (Admin Support)
 * مع الحظر التام لأي تواصل مباشر بين الطلاب والملاك
 */

export interface SupportMessageItem {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: "student" | "owner" | "admin" | "super_admin";
  body: string;
  createdAt: string;
  senderName: string;
  senderAvatar: string | null;
}

export interface SupportUserInfo {
  id: string;
  fullName: string;
  role: "student" | "owner" | "admin" | "super_admin";
  isVerified: boolean;
  avatarUrl?: string | null;
  email?: string;
  phoneNumber?: string;
}

export interface SupportConversationItem {
  id: string;
  conversationCode: string;
  userId: string;
  userRole: "student" | "owner";
  subject: string;
  category: "booking" | "inspection" | "verification" | "account" | "technical" | "other" | "payment" | "property";
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: SupportMessageItem | null;
  messages?: SupportMessageItem[];
  user?: SupportUserInfo;
}

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  booking: "حجز السكن",
  payment: "الدفع والتحويلات",
  property: "العقارات والوحدات",
  inspection: "معاينة 360° وتصوير",
  verification: "توثيق الحساب والهوية",
  account: "بيانات الحساب الشخصي",
  technical: "مشكلة تقنية في المنصة",
  other: "استفسار عام أو موضوع آخر",
};

export const SUPPORT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: {
    label: "مفتوحة",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  in_progress: {
    label: "قيد المعالجة",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  resolved: {
    label: "تم الحل",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
  closed: {
    label: "مغلقة",
    color: "bg-muted text-muted-foreground border-border",
  },
};

import { apiFetch } from "./api-client";

/**
 * جلب محادثات الدعم الخاصة بالمستخدم الحالي (طالب أو مالك)
 */
export async function getMySupportConversationsApi(): Promise<SupportConversationItem[]> {
  const data: any = await apiFetch("/api/support/conversations");
  return data.conversations || [];
}

/**
 * جلب تفاصيل محادثة دعم ورسائلها
 */
export async function getSupportConversationDetailsApi(id: string): Promise<SupportConversationItem> {
  const data: any = await apiFetch(`/api/support/conversations/${encodeURIComponent(id)}`);
  return data.conversation;
}

/**
 * إنشاء محادثة دعم وتذكرة جديدة موجهة لفريق منصة مكاني
 */
export async function createSupportConversationApi(params: {
  subject: string;
  category: string;
  message: string;
  priority?: "low" | "normal" | "high" | "urgent";
}): Promise<SupportConversationItem> {
  const data: any = await apiFetch("/api/support/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  return data.conversation;
}

/**
 * إرسال رسالة رد جديدة ضمن محادثة دعم قائمة
 */
export async function sendSupportMessageApi(
  conversationId: string,
  body: string
): Promise<SupportMessageItem> {
  const data: any = await apiFetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
  return data.messageData;
}

/**
 * جلب قائمة كافة محادثات وتذاكر الدعم للمشرفين الإداريين مع الفلاتر
 */
export async function getAdminSupportConversationsApi(filters?: {
  status?: string;
  category?: string;
  role?: string;
  search?: string;
}): Promise<{
  counts: { total: number; open: number; in_progress: number; resolved: number; closed: number };
  conversations: SupportConversationItem[];
}> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);
  if (filters?.category && filters.category !== "all") params.append("category", filters.category);
  if (filters?.role && filters.role !== "all") params.append("role", filters.role);
  if (filters?.search && filters.search.trim()) params.append("search", filters.search.trim());

  const queryString = params.toString() ? `?${params.toString()}` : "";
  return await apiFetch(`/api/support/admin/conversations${queryString}`);
}

/**
 * تحديث حالة أو أولوية محادثة الدعم من قبل المشرف
 */
export async function updateSupportStatusApi(
  conversationId: string,
  status: "open" | "in_progress" | "resolved" | "closed",
  priority?: "low" | "normal" | "high" | "urgent"
): Promise<SupportConversationItem> {
  const data: any = await apiFetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, priority }),
  });
  return data.conversation;
}
