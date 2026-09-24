import { Router, type Request, type Response } from "express";
import { db, bookings, apartments, rentPayments, users } from "@workspace/db";
import { eq, inArray, desc, and, or, ne } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { ensureSeedApartments } from "../lib/seed-apartments";
import { createNotification } from "../lib/notifications-helper";
import { getPrivateFileSignedUrl } from "../lib/supabase-storage";

const router = Router();

/**
 * Validates that an incoming receipt URL/path is a valid private storage path in mkany-private-files
 * and rejects arbitrary external http(s) URLs or public property image URLs.
 * Also enforces authorization so a student cannot submit another user's receipt path.
 */
export async function validatePrivateReceiptPath(
  rawPath: string | null | undefined,
  studentId?: string
): Promise<{ isValid: boolean; cleanPath?: string; errorMessage?: string }> {
  if (!rawPath || typeof rawPath !== "string" || !rawPath.trim()) {
    return { isValid: false, errorMessage: "صورة أو مسار إيصال الدفع مطلوب لإتمام الطلب" };
  }
  const trimmed = rawPath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { 
      isValid: false, 
      errorMessage: "إيصال الدفع يجب أن يكون مساراً محميًا في التخزين الخاص وليس رابطاً خارجياً عاماً" 
    };
  }
  if (trimmed.includes("mkany-property-images") || trimmed.includes("properties/")) {
    return { 
      isValid: false, 
      errorMessage: "إيصال الدفع يجب أن يكون مستنداً محميًا في التخزين الخاص وليس صورة عقار عامة" 
    };
  }

  const cleanPath = trimmed.replace(/^\/+/, "").replace(/\.\.+/g, "");
  
  if (!cleanPath.startsWith("receipts/") && !cleanPath.startsWith("verification/") && !cleanPath.startsWith("private_documents/")) {
    return { 
      isValid: false, 
      errorMessage: "مسار إيصال الدفع غير صالح في التخزين الخاص المشفر" 
    };
  }

  // Verify file actually exists in Supabase private bucket (mkany-private-files)
  const signedUrl = await getPrivateFileSignedUrl(cleanPath, 60);
  if (!signedUrl) {
    return { 
      isValid: false, 
      errorMessage: "تعذر التثبت من وجود ملف الإيصال المرفق في التخزين الخاص المشفر (mkany-private-files)" 
    };
  }

  // Enforce cross-user receipt authorization if studentId is supplied
  if (studentId) {
    const [existingBooking, existingPayment, existingUser] = await Promise.all([
      db.query.bookings.findFirst({
        where: and(
          or(eq(bookings.receiptImageUrl, cleanPath), eq(bookings.subscriptionReceiptUrl, cleanPath)),
          ne(bookings.studentId, studentId)
        ),
      }),
      db.query.rentPayments.findFirst({
        where: eq(rentPayments.receiptImageUrl, cleanPath),
        with: { booking: true },
      }),
      db.query.users.findFirst({
        where: and(
          eq(users.subscriptionReceiptUrl, cleanPath),
          ne(users.id, studentId)
        ),
      }),
    ]);

    const existingPaymentOtherUser = existingPayment && existingPayment.booking && existingPayment.booking.studentId !== studentId;

    if (existingBooking || existingPaymentOtherUser || existingUser) {
      return {
        isValid: false,
        errorMessage: "غير مصرح لك برفق أو استخدام مسار إيصال خاص بمستخدم آخر",
      };
    }
  }

  return { isValid: true, cleanPath };
}

function formatPrivateUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://") || urlOrPath.startsWith("/api/upload/private/view")) {
    return urlOrPath;
  }
  return `/api/upload/private/view?path=${encodeURIComponent(urlOrPath)}`;
}

/**
 * Format booking for Student and Admin views (full details including relations)
 */
function formatBooking(b: any) {
  if (!b) return b;
  const images = Array.isArray(b.property?.images) ? b.property.images : [];
  
  // Calculate duration if dates exist
  let contractDurationMonths = 0;
  if (b.contractStartDate && b.contractEndDate) {
    const start = new Date(b.contractStartDate);
    const end = new Date(b.contractEndDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      contractDurationMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    }
  }

  const formattedRentPayments = Array.isArray(b.rentPayments)
    ? b.rentPayments.map((p: any) => ({
        ...p,
        receiptImageUrl: formatPrivateUrl(p.receiptImageUrl),
      }))
    : [];

  return {
    id: b.id,
    bookingCode: b.bookingCode,
    propertyId: b.propertyId,
    propertyTitle: b.property?.title || "وحدة سكنية",
    propertyAddress: b.property?.address || "",
    propertyImage: images[0] || "/images/placeholder.jpg",
    propertyPrice: b.property?.pricePerMonth || b.paymentAmount,
    propertyUniversity: b.property?.university || "",
    studentId: b.studentId,
    studentName: b.student?.fullName || "",
    studentPhone: b.student?.phoneNumber || b.senderPhone || "",
    studentNationalId: b.student?.nationalId || "",
    studentUniversity: b.student?.university || "",
    studentEmail: b.student?.email || "",
    paymentMethod: b.paymentMethod,
    paymentAmount: b.paymentAmount,
    receiptImageUrl: formatPrivateUrl(b.receiptImageUrl),
    senderPhone: b.senderPhone,
    referenceNumber: b.referenceNumber,
    status: b.status,
    adminNotes: b.adminNotes,
    appointmentDate: b.appointmentDate,
    appointmentTime: b.appointmentTime,
    contractStartDate: b.contractStartDate,
    contractEndDate: b.contractEndDate,
    contractDurationMonths,
    depositAmount: b.depositAmount || 0,
    depositStatus: b.depositStatus || "unpaid",
    depositPaidAt: b.depositPaidAt,
    handoverStatus: b.handoverStatus || "not_started",
    handoverDate: b.handoverDate,
    subscriptionStatus: b.subscriptionStatus || "unpaid",
    subscriptionAmount: b.subscriptionAmount || 1200,
    subscriptionReceiptUrl: formatPrivateUrl(b.subscriptionReceiptUrl || b.receiptImageUrl),
    subscriptionApprovedAt: b.subscriptionApprovedAt,
    subscriptionApprovedBy: b.subscriptionApprovedBy,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    property: b.property,
    student: b.student,
    rentPayments: formattedRentPayments,
  };
}

