import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "node:path";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export const STORAGE_BUCKET_NAME = "mkany-property-images";
export const PRIVATE_STORAGE_BUCKET_NAME = "mkany-private-files";

let supabaseClient: SupabaseClient | null = null;

/**
 * Derives the Supabase project URL from SUPABASE_URL or DATABASE_URL
 */
export function getSupabaseUrl(): string | null {
  if (process.env.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      if (u.hostname.includes("supabase.co")) {
        const parts = u.hostname.split(".");
        const projectRef = parts[1];
        return `https://${projectRef}.supabase.co`;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Gets the Supabase service role key or API key from environment
 */
export function getSupabaseKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    null
  );
}

/**
 * Checks whether Supabase Storage API is configured
 */
export function isSupabaseStorageConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(url && key);
}

/**
 * Lazily initializes and returns the server-side Supabase client
 */
export function getSupabaseStorageClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();

    if (!url || !key) {
      throw new Error(
        "Supabase Storage credentials are missing (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY). Please configure them in environment settings."
      );
    }

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

let publicBucketEnsured = false;
let privateBucketEnsured = false;

/**
 * Ensures the public dedicated bucket exists in Supabase Storage
 */
export async function ensureStorageBucket(): Promise<void> {
  if (publicBucketEnsured) return;

  const client = getSupabaseStorageClient();
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === STORAGE_BUCKET_NAME || b.id === STORAGE_BUCKET_NAME);
    if (!exists) {
      const { error: createError } = await client.storage.createBucket(STORAGE_BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/avif"],
      });
      if (createError && !createError.message.includes("already exists")) {
        // Fallback to direct SQL insertion into storage.buckets
        await db.execute(sql`
          INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
          VALUES (${STORAGE_BUCKET_NAME}, ${STORAGE_BUCKET_NAME}, true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/avif'])
          ON CONFLICT (id) DO UPDATE SET public = true;
        `).catch((sqlErr: any) => {
          console.warn("[Supabase Storage] Public bucket SQL creation fallback failed:", sqlErr?.message);
        });
      }
    }
    publicBucketEnsured = true;
  } catch (err) {
    console.warn("[Supabase Storage] Public bucket initialization warning:", err);
  }
}

/**
 * Ensures the private dedicated bucket exists in Supabase Storage (public: false)
 */
export async function ensurePrivateStorageBucket(): Promise<void> {
  if (privateBucketEnsured) return;

  const client = getSupabaseStorageClient();
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === PRIVATE_STORAGE_BUCKET_NAME || b.id === PRIVATE_STORAGE_BUCKET_NAME);
    if (!exists) {
      const { error: createError } = await client.storage.createBucket(PRIVATE_STORAGE_BUCKET_NAME, {
        public: false, // Private bucket - no direct public access
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/jpg",
          "image/avif",
          "application/pdf",
        ],
      });
      if (createError && !createError.message.includes("already exists")) {
        // Fallback to direct SQL insertion into storage.buckets
        await db.execute(sql`
          INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
          VALUES (${PRIVATE_STORAGE_BUCKET_NAME}, ${PRIVATE_STORAGE_BUCKET_NAME}, false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/avif', 'application/pdf'])
          ON CONFLICT (id) DO UPDATE SET public = false;
        `).catch((sqlErr: any) => {
          console.warn("[Supabase Storage] Private bucket SQL creation fallback failed:", sqlErr?.message);
        });
      }
    }

    privateBucketEnsured = true;
  } catch (err) {
    console.warn("[Supabase Storage] Private bucket initialization warning:", err);
  }
}

/**
 * Validates file signature (magic numbers) and extension for file security
 */
