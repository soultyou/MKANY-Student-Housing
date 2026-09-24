/**
 * مخزن حجوزات الطلاب وإيصالات الدفع (Student Bookings & Receipts Store)
 * متصل بقاعدة بيانات PostgreSQL عبر API السيرفر
 */

export interface StudentBooking {
  id: string;
  bookingCode: string;
  propertyId: number;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyImage?: string;
  propertyPrice?: number;
  propertyUniversity?: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  studentNationalId?: string;
  studentUniversity?: string;
  studentEmail?: string;
  paymentMethod: "vodafone_cash" | "instapay" | "bank_transfer";
  paymentAmount: number;
  receiptImageUrl?: string;
  senderPhone?: string;
  referenceNumber?: string;
  status: "pending_review" | "confirmed" | "rejected";
  adminNotes?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractDurationMonths?: number;
  depositAmount?: number;
  depositStatus?: "unpaid" | "partial" | "paid";
  depositPaidAt?: string;
  handoverStatus?: "not_started" | "scheduled" | "completed";
  handoverDate?: string;
  subscriptionStatus?: "unpaid" | "pending_review" | "approved" | "rejected";
  subscriptionAmount?: number;
  subscriptionReceiptUrl?: string;
  subscriptionApprovedAt?: string;
  subscriptionApprovedBy?: string;
  createdAt: string;
  updatedAt: string;
  property?: any;
  student?: any;
}

import { apiFetch } from "./api-client";

/**
 * جلب حجوزات الطالب الحالي من قاعدة البيانات
 */
export async function getStudentBookingsApi(): Promise<StudentBooking[]> {
  try {
    const data = await apiFetch<StudentBooking[]>("/api/bookings/my-bookings");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch student bookings:", err);
    return [];
  }
}

/**
 * إنشاء حجز جديد في قاعدة البيانات (PostgreSQL)
 */
