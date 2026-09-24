import { Router, type Request, type Response } from "express";
import { db, users } from "@workspace/db";
import { eq, or, ilike, and, desc, ne } from "drizzle-orm";
import { requireAuth, requireAdmin, requireSuperAdmin } from "../middlewares/auth";
import { createNotification } from "../lib/notifications-helper";

const usersRouter = Router();

/**
 * GET /api/users
 * List users from PostgreSQL with optional filtering.
 * STRICTLY Admin-only: students and owners cannot view other users' records.
 */
usersRouter.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role, isVerified, search } = req.query;
    const conditions = [];

    if (role && typeof role === "string" && ["student", "owner", "admin", "super_admin"].includes(role)) {
      conditions.push(eq(users.role, role));
    }

    if (isVerified !== undefined && (isVerified === "true" || isVerified === "false")) {
      conditions.push(eq(users.isVerified, isVerified === "true"));
    }

    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(users.fullName, term),
          ilike(users.email, term),
          ilike(users.phoneNumber, term),
          ilike(users.nationalId, term),
          ilike(users.university, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allUsers = await db.query.users.findMany({
      where: whereClause,
      orderBy: [desc(users.createdAt)],
      columns: {
        id: true,
        clerkUserId: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        university: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(allUsers);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch users");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر جلب قائمة المستخدمين" });
  }
});

/**
 * GET /api/users/:id
 * Get single user verification and profile data.
 * Protected: Non-admin can ONLY view their own profile.
 */
usersRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id as string;
    const dbUser = req.dbUser!;

    // Non-admin can only access their own data
    if (dbUser.role !== "admin" && dbUser.role !== "super_admin" && dbUser.id !== targetId && dbUser.clerkUserId !== targetId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "لا يمكنك الوصول إلى بيانات مستخدم آخر",
      });
    }

    const userRecord = await db.query.users.findFirst({
      where: or(eq(users.id, targetId), eq(users.clerkUserId, targetId)),
      columns: {
        id: true,
        clerkUserId: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        university: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userRecord) {
      return res.status(404).json({ error: "Not Found", message: "المستخدم غير موجود" });
    }

    return res.json(userRecord);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch user");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/users/:id/verification
 * Privileged Admin endpoint to approve or revoke user account verification.
 * STRICTLY Admin-only: Students and Owners cannot self-verify or verify others.
 */
usersRouter.patch("/:id/verification", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id as string;
    const { isVerified } = req.body;

    if (typeof isVerified !== "boolean") {
      return res.status(400).json({
        error: "Bad Request",
        message: "حقل حالة التوثيق (isVerified) مطلوب ويجب أن يكون قيمة منطقية (true أو false)",
      });
    }

    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.id, targetId), eq(users.clerkUserId, targetId)),
    });

    if (!existingUser) {
      return res.status(404).json({ error: "Not Found", message: "المستخدم غير موجود" });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        isVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning({
        id: users.id,
        clerkUserId: users.clerkUserId,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        nationalId: users.nationalId,
        university: users.university,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    req.log.info(
      { adminId: req.dbUser!.id, targetUserId: existingUser.id, newIsVerified: isVerified },
      "Admin updated user account verification status"
    );

    try {
      if (isVerified) {
        await createNotification({
          userId: existingUser.id,
          type: "user_verified",
          title: "تم قبول التحقق",
          body: "تم قبول التحقق من حسابك بنجاح.",
          referenceType: "user",
          referenceId: existingUser.id,
        });
      } else {
        await createNotification({
          userId: existingUser.id,
          type: "user_unverified",
          title: "تم رفض التحقق",
          body: "تم رفض طلب التحقق. يرجى مراجعة بيانات التحقق أو التواصل مع الدعم.",
          referenceType: "user",
          referenceId: existingUser.id,
        });
      }
    } catch (notifErr) {
      req.log.warn({ notifErr, targetUserId: existingUser.id }, "Failed to send verification status notification");
    }

    return res.json(updatedUser);
  } catch (error) {
    req.log.error({ error }, "Failed to update user verification");
    return res.status(500).json({ error: "Internal Server Error", message: "فشل في تحديث حالة التوثيق" });
  }
});

/**
 * PATCH /api/users/:id/role
 * Promote, demote, or assign roles.
 * STRICTLY Super Admin only. Normal admins CANNOT manage roles or super admins.
 */
usersRouter.patch("/:id/role", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id as string;
    const { role } = req.body;

    const validRoles = ["student", "owner", "admin", "super_admin"];
    if (!role || typeof role !== "string" || !validRoles.includes(role)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "الدور المطلوب غير صالح. الدور يجب أن يكون: student, owner, admin, أو super_admin",
      });
    }

    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.id, targetId), eq(users.clerkUserId, targetId)),
    });

    if (!existingUser) {
      return res.status(404).json({ error: "Not Found", message: "المستخدم غير موجود" });
    }

    // Update role
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning({
        id: users.id,
        clerkUserId: users.clerkUserId,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        nationalId: users.nationalId,
        university: users.university,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    req.log.info(
      { superAdminId: req.dbUser!.id, targetUserId: existingUser.id, newRole: role },
      "Super Admin updated user role"
    );

    return res.json(updatedUser);
  } catch (error) {
    req.log.error({ error }, "Failed to update user role");
    return res.status(500).json({ error: "Internal Server Error", message: "فشل في تحديث دور المستخدم" });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user from PostgreSQL.
 * Admin or Super Admin.
 * Rules:
 * - Cannot delete self.
 * - Cannot delete super_admin.
 * - Normal admins CANNOT delete other admins (only super_admin can delete admins).
 */
usersRouter.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id as string;
    const currentAdmin = req.dbUser!;

    if (currentAdmin.id === targetId || currentAdmin.clerkUserId === targetId) {
      return res.status(400).json({ error: "Bad Request", message: "لا يمكنك حذف حسابك الإداري الحالي" });
    }

    const targetUser = await db.query.users.findFirst({
      where: or(eq(users.id, targetId), eq(users.clerkUserId, targetId)),
    });

    if (!targetUser) {
      return res.status(404).json({ error: "Not Found", message: "المستخدم غير موجود" });
    }

    if (targetUser.role === "super_admin") {
      return res.status(403).json({ error: "Forbidden", message: "لا يمكن حذف حساب المدير العام (super_admin)" });
    }

    if (targetUser.role === "admin" && currentAdmin.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden", message: "فقط المدير العام (super_admin) يمكنه حذف حسابات المشرفين" });
    }

    await db.delete(users).where(eq(users.id, targetUser.id));

    req.log.info({ adminId: currentAdmin.id, deletedUserId: targetUser.id }, "Admin deleted user account");
    return res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Failed to delete user");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default usersRouter;
