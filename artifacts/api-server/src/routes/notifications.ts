import { Router, type Request, type Response } from "express";
import { db, notifications } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

/**
 * GET /api/notifications
 * Retrieve notifications for the authenticated user based on role separation.
 * Admins/super_admins see admin-directed notifications.
 * Students and Owners see their own notifications.
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const dbUser = req.dbUser!;
    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin";
    
    // Admins retrieve notifications where userId === "admin"
    // Students/owners retrieve notifications where userId === their user ID
    const targetUserId = isAdmin ? "admin" : dbUser.id;

    const list = await db.query.notifications.findMany({
      where: eq(notifications.userId, targetUserId),
      orderBy: [desc(notifications.createdAt)],
    });

    res.json(list);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch notifications");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في جلب الإشعارات" });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user's scope.
 */
router.patch("/read-all", requireAuth, async (req: Request, res: Response) => {
  try {
    const dbUser = req.dbUser!;
    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin";
    const targetUserId = isAdmin ? "admin" : dbUser.id;

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, targetUserId));

    res.json({ success: true, message: "تم تحديد جميع الإشعارات كمقروءة" });
  } catch (error) {
    req.log.error({ error }, "Failed to mark all notifications as read");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في تحديد الإشعارات كمقروءة" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read with strict IDOR ownership checks.
 */
router.patch("/:id/read", requireAuth, async (req: Request, res: Response) => {
  try {
    const dbUser = req.dbUser!;
    const notificationId = Number(req.params.id);

    if (isNaN(notificationId) || notificationId <= 0) {
      res.status(400).json({ error: "Bad Request", message: "معرّف الإشعار غير صالح" });
      return;
    }

    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId),
    });

    if (!notification) {
      res.status(404).json({ error: "Not Found", message: "الإشعار غير موجود" });
      return;
    }

    // IDOR Protection: Check notification ownership
    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin";
    const targetUserId = isAdmin ? "admin" : dbUser.id;

    if (notification.userId !== targetUserId) {
      req.log.warn(
        { userId: dbUser.id, notificationId, notificationOwner: notification.userId },
        "IDOR blocked on notification read"
      );
      res.status(403).json({ error: "Forbidden", message: "غير مسموح لك بتعديل هذا الإشعار" });
      return;
    }

    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    res.json(updated);
  } catch (error) {
    req.log.error({ error }, "Failed to mark notification as read");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في تحديد الإشعار كمقروء" });
  }
});

export default router;