export async function createBookingApi(data: {
  propertyId: number;
  paymentMethod: string;
  paymentAmount: number;
  receiptImageUrl?: string;
  senderPhone?: string;
  referenceNumber?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}): Promise<StudentBooking> {
  try {
    return await apiFetch<StudentBooking>("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err: any) {
    throw new Error(err.message || "فشل تسجيل الحجز في قاعدة البيانات");
  }
}

/**
 * جلب حجوزات المالك للوحدات التي يملكها فقط
 */
export async function getOwnerBookingsApi(): Promise<StudentBooking[]> {
  try {
    const data = await apiFetch<StudentBooking[]>("/api/bookings/owner-bookings");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch owner bookings:", err);
    return [];
  }
}

/**
 * جلب كافة الحجوزات للآدمن
 */
export async function getAdminBookingsApi(): Promise<StudentBooking[]> {
  try {
    const data = await apiFetch<StudentBooking[]>("/api/bookings/admin");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch admin bookings:", err);
    return [];
  }
}

/**
 * جلب حجز مفرد بالمعرف مع فحص الصلاحيات IDOR
 */
export async function getBookingByIdApi(bookingId: string): Promise<StudentBooking | null> {
  try {
    return await apiFetch<StudentBooking>(`/api/bookings/${bookingId}`);
  } catch (err) {
    console.error("Failed to fetch booking by id:", err);
    return null;
  }
}

/**
 * تحديث حالة الحجز بواسطة الآدمن
 */
export async function updateBookingStatusApi(
  bookingId: string,
  status: "pending_review" | "confirmed" | "rejected",
  adminNotes?: string,
  appointmentDate?: string,
  appointmentTime?: string
): Promise<StudentBooking | null> {
  try {
    return await apiFetch<StudentBooking>(`/api/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes, appointmentDate, appointmentTime }),
    });
  } catch (err) {
    console.error("Failed to update booking status:", err);
    return null;
  }
}


// Fallback synchronous methods kept for backward compatibility where needed
export function getAllBookings(): StudentBooking[] {
  return [];
}

export function getStudentBookings(_studentIdOrEmail?: string): StudentBooking[] {
  return [];
}

export function updateBookingStatus(_bookingId: string, _status: any, _notes?: string): StudentBooking | null {
  return null;
}

export function createBooking(_data: any): StudentBooking {
  throw new Error("Use createBookingApi for PostgreSQL persistence");
}

/**
 * تجهيز رابط الواتساب المباشر للإدارة: 01055332242
 */
export function buildWhatsAppBookingUrl(booking: StudentBooking): string {
  const adminWhatsAppNumber = "201055332242"; // رقم الواتساب المخصص للإدارة
  
  const title = booking.propertyTitle || booking.property?.title || "شقة سكنية طلابية";
  const address = booking.propertyAddress || booking.property?.address || "كفر الشيخ";
  const price = booking.propertyPrice || booking.property?.pricePerMonth || booking.paymentAmount;
  const sName = booking.studentName || booking.student?.fullName || "طالب محجوز";
  const sNationalId = booking.studentNationalId || booking.student?.nationalId || "14 رقم قومي";
  const sPhone = booking.studentPhone || booking.student?.phoneNumber || "";
  const sUni = booking.studentUniversity || booking.student?.university || "";

  const text = `السلام عليكم ورحمة الله،
لقد قمت بحجز وحدة سكنية عبر منصة مكاني (MKANY Student Housing) ورفعت إيصال الدفع اليدوي:

📋 *بيانات الحجز:*
- كود الحجز: ${booking.bookingCode}
- اسم الطالب: ${sName}
- الرقم القومي: ${sNationalId}
- رقم هاتف الطالب: ${sPhone}
- الجامعة: ${sUni}

🏠 *بيانات السكن:*
- الوحدة: ${title}
- العنوان: ${address}
- الإيجار: ${price} جنيه/شهر
- طريقة التحويل: ${booking.paymentMethod === "vodafone_cash" ? "فودافون كاش" : booking.paymentMethod === "instapay" ? "إنستاباي" : "تحويل بنكي"}
- رقم المحول منه: ${booking.senderPhone || sPhone}
- رقم المرجع: ${booking.referenceNumber || "مرفق بالإيصال"}

مرفق سكرين شات الإيصال عبر المنصة. أرجو المراجعة وتأكيد الحجز. شكراً جزيلاً!`;

  return `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * تجهيز رابط واتساب لتأكيد موعد المعاينة بواسطة الآدمن للطالب (خاص بالإدارة فقط)
 */
export function buildWhatsAppAdminConfirmationUrl(booking: StudentBooking): string {
  const studentPhone = booking.studentPhone || booking.student?.phoneNumber || "";
  const studentName = booking.studentName || booking.student?.fullName || "طالب مكاني";
  const propertyTitle = booking.propertyTitle || booking.property?.title || "العقار المذكور";
  const appDate = booking.appointmentDate || "غير محدد";
  const appTime = booking.appointmentTime || "غير محدد";

  const text = `مرحباً ${studentName}،
تم تأكيد موعد المعاينة في عقار ${propertyTitle}.
الموعد: ${appDate}
الوقت: ${appTime}
شكراً لاستخدام مكاني.`;

  // تنظيف هاتف الطالب وتشكيله بشكل آمن:
  const cleanPhone = studentPhone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? `2${cleanPhone}` : cleanPhone.startsWith("20") ? cleanPhone : `20${cleanPhone}`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

export interface RentPayment {
  id: string;
  bookingId: string;
  billingPeriod: string;
  amount: number;
  dueDate: string;
  status: "due" | "pending_review" | "paid" | "rejected" | "overdue";
  receiptImageUrl?: string;
  paidAt?: string;
  paymentSource?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * جلب كشف الدفعات الشهرية لحجز معين
 */
export async function getRentPaymentsApi(bookingId: string): Promise<RentPayment[]> {
  try {
    const data = await apiFetch<RentPayment[]>(`/api/bookings/${bookingId}/rent-payments`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch rent payments:", err);
    return [];
  }
}

/**
 * تحديث العقد والدفعة المالية (الوديعة وتواريخ العقد) بواسطة الآدمن
 */
export async function updateContractApi(
  bookingId: string,
  data: {
    contractStartDate: string;
    contractEndDate: string;
    depositAmount: number;
    depositStatus: "unpaid" | "partial" | "paid";
    handoverStatus?: "not_started" | "scheduled" | "completed";
    handoverDate?: string;
    subscriptionStatus?: "unpaid" | "pending_review" | "approved" | "rejected";
  }
): Promise<StudentBooking | null> {
  try {
    return await apiFetch<StudentBooking>(`/api/bookings/${bookingId}/contract`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Failed to update contract:", err);
    return null;
  }
}

/**
 * رفع الطالب لإيصال دفع الشهر
 */
export async function uploadRentReceiptApi(
  bookingId: string,
  paymentId: string,
  receiptImageUrl: string
): Promise<RentPayment | null> {
  try {
    return await apiFetch<RentPayment>(`/api/bookings/${bookingId}/rent-payments/${paymentId}/upload-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptImageUrl }),
    });
  } catch (err) {
    console.error("Failed to upload rent receipt:", err);
    return null;
  }
}

/**
 * قبول الآدمن لإيصال دفع الشهر
 */
export async function approveRentPaymentApi(bookingId: string, paymentId: string): Promise<RentPayment | null> {
  try {
    return await apiFetch<RentPayment>(`/api/bookings/${bookingId}/rent-payments/${paymentId}/approve`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to approve rent payment:", err);
    return null;
  }
}

/**
 * رفض الآدمن لإيصال دفع الشهر
 */
export async function rejectRentPaymentApi(bookingId: string, paymentId: string): Promise<RentPayment | null> {
  try {
    return await apiFetch<RentPayment>(`/api/bookings/${bookingId}/rent-payments/${paymentId}/reject`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to reject rent payment:", err);
    return null;
  }
}

/**
 * تسجيل الآدمن لعملية دفع يدوي للشهر
 */
export async function recordManualRentPaymentApi(
  bookingId: string,
  paymentId: string,
  data: {
    amount: number;
    paidAt: string;
    paymentSource: string;
  }
): Promise<RentPayment | null> {
  try {
    return await apiFetch<RentPayment>(`/api/bookings/${bookingId}/rent-payments/${paymentId}/manual-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Failed to record manual payment:", err);
    return null;
  }
}

/**
 * رفع إيصال اشتراك مكاني (1200 جنيه) بواسطة الطالب
 */
export async function uploadSubscriptionReceiptApi(
  bookingId: string,
  receiptImageUrl: string
): Promise<StudentBooking | null> {
  try {
    return await apiFetch<StudentBooking>(`/api/bookings/${bookingId}/subscription/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptImageUrl }),
    });
  } catch (err) {
    console.error("Failed to upload subscription receipt:", err);
    return null;
  }
}