/**
 * Format booking for Owner view (sanitized to preserve student privacy and prevent direct contact)
 */
function formatOwnerBooking(b: any) {
  if (!b) return b;
  const images = Array.isArray(b.property?.images) ? b.property.images : [];
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    propertyId: b.propertyId,
    propertyTitle: b.property?.title || "وحدة سكنية",
    propertyAddress: b.property?.address || "",
    propertyImage: images[0] || "/images/placeholder.jpg",
    propertyPrice: b.property?.pricePerMonth || b.paymentAmount,
    propertyUniversity: b.property?.university || "",
    paymentMethod: b.paymentMethod,
    paymentAmount: b.paymentAmount,
    status: b.status,
    adminNotes: b.adminNotes,
    appointmentDate: b.appointmentDate,
    appointmentTime: b.appointmentTime,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    // Sensitive personal data masked for privacy - direct Student <-> Owner communication is forbidden
    receiptImageUrl: null,
    senderPhone: null,
    referenceNumber: null,
    student: {
      fullName: b.student?.fullName || "طالب مكاني",
      university: b.student?.university || "",
    },
    property: b.property,
  };
}

/**
 * Recalculate dynamic availablePlaces and update the apartment status accordingly.
 */
async function syncApartmentStatus(propertyId: number) {
  try {
    const property = await db.query.apartments.findFirst({
      where: eq(apartments.id, propertyId),
    });
    if (!property) return;

    const activeBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.propertyId, propertyId),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
      ),
    });

    const capacity = property.bedrooms || 0;
    const currentRoommates = property.currentRoommates || 0;
    const occupiedPlaces = currentRoommates + activeBookings.length;
    const availablePlaces = Math.max(0, capacity - occupiedPlaces);

    let newStatus = property.status;
    if (property.status === "متاح" || property.status === "مشغول") {
      newStatus = availablePlaces === 0 ? "مشغول" : "متاح";
    }

    if (newStatus !== property.status) {
      await db.update(apartments)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(apartments.id, propertyId));
    }
  } catch (error) {
    console.error("Failed to sync apartment status:", error);
  }
}

/**
 * POST /api/bookings
 * Create a new booking for the authenticated student.
 * Never accepts studentId, status, or adminNotes from client; uses req.dbUser.id.
 * Derives paymentAmount server-side from property.pricePerMonth.
 * Requires valid receipt and approved + available property.
 */
