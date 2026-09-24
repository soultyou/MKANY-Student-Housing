import { Router, type Request, type Response } from "express";
import multer from "multer";
import {
  uploadImageToSupabase,
  uploadPrivateFileToSupabase,
  getPrivateFileSignedUrl,
  downloadPrivateFile,
  isSupabaseStorageConfigured,
  STORAGE_BUCKET_NAME,
  PRIVATE_STORAGE_BUCKET_NAME,
} from "../lib/supabase-storage";
import { requireAuth } from "../middlewares/auth";
import { db, bookings, rentPayments, users } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";

const router = Router();

// In-memory storage ONLY - Max 10MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    // Basic pre-filter check
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مسموح به. يُسمح فقط بالصور (JPEG, PNG, WebP, AVIF) وملفات PDF"));
    }
  },
});

/**
 * POST /api/upload/single
 * Upload public property image to Supabase Storage (mkany-property-images)
 */
router.post("/single", requireAuth, upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Bad Request", message: "يرجى تحديد ملف صورة للعقار" });
    }

    if (!isSupabaseStorageConfigured()) {
      return res.status(503).json({
        error: "Storage Service Unavailable",
        message: "خدمة التخزين العام غير مهيأة على السيرفر",
        bucket: STORAGE_BUCKET_NAME,
      });
    }

    const result = await uploadImageToSupabase({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    return res.status(201).json({
      url: result.url,
      path: result.path,
      filename: result.filename,
      mimetype: result.mimetype,
      size: result.size,
      bucket: STORAGE_BUCKET_NAME,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error uploading property image");
    return res.status(400).json({
      error: "Upload Failed",
      message: error?.message || "فشل رفع الصورة لمتجر العقارات العام",
    });
  }
});

/**
 * POST /api/upload/multiple
 * Upload multiple public property images to Supabase Storage (mkany-property-images)
 */
router.post("/multiple", requireAuth, upload.array("images", 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Bad Request", message: "يرجى اختيار ملفات الصور المراد رفعها" });
    }

    if (!isSupabaseStorageConfigured()) {
      return res.status(503).json({
        error: "Storage Service Unavailable",
        message: "خدمة التخزين العام غير مهيأة على السيرفر",
        bucket: STORAGE_BUCKET_NAME,
      });
    }

    const uploadPromises = files.map((file) =>
      uploadImageToSupabase({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })
    );

    const results = await Promise.all(uploadPromises);

    return res.status(201).json({
      urls: results.map((r) => r.url),
      files: results,
      bucket: STORAGE_BUCKET_NAME,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error uploading multiple images");
    return res.status(400).json({
      error: "Upload Failed",
      message: error?.message || "فشل رفع صور العقارات",
    });
  }
});

/**
 * POST /api/upload/private/receipt
 * Secure private receipt file upload (mkany-private-files)
 * For booking receipts, monthly rent receipts, and subscription receipts
 */
router.post("/private/receipt", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file || ((req.files as any)?.[0]);
    if (!file) {
      return res.status(400).json({ error: "Bad Request", message: "يرجى اختيار سكرين شات إيصال الدفع" });
    }

    if (!isSupabaseStorageConfigured()) {
      return res.status(503).json({
        error: "Storage Service Unavailable",
        message: "خدمة التخزين المشفر الخاص غير مهيأة على السيرفر",
        bucket: PRIVATE_STORAGE_BUCKET_NAME,
      });
    }

    const result = await uploadPrivateFileToSupabase(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      "receipts"
    );

    return res.status(201).json({
      url: result.url,
      path: result.path,
      filename: result.filename,
      mimetype: result.mimetype,
      size: result.size,
      bucket: PRIVATE_STORAGE_BUCKET_NAME,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error uploading private receipt file");
    return res.status(400).json({
      error: "Upload Failed",
      message: error?.message || "فشل رفع إيصال الدفع للتخزين المشفر",
    });
  }
});

/**
 * POST /api/upload/private/verification
 * Secure private verification document upload (mkany-private-files)
 */
router.post("/private/verification", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Bad Request", message: "يرجى اختيار وثيقة التوثيق" });
    }

    const result = await uploadPrivateFileToSupabase(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      "verification"
    );

    return res.status(201).json({
      url: result.url,
      path: result.path,
      filename: result.filename,
      mimetype: result.mimetype,
      size: result.size,
      bucket: PRIVATE_STORAGE_BUCKET_NAME,
    });
  } catch (error: any) {
    req.log.error({ error }, "Error uploading verification document");
    return res.status(400).json({
      error: "Upload Failed",
      message: error?.message || "فشل رفع وثيقة التوثيق",
    });
  }
});

