import { Router, type Request, type Response } from "express";
import { db, favorites, apartments } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

/**
 * GET /api/favorites
 * List all favorites for the authenticated student.
 * Owners and Admins receive 403 Forbidden.
 */
router.get("/", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;

    const studentFavorites = await db.query.favorites.findMany({
      where: eq(favorites.studentId, studentId),
      with: {
        property: {
          with: {
            photos: true,
          },
        },
      },
      orderBy: [desc(favorites.createdAt)],
    });

    // Exclude any properties that might have been removed, ensuring student visibility rules
    const validFavorites = studentFavorites.filter((fav: any) => fav.property != null);

    res.json({
      favorites: validFavorites,
      propertyIds: validFavorites.map((fav: any) => fav.propertyId),
    });
  } catch (error) {
    req.log.error({ error }, "Failed to fetch student favorites");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في جلب قائمة المفضلة" });
  }
});

/**
 * POST /api/favorites
 * Add an approved property to the authenticated student's favorites.
 * Rejects client-supplied studentId (uses req.dbUser.id).
 * Rejects unapproved or unavailable properties.
 * Protects against duplicate favorites (returns 409).
 */
router.post("/", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;
    const { propertyId } = req.body;

    const parsedPropertyId = Number(propertyId);
    if (!parsedPropertyId || isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
      res.status(400).json({ error: "Bad Request", message: "معرّف العقار مطلوب وغير صالح" });
      return;
    }

    // 1. Verify property exists in PostgreSQL
    const property = await db.query.apartments.findFirst({
      where: eq(apartments.id, parsedPropertyId),
    });

    if (!property) {
      res.status(404).json({ error: "Not Found", message: "العقار غير موجود" });
      return;
    }

    // 2. Property visibility rule: Students can only favorite approved + available properties
    // Pending ("قيد المراجعة") or unverified properties cannot be favorited
    if (property.status !== "متاح" || !property.verified) {
      res.status(400).json({ 
        error: "Bad Request", 
        message: "لا يمكن إضافة عقار غير معتمد أو غير متاح للمفضلة" 
      });
      return;
    }

    // 3. Duplicate protection: Check if already favorited
    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.studentId, studentId),
        eq(favorites.propertyId, parsedPropertyId)
      ),
    });

    if (existing) {
      res.status(409).json({ 
        error: "Conflict", 
        message: "العقار مضاف إلى المفضلة بالفعل",
        favorite: existing 
      });
      return;
    }

    // 4. Create favorite record
    const newId = `fav_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const [newFavorite] = await db.insert(favorites).values({
      id: newId,
      studentId,
      propertyId: parsedPropertyId,
      createdAt: new Date(),
    }).returning();

    res.status(201).json(newFavorite);
  } catch (error) {
    req.log.error({ error }, "Failed to add favorite");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في إضافة العقار للمفضلة" });
  }
});

/**
 * DELETE /api/favorites/:propertyId
 * Remove a property from the authenticated student's favorites.
 * Strict IDOR protection: only deletes favorites belonging to req.dbUser.id.
 */
router.delete("/:propertyId", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;
    const parsedPropertyId = Number(req.params.propertyId);

    if (!parsedPropertyId || isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
      res.status(400).json({ error: "Bad Request", message: "معرّف العقار غير صالح" });
      return;
    }

    // Check if favorite exists for this student
    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.studentId, studentId),
        eq(favorites.propertyId, parsedPropertyId)
      ),
    });

    if (!existing) {
      res.status(404).json({ error: "Not Found", message: "العقار غير موجود في قائمة مفضلتك" });
      return;
    }

    // Secure deletion enforcing student ownership
    await db.delete(favorites).where(
      and(
        eq(favorites.studentId, studentId),
        eq(favorites.propertyId, parsedPropertyId)
      )
    );

    res.json({ 
      success: true, 
      message: "تمت إزالة العقار من المفضلة بنجاح", 
      propertyId: parsedPropertyId 
    });
  } catch (error) {
    req.log.error({ error }, "Failed to remove favorite");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في إزالة العقار من المفضلة" });
  }
});

export default router;