router.post("/", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;
    const { propertyId, paymentMethod, receiptImageUrl, senderPhone, referenceNumber, appointmentDate, appointmentTime } = req.body;

    const parsedPropertyId = Number(propertyId);
    if (!parsedPropertyId || isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
      res.status(400).json({ error: "Bad Request", message: "معرّف العقار مطلوب وغير صالح" });
      return;
    }

    // Verify property exists
    let property = await db.query.apartments.findFirst({
      where: eq(apartments.id, parsedPropertyId),
    });

    if (!property) {
      await ensureSeedApartments();
      property = await db.query.apartments.findFirst({
        where: eq(apartments.id, parsedPropertyId),
      });
    }

    if (!property) {
      res.status(404).json({ error: "Not Found", message: "الوحدة السكنية غير موجودة" });
      return;
    }

    // Strict approval and availability validation:
    // Only approved ("متاح" or "approved") and available properties can be booked
    const isApproved = property.status === "متاح" || property.status === "approved";
    if (!isApproved) {
      res.status(400).json({ error: "Bad Request", message: "لا يمكن حجز عقار لم يتم اعتماده ونشره من الإدارة بعد" });
      return;
    }

    // Validate availability
    const activeBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.propertyId, parsedPropertyId),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
      ),
    });

    const capacity = property.bedrooms || 0;
    const currentRoommates = property.currentRoommates || 0;
    const occupiedPlaces = currentRoommates + activeBookings.length;
    const availablePlaces = Math.max(0, capacity - occupiedPlaces);

    if (availablePlaces <= 0) {
      res.status(400).json({ 
        error: "Bad Request", 
        message: "عذراً، هذه الوحدة السكنية مكتملة الحجز بالكامل وغير متاحة للحجوزات الجديدة حالياً." 
      });
      return;
    }

    // Validate receipt screenshot / private storage path
    const validation = await validatePrivateReceiptPath(receiptImageUrl, studentId);
    if (!validation.isValid || !validation.cleanPath) {
      res.status(400).json({ error: "Bad Request", message: validation.errorMessage || "صورة أو مسار إيصال التحويل غير صالح" });
      return;
    }
    const cleanReceiptPath = validation.cleanPath;

    // Check for existing pending booking for the same student and property to prevent duplicates
    const existingPending = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.studentId, studentId),
        eq(bookings.propertyId, parsedPropertyId),
        eq(bookings.status, "pending_review")
      ),
    });

    if (existingPending) {
      res.status(409).json({ 
        error: "Conflict", 
        message: "لديك بالفعل طلب حجز قيد المراجعة لهذه الوحدة السكنية." 
      });
      return;
    }

    // Validate payment method
    const validPaymentMethods = ["vodafone_cash", "instapay", "bank_transfer"];
    const finalPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "vodafone_cash";

    // Set Mkany subscription amount = 1200 EGP as booking paymentAmount and populate subscription fields
    const finalPaymentAmount = 1200;

    const newId = `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `MKN-${new Date().getFullYear()}-${randomSuffix}`;

    const [newBooking] = await db.insert(bookings).values({
      id: newId,
      bookingCode,
      propertyId: parsedPropertyId,
      studentId,
      paymentMethod: finalPaymentMethod,
      paymentAmount: finalPaymentAmount,
      receiptImageUrl: cleanReceiptPath,
      senderPhone: typeof senderPhone === "string" && senderPhone.trim() ? senderPhone.trim() : (req.dbUser!.phoneNumber || null),
      referenceNumber: typeof referenceNumber === "string" && referenceNumber.trim() ? referenceNumber.trim() : null,
      appointmentDate: typeof appointmentDate === "string" && appointmentDate.trim() ? appointmentDate.trim() : null,
      appointmentTime: typeof appointmentTime === "string" && appointmentTime.trim() ? appointmentTime.trim() : null,
      status: "pending_review",
      subscriptionStatus: "pending_review",
      subscriptionAmount: 1200,
      subscriptionReceiptUrl: cleanReceiptPath,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Update user-level subscription state to pending_review
    await db.update(users)
      .set({
        subscriptionStatus: "pending_review",
        subscriptionAmount: 1200,
        subscriptionReceiptUrl: cleanReceiptPath,
        updatedAt: new Date()
      })
      .where(eq(users.id, studentId));

    // Sync apartment status in database
    await syncApartmentStatus(parsedPropertyId);

    const fullBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, newBooking.id),
      with: { property: true, student: true },
    });

    // Send notifications asynchronously in the background
    try {
      // 1. Notify Student
      await createNotification({
        userId: studentId,
        type: "booking_submitted",
        title: "تم استلام طلب الحجز",
        body: `تم تسجيل طلب حجزك للوحدة السكنية بنجاح برقم حجز ${bookingCode} وهو قيد المراجعة حالياً.`,
        referenceType: "booking",
        referenceId: newBooking.id,
      });

      await createNotification({
        userId: studentId,
        type: "subscription_receipt_submitted",
        title: "تم استلام إيصال الاشتراك",
        body: "تم استلام إيصال اشتراك مكاني بقيمة 1200 ج.م وجاري التحقق منه.",
        referenceType: "booking",
        referenceId: newBooking.id,
      });

      // 2. Notify Owner if the property has an owner
      if (property && property.ownerId) {
        await createNotification({
          userId: property.ownerId,
          type: "owner_booking_received",
          title: "طلب حجز جديد لوحدتك السكنية",
          body: "لقد تم استلام طلب حجز جديد للوحدة السكنية الخاصة بك وهو قيد المراجعة.",
          referenceType: "booking",
          referenceId: newBooking.id,
        });
      }

      // 3. Notify Admin
      await createNotification({
        userId: "admin",
        type: "admin_new_booking",
        title: "لديك طلب حجز جديد يحتاج إلى مراجعة",
        body: `قام طالب بتقديم طلب حجز جديد برقم الحجز: ${bookingCode}`,
        referenceType: "booking",
        referenceId: newBooking.id,
      });

      await createNotification({
        userId: "admin",
        type: "admin_new_subscription",
        title: "إيصال اشتراك جديد يحتاج إلى المراجعة",
        body: "تم رفع إيصال اشتراك جديد بقيمة 1200 ج.م للمراجعة.",
        referenceType: "booking",
        referenceId: newBooking.id,
      });
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on booking submission:", notifErr);
    }

    res.status(201).json(formatBooking(fullBooking || newBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to create booking");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في تسجيل طلب الحجز" });
  }
});

/**
 * GET /api/bookings/my-bookings
 * Get bookings created by the authenticated student.
 */
router.get("/my-bookings", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;
    const studentBookings = await db.query.bookings.findMany({
      where: eq(bookings.studentId, studentId),
      with: {
        property: true,
        student: true,
      },
      orderBy: [desc(bookings.createdAt)],
    });

    res.json(studentBookings.map(formatBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch student bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/owner-bookings
 * Get bookings for properties owned by the authenticated owner.
 * Admins receive all bookings.
 * Owner responses are sanitized to protect student privacy and prevent direct contact.
 */
router.get("/owner-bookings", requireAuth, requireRole(["owner", "admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    if (req.dbUser!.role === "admin" || req.dbUser!.role === "super_admin") {
      const allBookings = await db.query.bookings.findMany({
        with: { property: true, student: true },
        orderBy: [desc(bookings.createdAt)],
      });
      res.json(allBookings.map(formatBooking));
      return;
    }

    const ownerApartments = await db.query.apartments.findMany({
      where: eq(apartments.ownerId, req.dbUser!.id),
    });

    const propertyIds = ownerApartments.map((a: any) => a.id);
    if (propertyIds.length === 0) {
      res.json([]);
      return;
    }

    const ownerBookings = await db.query.bookings.findMany({
      where: inArray(bookings.propertyId, propertyIds),
      with: { property: true, student: true },
      orderBy: [desc(bookings.createdAt)],
    });

    res.json(ownerBookings.map(formatOwnerBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch owner bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/admin
 * Admin endpoint to list all bookings for review.
 */
router.get("/admin", requireAuth, requireRole(["admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    const adminBookings = await db.query.bookings.findMany({
      with: { property: true, student: true },
      orderBy: [desc(bookings.createdAt)],
    });

    res.json(adminBookings.map(formatBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch admin bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/admin/properties-reservations
 * Admin/Super Admin only. Returns all properties aggregated with active booking counts,
 * occupancy rates, and lists of all associated bookers (bookings + students + rent ledgers).
 * Does not filter out properties with availablePlaces = 0.
 */
router.get("/admin/properties-reservations", requireAuth, requireRole(["admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    const allProperties = await db.query.apartments.findMany({
      with: {
        bookings: {
          with: {
            student: true,
            rentPayments: true,
          }
        }
      },
      orderBy: [desc(apartments.createdAt)],
    });

    const aggregated = allProperties.map((property: any) => {
      const capacity = property.bedrooms || 0;
      const currentRoommates = property.currentRoommates || 0;
      const propertyBookings = property.bookings || [];

      // Count confirmed and pending bookings
      const confirmedBookings = propertyBookings.filter((b: any) => b.status === "confirmed").length;
      const pendingBookings = propertyBookings.filter((b: any) => b.status === "pending_review").length;

      // Occupied places = currentRoommates + (confirmed and pending_review bookings)
      const activeBookingsCount = propertyBookings.filter((b: any) => b.status === "confirmed" || b.status === "pending_review").length;
      const occupiedPlaces = currentRoommates + activeBookingsCount;
      const availablePlaces = Math.max(0, capacity - occupiedPlaces);
      const isFull = availablePlaces <= 0;

      const formattedBookings = propertyBookings.map((b: any) => {
        let contractDurationMonths = 0;
        if (b.contractStartDate && b.contractEndDate) {
          const start = new Date(b.contractStartDate);
          const end = new Date(b.contractEndDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            contractDurationMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
          }
        }

        return {
          id: b.id,
          bookingCode: b.bookingCode,
          status: b.status,
          adminNotes: b.adminNotes,
          appointmentDate: b.appointmentDate,
          appointmentTime: b.appointmentTime,
          contractStartDate: b.contractStartDate,
          contractEndDate: b.contractEndDate,
          contractDurationMonths,
          depositAmount: b.depositAmount || 0,
          depositStatus: b.depositStatus || "unpaid",
          depositPaidAt: b.depositPaidAt,
          handoverStatus: b.handoverStatus || "not_started",
          handoverDate: b.handoverDate,
          
          // subscription amount/status (1200 EGP subscription completely separate from rent)
          subscriptionStatus: b.subscriptionStatus || "unpaid",
          subscriptionAmount: b.subscriptionAmount || 1200,
          subscriptionReceiptUrl: b.subscriptionReceiptUrl || b.receiptImageUrl,
          subscriptionApprovedAt: b.subscriptionApprovedAt,

          paymentMethod: b.paymentMethod,
          paymentAmount: b.paymentAmount,
          receiptImageUrl: b.receiptImageUrl,
          senderPhone: b.senderPhone,
          referenceNumber: b.referenceNumber,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,

          // Operational student data (fully secured, no passwords, keys or Clerk secrets)
          student: {
            id: b.student?.id,
            fullName: b.student?.fullName || "",
            phoneNumber: b.student?.phoneNumber || b.senderPhone || "",
            university: b.student?.university || "",
            email: b.student?.email || "",
          },

          // Rent ledger information
          rentPayments: b.rentPayments || []
        };
      });

      return {
        property: {
          id: property.id,
          title: property.title,
          address: property.address,
          university: property.university,
          pricePerMonth: property.pricePerMonth,
          bedrooms: property.bedrooms,
          status: property.status,
          verified: property.verified,
        },
        occupancy: {
          capacity,
          currentRoommates,
          confirmedBookings,
          pendingBookings,
          occupiedPlaces,
          availablePlaces,
          isFull,
        },
        bookings: formattedBookings,
      };
    });

    res.json(aggregated);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch admin reserved properties");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/:id
 * Retrieve a single booking by ID with strict IDOR protection:
 * - Admin can view any booking.
 * - Student can ONLY view their own booking.
 * - Owner can ONLY view bookings for properties they own (with sanitized student contact info).
 * - Others receive 403 Forbidden.
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = req.dbUser!;

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: { property: true, student: true },
    });

    if (!booking) {
      res.status(404).json({ error: "Not Found", message: "طلب الحجز غير موجود" });
      return;
    }

    // Admin authorization
    if (user.role === "admin" || user.role === "super_admin") {
      res.json(formatBooking(booking));
      return;
    }

    // Student authorization
    if (user.role === "student") {
      if (booking.studentId !== user.id) {
        res.status(403).json({ error: "Forbidden", message: "غير مصرح لك بالوصول إلى هذا الحجز" });
        return;
      }
      res.json(formatBooking(booking));
      return;
    }

    // Owner authorization
    if (user.role === "owner") {
      if (booking.property?.ownerId !== user.id) {
        res.status(403).json({ error: "Forbidden", message: "غير مصرح لك بالوصول إلى هذا الحجز" });
        return;
      }
      res.json(formatOwnerBooking(booking));
      return;
    }

    res.status(403).json({ error: "Forbidden", message: "غير مصرح لك بالوصول" });
  } catch (error) {
    req.log.error({ error }, "Failed to fetch booking by id");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Admin endpoint to update booking status and notes.
 * Strictly restricted to admin role.
 */
router.patch("/:id/status", requireAuth, requireRole(["admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { 
      status, 
      adminNotes, 
      appointmentDate, 
      appointmentTime,
      subscriptionStatus,
      handoverStatus,
      handoverDate,
      depositStatus,
      depositAmount,
      contractStartDate,
      contractEndDate
    } = req.body;

    const existing = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
    });

    if (!existing) {
      res.status(404).json({ error: "Not Found", message: "Booking not found" });
      return;
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status) {
      if (!["pending_review", "confirmed", "rejected"].includes(status)) {
        res.status(400).json({ error: "Bad Request", message: "Invalid booking status" });
        return;
      }
      updateData.status = status;

      // If booking status is approved/confirmed, do NOT auto-approve subscription.
      // Subscription remains separate and must be explicitly approved/rejected by Admin.
      if (status === "rejected") {
        updateData.subscriptionStatus = "rejected";
      }
    }

    if (typeof adminNotes === "string") {
      updateData.adminNotes = adminNotes;
    }

    if (typeof appointmentDate === "string") {
      updateData.appointmentDate = appointmentDate.trim() || null;
    }

    if (typeof appointmentTime === "string") {
      updateData.appointmentTime = appointmentTime.trim() || null;
    }

    // subscriptionStatus
    if (subscriptionStatus) {
      if (!["unpaid", "pending_review", "approved", "rejected"].includes(subscriptionStatus)) {
        res.status(400).json({ error: "Bad Request", message: "Invalid subscription status" });
        return;
      }
      updateData.subscriptionStatus = subscriptionStatus;
      if (subscriptionStatus === "approved") {
        updateData.subscriptionApprovedAt = new Date();
        updateData.subscriptionApprovedBy = req.dbUser!.id;
      }
    }

    // handoverStatus
    if (handoverStatus) {
      if (!["not_started", "scheduled", "completed"].includes(handoverStatus)) {
        res.status(400).json({ error: "Bad Request", message: "Invalid handover status" });
        return;
      }
      updateData.handoverStatus = handoverStatus;
      if (handoverStatus === "completed" && !updateData.handoverDate) {
        updateData.handoverDate = new Date().toISOString().split("T")[0];
      }
    }

    if (typeof handoverDate === "string") {
      updateData.handoverDate = handoverDate.trim() || null;
    }

    // depositStatus
    if (depositStatus) {
      if (!["unpaid", "partial", "paid"].includes(depositStatus)) {
        res.status(400).json({ error: "Bad Request", message: "Invalid deposit status" });
        return;
      }
      updateData.depositStatus = depositStatus;
      if (depositStatus === "paid") {
        updateData.depositPaidAt = new Date();
      }
    }

    // depositAmount
    if (typeof depositAmount === "number") {
      updateData.depositAmount = depositAmount;
    }

    // contract dates
    if (typeof contractStartDate === "string") {
      updateData.contractStartDate = contractStartDate.trim() || null;
    }
    if (typeof contractEndDate === "string") {
      updateData.contractEndDate = contractEndDate.trim() || null;
    }

    // Update DB
    await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id));

    // If subscription became approved, also update the student user's Pro state!
    const finalSubscriptionStatus = updateData.subscriptionStatus || existing.subscriptionStatus;
    if (finalSubscriptionStatus === "approved") {
      await db.update(users)
        .set({
          subscriptionStatus: "approved",
          subscriptionApprovedAt: new Date(),
          subscriptionApprovedBy: req.dbUser!.id,
          updatedAt: new Date()
        })
        .where(eq(users.id, existing.studentId));
    } else if (finalSubscriptionStatus === "rejected") {
      await db.update(users)
        .set({
          subscriptionStatus: "rejected",
          updatedAt: new Date()
        })
        .where(eq(users.id, existing.studentId));
    }

    // Sync apartment status in database
    await syncApartmentStatus(existing.propertyId);

    const updated = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: { property: true, student: true, rentPayments: true },
    });

    // Send notifications on updates
    try {
      const studentId = existing.studentId;
      const bookingCode = existing.bookingCode;

      // 1. Booking Status Changes
      if (status && status !== existing.status) {
        if (status === "confirmed") {
          await createNotification({
            userId: studentId,
            type: "booking_confirmed",
            title: "تم تأكيد الحجز",
            body: `تهانينا! تم تأكيد طلب حجزك للوحدة السكنية بنجاح. رقم الحجز: ${bookingCode}`,
            referenceType: "booking",
            referenceId: id,
          });

          const fDate = appointmentDate || existing.appointmentDate;
          const fTime = appointmentTime || existing.appointmentTime;
          if (fDate && fTime) {
            await createNotification({
              userId: studentId,
              type: "appointment_confirmed",
              title: "تم تأكيد موعد المقابلة",
              body: `تم تحديد موعد المقابلة يوم ${fDate} في الساعة ${fTime}. يرجى الحضور في الموعد المحدد.`,
              referenceType: "booking",
              referenceId: id,
            });
          }
        } else if (status === "rejected") {
          await createNotification({
            userId: studentId,
            type: "booking_rejected",
            title: "تم رفض طلب الحجز",
            body: `عذراً، تم رفض طلب حجزك للوحدة السكنية برقم: ${bookingCode}.`,
            referenceType: "booking",
            referenceId: id,
          });
        }
      }

      // 2. Subscription Status Changes
      if (subscriptionStatus && subscriptionStatus !== existing.subscriptionStatus) {
        if (subscriptionStatus === "approved") {
          await createNotification({
            userId: studentId,
            type: "subscription_approved",
            title: "تم اعتماد اشتراك مكاني وتفعيل Pro ⭐",
            body: "تم التحقق من إيصال اشتراكك بنجاح، وتفعيل رصيد اشتراك مكاني ومميزات Pro الخاصة بك!",
            referenceType: "booking",
            referenceId: id,
          });
        } else if (subscriptionStatus === "rejected") {
          await createNotification({
            userId: studentId,
            type: "subscription_rejected",
            title: "تم رفض إيصال الاشتراك",
            body: "عذراً، تم رفض إيصال الاشتراك الخاص بك. يرجى التأكد وإعادة رفعه للتفعيل.",
            referenceType: "booking",
            referenceId: id,
          });
        }
      }

      // 3. Handover Status Changes
      if (handoverStatus && handoverStatus !== existing.handoverStatus) {
        if (handoverStatus === "scheduled") {
          const hDate = handoverDate || existing.handoverDate || "";
          await createNotification({
            userId: studentId,
            type: "handover_scheduled",
            title: "تم جدولة موعد الاستلام",
            body: `تم جدولة موعد استلام الوحدة السكنية الخاصة بك بتاريخ ${hDate}`,
            referenceType: "booking",
            referenceId: id,
          });
        } else if (handoverStatus === "completed") {
          await createNotification({
            userId: studentId,
            type: "handover_completed",
            title: "تم استلام السكن بنجاح",
            body: "لقد تم استلام السكن وتوقيع العقد بنجاح. نتمنى لك إقامة سعيدة!",
            referenceType: "booking",
            referenceId: id,
          });
        }
      }
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on booking status update:", notifErr);
    }

    res.json(formatBooking(updated || existing));
  } catch (error) {
    req.log.error({ error }, "Failed to update booking status");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Dynamic overdue resolution helper
function mapOverdueStatus(p: any) {
  if (!p) return p;
  if (p.status === "due") {
    const todayStr = new Date().toISOString().split("T")[0];
    if (p.dueDate && p.dueDate < todayStr) {
      return { ...p, status: "overdue" };
    }
  }
  return p;
}

/**
 * GET /api/bookings/:bookingId/rent-payments
 */
router.get("/:bookingId/rent-payments", requireAuth, async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, String(bookingId)),
    });

    if (!booking) {
      res.status(404).json({ error: "Not Found", message: "Booking not found" });
      return;
    }

    // Authz/IDOR check
    if (userRole === "student" && booking.studentId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "غير مصرح لك بالوصول لبيانات هذا الحجز" });
      return;
    }

    if (userRole === "owner") {
      res.status(403).json({ error: "Forbidden", message: "غير مصرح لملاك الوحدات بالوصول للبيانات المالية للطلاب" });
      return;
    }

    const payments = await db.query.rentPayments.findMany({
      where: eq(rentPayments.bookingId, String(bookingId)),
      orderBy: [desc(rentPayments.dueDate)],
    });

    res.json(payments.map(mapOverdueStatus));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch rent payments");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/bookings/:id/contract
 * Admin/Super Admin only. Sets contract dates + deposit, and generates rent payments list.
 */
router.patch("/:id/contract", requireAuth, requireRole(["admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { contractStartDate, contractEndDate, depositAmount, depositStatus, handoverStatus, handoverDate, subscriptionStatus } = req.body;

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, String(id)),
      with: { property: true },
    });

    if (!booking) {
      res.status(404).json({ error: "Not Found", message: "Booking not found" });
      return;
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (typeof contractStartDate === "string") updateData.contractStartDate = contractStartDate;
    if (typeof contractEndDate === "string") updateData.contractEndDate = contractEndDate;
    if (typeof depositAmount === "number") updateData.depositAmount = depositAmount;
    if (typeof depositStatus === "string") {
      if (["unpaid", "partial", "paid"].includes(depositStatus)) {
        updateData.depositStatus = depositStatus;
        if (depositStatus === "paid") {
          updateData.depositPaidAt = new Date();
        }
      }
    }

    if (typeof handoverStatus === "string") {
      if (["not_started", "scheduled", "completed"].includes(handoverStatus)) {
        updateData.handoverStatus = handoverStatus;
        if (handoverStatus === "completed" && !handoverDate) {
          updateData.handoverDate = new Date().toISOString().split("T")[0];
        }
      }
    }
    if (typeof handoverDate === "string") {
      updateData.handoverDate = handoverDate;
    }

    if (typeof subscriptionStatus === "string") {
      if (["unpaid", "pending_review", "approved", "rejected"].includes(subscriptionStatus)) {
        updateData.subscriptionStatus = subscriptionStatus;
        if (subscriptionStatus === "approved") {
          updateData.subscriptionApprovedAt = new Date();
          updateData.subscriptionApprovedBy = req.dbUser!.id;
        }
      }
    }

    // Update the booking record
    await db.update(bookings).set(updateData).where(eq(bookings.id, String(id)));

    // Synchronize Student's user-level subscriptionStatus (Pro activation)
    const finalSubscriptionStatus = subscriptionStatus || booking.subscriptionStatus;
    if (finalSubscriptionStatus === "approved") {
      await db.update(users)
        .set({
          subscriptionStatus: "approved",
          subscriptionApprovedAt: new Date(),
          subscriptionApprovedBy: req.dbUser!.id,
          updatedAt: new Date()
        })
        .where(eq(users.id, booking.studentId));
    } else {
      await db.update(users)
        .set({
          subscriptionStatus: finalSubscriptionStatus === "rejected" ? "rejected" : "unpaid",
          updatedAt: new Date()
        })
        .where(eq(users.id, booking.studentId));
    }

    // Generate monthly rent schedule if start/end dates are provided or updated
    const finalStart = contractStartDate || booking.contractStartDate;
    const finalEnd = contractEndDate || booking.contractEndDate;

    if (finalStart && finalEnd) {
      const start = new Date(finalStart);
      const end = new Date(finalEnd);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const propertyPrice = booking.property?.pricePerMonth || booking.paymentAmount || 0;
        
        const arabicMonths = [
          "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
          "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];

        const generatedPayments = [];
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        const limit = new Date(end.getFullYear(), end.getMonth(), 1);

        while (current <= limit) {
          const year = current.getFullYear();
          const monthIdx = current.getMonth();
          const billingPeriod = `${arabicMonths[monthIdx]} ${year}`;
          const dueDateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;

          generatedPayments.push({
            id: `rent_${id}_${year}_${monthIdx}`,
            bookingId: id,
            billingPeriod,
            amount: propertyPrice,
            dueDate: dueDateStr,
            status: "due",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          current.setMonth(current.getMonth() + 1);
        }

        const existingPayments = await db.query.rentPayments.findMany({
          where: eq(rentPayments.bookingId, String(id)),
        });

        const paidPeriods = new Set(
          existingPayments.filter((p: any) => p.status === "paid").map((p: any) => p.billingPeriod)
        );

        // Clear unpaid ones
        await db.delete(rentPayments)
          .where(and(
            eq(rentPayments.bookingId, String(id)),
            inArray(rentPayments.status, ["due", "pending_review", "rejected", "overdue"])
          ));

        // Insert new schedule skipping already paid ones
        for (const payment of generatedPayments) {
          if (paidPeriods.has(payment.billingPeriod)) {
            continue;
          }
          await db.insert(rentPayments).values(payment);
        }
      }
    }

    const updated = await db.query.bookings.findFirst({
      where: eq(bookings.id, String(id)),
      with: { property: true, student: true, rentPayments: true },
    });

    res.json(formatBooking(updated || booking));
  } catch (error) {
    req.log.error({ error }, "Failed to update contract");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/bookings/:bookingId/rent-payments/:paymentId/upload-receipt
 * Student uploads a receipt for a specific billing month.
 */
router.post("/:bookingId/rent-payments/:paymentId/upload-receipt", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;
    const { receiptImageUrl } = req.body;
    const userId = req.dbUser!.id;

    const validation = await validatePrivateReceiptPath(receiptImageUrl, userId);
    if (!validation.isValid || !validation.cleanPath) {
      res.status(400).json({ error: "Bad Request", message: validation.errorMessage || "إيصال الدفع غير صالح" });
      return;
    }
    const cleanReceiptPath = validation.cleanPath;

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, String(bookingId)),
    });

    if (!booking) {
      res.status(404).json({ error: "Not Found", message: "Booking not found" });
      return;
    }

    // IDOR checking
    if (booking.studentId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "غير مصرح لك برفع إيصال لهذا الحجز" });
      return;
    }

    const payment = await db.query.rentPayments.findFirst({
      where: and(
        eq(rentPayments.id, String(paymentId)),
        eq(rentPayments.bookingId, String(bookingId))
      ),
    });

    if (!payment) {
      res.status(404).json({ error: "Not Found", message: "Rent payment record not found" });
      return;
    }

    await db.update(rentPayments)
      .set({
        status: "pending_review",
        receiptImageUrl: cleanReceiptPath,
        paymentSource: "student_upload",
        updatedAt: new Date(),
      })
      .where(eq(rentPayments.id, String(paymentId)));

    const updatedPayment = await db.query.rentPayments.findFirst({
      where: eq(rentPayments.id, String(paymentId)),
    });

    try {
      const studentId = booking.studentId;
      await createNotification({
        userId: studentId,
        type: "rent_receipt_submitted",
        title: "تم استلام إيصال الإيجار",
        body: `تم استلام إيصال الإيجار بنجاح لشهر ${updatedPayment?.billingPeriod || ''} وجاري التحقق منه من الإدارة.`,
        referenceType: "booking",
        referenceId: String(bookingId),
      });

      await createNotification({
        userId: "admin",
        type: "admin_rent_receipt_review",
        title: "إيصال إيجار جديد يحتاج للمراجعة",
        body: `قام الطالب برفع إيصال دفع إيجار لشهر ${updatedPayment?.billingPeriod || ''} للوحدة السكنية للمراجعة.`,
        referenceType: "booking",
        referenceId: String(bookingId),
      });
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on rent payment upload:", notifErr);
    }

    res.json(mapOverdueStatus(updatedPayment));
  } catch (error) {
    req.log.error({ error }, "Failed to upload rent receipt");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/bookings/:bookingId/subscription/upload
 * Student uploads/re-uploads their 1200 EGP subscription receipt.
 */
router.post("/:bookingId/subscription/upload", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { receiptImageUrl } = req.body;
    const userId = req.dbUser!.id;

    const validation = await validatePrivateReceiptPath(receiptImageUrl, userId);
    if (!validation.isValid || !validation.cleanPath) {
      res.status(400).json({ error: "Bad Request", message: validation.errorMessage || "إيصال الاشتراك غير صالح" });
      return;
    }
    const cleanReceiptPath = validation.cleanPath;

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, String(bookingId)),
    });

    if (!booking) {
      res.status(404).json({ error: "Not Found", message: "Booking not found" });
      return;
    }

    // IDOR checking
    if (booking.studentId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "غير مصرح لك برفع إيصال لهذا الحجز" });
      return;
    }

    // Update booking subscription status to pending_review
    await db.update(bookings)
      .set({
        subscriptionStatus: "pending_review",
        subscriptionAmount: 1200,
        subscriptionReceiptUrl: cleanReceiptPath,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, String(bookingId)));

    // Also sync to user record
    await db.update(users)
      .set({
        subscriptionStatus: "pending_review",
        subscriptionAmount: 1200,
        subscriptionReceiptUrl: cleanReceiptPath,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    try {
      await createNotification({
        userId,
        type: "subscription_receipt_submitted",
        title: "تم استلام إيصال الاشتراك",
        body: "تم استلام إيصال إعادة رفع اشتراك مكاني بقيمة 1200 ج.م وجاري التحقق منه.",
        referenceType: "booking",
        referenceId: String(bookingId),
      });

      await createNotification({
        userId: "admin",
        type: "admin_new_subscription",
        title: "إيصال اشتراك جديد يحتاج إلى المراجعة",
        body: "تم إعادة رفع إيصال اشتراك جديد بقيمة 1200 ج.م للمراجعة والاعتماد.",
        referenceType: "booking",
        referenceId: String(bookingId),
      });
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on subscription re-upload:", notifErr);
    }

    const updated = await db.query.bookings.findFirst({
      where: eq(bookings.id, String(bookingId)),
      with: { property: true, student: true, rentPayments: true },
    });

    res.json(formatBooking(updated!));
  } catch (error) {
    req.log.error({ error }, "Failed to upload subscription receipt");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/bookings/:bookingId/rent-payments/:paymentId/approve
 * Admin approves a payment receipt.
 */
router.post("/:bookingId/rent-payments/:paymentId/approve", requireAuth, requireRole(["admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;
    const adminId = (req as any).user?.id || "admin";

    const payment = await db.query.rentPayments.findFirst({
      where: and(
        eq(rentPayments.id, String(paymentId)),
        eq(rentPayments.bookingId, String(bookingId))
      ),
    });

    if (!payment) {
      res.status(404).json({ error: "Not Found", message: "Rent payment record not found" });
      return;
    }

    await db.update(rentPayments)
      .set({
        status: "paid",
        paidAt: new Date(),
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rentPayments.id, String(paymentId)));

    const updatedPayment = await db.query.rentPayments.findFirst({
      where: eq(rentPayments.id, String(paymentId)),
    });

    try {
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, String(bookingId)),
      });
      if (booking) {
        await createNotification({
          userId: booking.studentId,
          type: "rent_payment_approved",
          title: "تم اعتماد إيصال الإيجار",
          body: `تم التحقق من إيصال دفع الإيجار الخاص بك واعتماده بنجاح لشهر ${updatedPayment?.billingPeriod || ''}.`,
          referenceType: "booking",
          referenceId: String(bookingId),
        });
      }
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on rent payment approval:", notifErr);
    }

    res.json(mapOverdueStatus(updatedPayment));
  } catch (error) {
    req.log.error({ error }, "Failed to approve rent payment");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/bookings/:bookingId/rent-payments/:paymentId/reject
 * Admin rejects a payment receipt.
 */
router.post("/:bookingId/rent-payments/:paymentId/reject", requireAuth, requireRole(["admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;

    const payment = await db.query.rentPayments.findFirst({
      where: and(
        eq(rentPayments.id, String(paymentId)),
        eq(rentPayments.bookingId, String(bookingId))
      ),
    });

    if (!payment) {
      res.status(404).json({ error: "Not Found", message: "Rent payment record not found" });
      return;
    }

    await db.update(rentPayments)
      .set({
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(rentPayments.id, String(paymentId)));

    const updatedPayment = await db.query.rentPayments.findFirst({
      where: eq(rentPayments.id, String(paymentId)),
    });

    try {
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, String(bookingId)),
      });
      if (booking) {
        await createNotification({
          userId: booking.studentId,
          type: "rent_payment_rejected",
          title: "تم رفض إيصال الإيجار",
          body: `عذراً، تم رفض إيصال دفع الإيجار الخاص بك لشهر ${updatedPayment?.billingPeriod || ''}. يرجى مراجعة التفاصيل وإعادة الرفع.`,
          referenceType: "booking",
          referenceId: String(bookingId),
        });
      }
    } catch (notifErr) {
      console.error("Failed to dispatch notifications on rent payment rejection:", notifErr);
    }

    res.json(mapOverdueStatus(updatedPayment));
  } catch (error) {
    req.log.error({ error }, "Failed to reject rent payment");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/bookings/:bookingId/rent-payments/:paymentId/manual-pay
 * Admin registers a manual rent payment.
 */
router.post("/:bookingId/rent-payments/:paymentId/manual-pay", requireAuth, requireRole(["admin", "super_admin"]), async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;
    const { amount, paidAt, paymentSource } = req.body;
    const adminId = (req as any).user?.id || "admin";

    const payment = await db.query.rentPayments.findFirst({
      where: and(
        eq(rentPayments.id, String(paymentId)),
        eq(rentPayments.bookingId, String(bookingId))
      ),
    });

    if (!payment) {
      res.status(404).json({ error: "Not Found", message: "Rent payment record not found" });
      return;
    }

    await db.update(rentPayments)
      .set({
        status: "paid",
        amount: typeof amount === "number" ? amount : payment.amount,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        paymentSource: paymentSource || "manual",
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rentPayments.id, String(paymentId)));

    const updatedPayment = await db.query.rentPayments.findFirst({
      where: eq(rentPayments.id, String(paymentId)),
    });

    res.json(mapOverdueStatus(updatedPayment));
  } catch (error) {
    req.log.error({ error }, "Failed to record manual rent payment");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