/**
 * GET /api/upload/private/url
 * Returns a short-lived signed URL for accessing a private receipt file.
 * Strictly checks role and ownership permissions.
 */
router.get("/private/url", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.dbUser!;
    const rawPath = req.query.path as string;

    if (!rawPath || typeof rawPath !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "مسار الملف مطلوب" });
    }

    // Handle legacy or external public URLs cleanly
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      return res.json({ url: rawPath });
    }

    const cleanPath = rawPath.replace(/^\/+/, "").replace(/\.\.+/g, "");

    // Owners are STRICTLY forbidden from viewing student payment receipts
    if (user.role === "owner") {
      return res.status(403).json({
        error: "Forbidden",
        message: "غير مصرح للملاك بالوصول إلى إيصالات وبطاقات الطلاب الخاصة",
      });
    }

    let isAuthorized = user.role === "admin" || user.role === "super_admin";

    if (!isAuthorized && user.role === "student") {
      // Check if student owns the booking or rent payment referencing this receipt path
      const [userBooking, userRentPayment, userRecord] = await Promise.all([
        db.query.bookings.findFirst({
          where: and(
            eq(bookings.studentId, user.id),
            or(eq(bookings.receiptImageUrl, cleanPath), eq(bookings.subscriptionReceiptUrl, cleanPath))
          ),
        }),
        db.query.rentPayments.findFirst({
          where: eq(rentPayments.receiptImageUrl, cleanPath),
          with: { booking: true },
        }),
        db.query.users.findFirst({
          where: and(
            eq(users.id, user.id),
            or(eq(users.subscriptionReceiptUrl, cleanPath), eq(users.avatarUrl, cleanPath))
          ),
        }),
      ]);

      const isRentPaymentOwner = userRentPayment?.booking?.studentId === user.id;

      if (userBooking || isRentPaymentOwner || userRecord) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Forbidden",
        message: "ليس لديك صلاحية للوصول إلى هذا الملف الخاص",
      });
    }

    const signedUrl = await getPrivateFileSignedUrl(cleanPath, 3600);
    if (!signedUrl) {
      return res.status(404).json({ error: "Not Found", message: "الملف غير موجود في التخزين الخاص" });
    }

    return res.json({ url: signedUrl, path: cleanPath });
  } catch (error: any) {
    req.log.error({ error }, "Error fetching private file signed URL");
    return res.status(500).json({ error: "Internal Server Error", message: "حدث خطأ أثناء إصدار رابط الملف الخاص" });
  }
});

/**
 * GET /api/upload/private/view
 * Securely streams or redirects (302) authorized users to the signed private file URL
 */
router.get("/private/view", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.dbUser!;
    const rawPath = req.query.path as string;

    if (!rawPath || typeof rawPath !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "مسار الملف مطلوب" });
    }

    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      return res.redirect(302, rawPath);
    }

    const cleanPath = rawPath.replace(/^\/+/, "").replace(/\.\.+/g, "");

    if (user.role === "owner") {
      return res.status(403).json({
        error: "Forbidden",
        message: "غير مصرح للملاك بالوصول إلى إيصالات وبطاقات الطلاب الخاصة",
      });
    }

    let isAuthorized = user.role === "admin" || user.role === "super_admin";

    if (!isAuthorized && user.role === "student") {
      const [userBooking, userRentPayment, userRecord] = await Promise.all([
        db.query.bookings.findFirst({
          where: and(
            eq(bookings.studentId, user.id),
            or(eq(bookings.receiptImageUrl, cleanPath), eq(bookings.subscriptionReceiptUrl, cleanPath))
          ),
        }),
        db.query.rentPayments.findFirst({
          where: eq(rentPayments.receiptImageUrl, cleanPath),
          with: { booking: true },
        }),
        db.query.users.findFirst({
          where: and(
            eq(users.id, user.id),
            or(eq(users.subscriptionReceiptUrl, cleanPath), eq(users.avatarUrl, cleanPath))
          ),
        }),
      ]);

      const isRentPaymentOwner = userRentPayment?.booking?.studentId === user.id;

      if (userBooking || isRentPaymentOwner || userRecord) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Forbidden",
        message: "ليس لديك صلاحية للوصول إلى هذا الملف الخاص",
      });
    }

    const signedUrl = await getPrivateFileSignedUrl(cleanPath, 3600);
    if (!signedUrl) {
      return res.status(404).json({ error: "Not Found", message: "الملف غير موجود في التخزين الخاص" });
    }

    return res.redirect(302, signedUrl);
  } catch (error: any) {
    req.log.error({ error }, "Error viewing private file");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر عرض الملف الخاص" });
  }
});

export default router;

