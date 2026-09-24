import { apiFetch } from "./api-client";

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
  createdAt: string;
  updatedAt: string;
  property?: any;
  student?: any;
}

export async function getStudentBookingsApi(): Promise<StudentBooking[]> {
  try {
    return await apiFetch("/api/bookings/my-bookings", { method: "GET" });
  } catch (err) {
    console.error("Failed to fetch student bookings:", err);
    return [];
  }
}

export async function createBookingApi(data: {
  propertyId: number;
  paymentMethod: string;
  paymentAmount: number;
  receiptImageUrl?: string;
  senderPhone?: string;
  referenceNumber?: string;
}): Promise<StudentBooking> {
  return await apiFetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getOwnerBookingsApi(): Promise<StudentBooking[]> {
  try {
    return await apiFetch("/api/bookings/owner-bookings", { method: "GET" });
  } catch (err) {
    console.error("Failed to fetch owner bookings:", err);
    return [];
  }
}

export async function getAdminBookingsApi(): Promise<StudentBooking[]> {
  try {
    return await apiFetch("/api/bookings/admin", { method: "GET" });
  } catch (err) {
    console.error("Failed to fetch admin bookings:", err);
    return [];
  }
}

export async function getBookingByIdApi(bookingId: string): Promise<StudentBooking | null> {
  try {
    return await apiFetch(`/api/bookings/${bookingId}`, { method: "GET" });
  } catch (err) {
    console.error("Failed to fetch booking by id:", err);
    return null;
  }
}

export async function updateBookingStatusApi(
  bookingId: string,
  status: "pending_review" | "confirmed" | "rejected",
  adminNotes?: string
): Promise<StudentBooking | null> {
  try {
    return await apiFetch(`/api/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes }),
    });
  } catch (err) {
    console.error("Failed to update booking status:", err);
    return null;
  }
}

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

export function buildWhatsAppBookingUrl(booking: StudentBooking): string {
  const adminWhatsAppNumber = "201055332242";
  
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