export function validateFileContent(
  buffer: Buffer,
  originalname: string,
  category: "public_image" | "private_document"
): { isValid: boolean; detectedMime: string; cleanExt: string } {
  if (!buffer || buffer.length === 0) {
    throw new Error("ملف فارغ أو مفقود");
  }

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت)");
  }

  const rawExt = path.extname(originalname).toLowerCase().replace(/[^a-z0-9]/g, "");
  let cleanExt = rawExt ? `.${rawExt}` : ".jpg";

  let detectedMime = "";

  // Check Magic Bytes
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedMime = "image/jpeg";
    cleanExt = ".jpg";
  } else if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    detectedMime = "image/png";
    cleanExt = ".png";
  } else if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    detectedMime = "image/webp";
    cleanExt = ".webp";
  } else if (category === "private_document" && buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    detectedMime = "application/pdf";
    cleanExt = ".pdf";
  } else if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    detectedMime = "image/avif";
    cleanExt = ".avif";
  } else {
    throw new Error("نوع الملف غير مدعوم أو غير صالح. يُسمح فقط بالصور (JPEG, PNG, WebP, AVIF)" + (category === "private_document" ? " وملفات PDF." : "."));
  }

  if (category === "public_image" && detectedMime === "application/pdf") {
    throw new Error("ملفات PDF غير مسموح بها لصور العقارات العامة");
  }

  return { isValid: true, detectedMime, cleanExt };
}

export interface UploadedImageResult {
  url: string;
  path: string;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * Uploads a public property image file buffer directly to Supabase Storage (public bucket)
 */
export async function uploadImageToSupabase(file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}): Promise<UploadedImageResult> {
  const client = getSupabaseStorageClient();
  await ensureStorageBucket();

  const { detectedMime, cleanExt } = validateFileContent(file.buffer, file.originalname, "public_image");

  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const storagePath = `properties/prop_${uniqueId}${cleanExt}`;

  const { error: uploadError } = await client.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: detectedMime,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`فشل رفع الصورة لمتجر التخزين العام: ${uploadError.message}`);
  }

  const { data } = client.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    throw new Error("تعذر استخراج رابط الصورة العام من متجر التخزين");
  }

  return {
    url: data.publicUrl,
    path: storagePath,
    filename: path.basename(file.originalname),
    mimetype: detectedMime,
    size: file.size,
  };
}

export interface UploadedPrivateFileResult {
  url: string;
  path: string;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * Uploads a private file buffer (receipts, verification documents) to Supabase Storage (private bucket)
 */
export async function uploadPrivateFileToSupabase(
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  },
  category: "receipts" | "verification" | "private_documents" = "receipts"
): Promise<UploadedPrivateFileResult> {
  const client = getSupabaseStorageClient();
  await ensurePrivateStorageBucket();

  const { detectedMime, cleanExt } = validateFileContent(file.buffer, file.originalname, "private_document");

  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const storagePath = `${category}/${category}_${uniqueId}${cleanExt}`;

  const { error: uploadError } = await client.storage
    .from(PRIVATE_STORAGE_BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: detectedMime,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`فشل رفع المستند إلى التخزين الخاص المشفر: ${uploadError.message}`);
  }

  // Generate short-lived signed URL (1 hour) for immediate preview by uploader
  const { data: signedData, error: signedErr } = await client.storage
    .from(PRIVATE_STORAGE_BUCKET_NAME)
    .createSignedUrl(storagePath, 3600);

  const viewUrl = signedData?.signedUrl || `/api/upload/private/view?path=${encodeURIComponent(storagePath)}`;

  return {
    url: viewUrl,
    path: storagePath,
    filename: path.basename(file.originalname),
    mimetype: detectedMime,
    size: file.size,
  };
}

/**
 * Generates a short-lived signed URL for accessing a private storage file
 */
export async function getPrivateFileSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  try {
    const client = getSupabaseStorageClient();
    await ensurePrivateStorageBucket();

    // Sanitize path to prevent path traversal
    const cleanPath = storagePath.replace(/^\/+/, "").replace(/\.\.+/g, "");

    const { data, error } = await client.storage
      .from(PRIVATE_STORAGE_BUCKET_NAME)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn("[Supabase Storage] Signed URL generation failed:", error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("[Supabase Storage] Error generating signed URL:", err);
    return null;
  }
}

/**
 * Downloads private file buffer from private bucket
 */
export async function downloadPrivateFile(storagePath: string): Promise<{ data: Blob | null; error: any }> {
  try {
    const client = getSupabaseStorageClient();
    await ensurePrivateStorageBucket();
    const cleanPath = storagePath.replace(/^\/+/, "").replace(/\.\.+/g, "");
    const res = await client.storage.from(PRIVATE_STORAGE_BUCKET_NAME).download(cleanPath);
    return { data: res.data, error: res.error };
  } catch (err) {
    return { data: null, error: err };
  }
}

