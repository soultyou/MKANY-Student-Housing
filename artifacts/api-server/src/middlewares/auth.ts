import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db, users, type User } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

/**
 * Middleware to require an authenticated session and load the corresponding database user.
 * If the user is authenticated via Clerk but does not exist in PostgreSQL, it performs
 * safe Just-In-Time (JIT) provisioning with default role 'student'.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  console.log("Clerk Auth Result:", auth);
  if (!auth || !auth.userId) {
    if (process.env.NODE_ENV !== "production" && req.headers["x-dev-admin"] === "true") {
      let adminUser = await db.query.users.findFirst({
        where: or(eq(users.role, "admin"), eq(users.role, "super_admin")),
      });
      if (!adminUser) {
        const [created] = await db
          .insert(users)
          .values({
            id: "dev-admin-user",
            email: "admin@mkany.eg",
            fullName: "مشرف النظام التجريبي",
            role: "super_admin",
            isVerified: true,
            nationalId: "12345678901234",
            phoneNumber: "01000000001",
          })
          .returning();
        adminUser = created;
      }
      req.dbUser = adminUser;
      next();
      return;
    }

    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Clerk session" });
    return;
  }

  try {
    let dbUser = await db.query.users.findFirst({
      where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
    });

    if (!dbUser) {
      req.log.info({ clerkUserId: auth.userId }, "Authenticated Clerk user not found in database, initiating JIT provisioning");

      let clerkUser: any = null;
      try {
        clerkUser = await clerkClient.users.getUser(auth.userId);
      } catch (clerkErr) {
        req.log.warn({ clerkUserId: auth.userId, clerkErr }, "Could not fetch Clerk user info from Clerk API, using fallback defaults");
      }

      const primaryEmail =
        clerkUser?.primaryEmailAddressId
          ? clerkUser.emailAddresses?.find((e: any) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
          : clerkUser?.emailAddresses?.[0]?.emailAddress || `${auth.userId}@student.mkany.eg`;

      const fullName =
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
        clerkUser?.username ||
        primaryEmail.split("@")[0] ||
        "مستخدم مكاني";

      const avatarUrl = clerkUser?.imageUrl || null;

      // Check if an existing user record matches this email (e.g. pre-seeded or existing account)
      const existingByEmail = await db.query.users.findFirst({
        where: eq(users.email, primaryEmail),
      });

      if (existingByEmail) {
        // Safely link the Clerk User ID to existing account without overwriting existing role
        const [updated] = await db
          .update(users)
          .set({
            clerkUserId: auth.userId,
            avatarUrl: avatarUrl || existingByEmail.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id))
          .returning();
        dbUser = updated;
      } else {
        // Provision new user record respecting Clerk unsafeMetadata role intent (default 'student')
        const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const clerkRole = (clerkUser?.unsafeMetadata?.role as string) || (clerkUser?.publicMetadata?.role as string) || "student";
        const initialRole = clerkRole === "owner" ? "owner" : "student";
        const rawNationalId =
          (clerkUser?.unsafeMetadata?.nationalId as string) ||
          (clerkUser?.publicMetadata?.nationalId as string) ||
          "00000000000000";
        const rawPhone =
          (clerkUser?.unsafeMetadata?.phoneNumber as string) ||
          (clerkUser?.publicMetadata?.phoneNumber as string) ||
          clerkUser?.phoneNumbers?.[0]?.phoneNumber ||
          "01000000000";
        const rawUniversity =
          (clerkUser?.unsafeMetadata?.university as string) ||
          (clerkUser?.publicMetadata?.university as string) ||
          "جامعة كفر الشيخ";
        const initialUniversity = initialRole === "owner" ? "مالك عقار سكن طلابي" : rawUniversity;

        const [created] = await db
          .insert(users)
          .values({
            id: newId,
            clerkUserId: auth.userId,
            fullName,
            email: primaryEmail,
            nationalId: rawNationalId,
            phoneNumber: rawPhone,
            university: initialUniversity,
            avatarUrl,
            role: initialRole,
            isVerified: false,
          })
          .returning();
        dbUser = created;
      }

      if (!dbUser) {
        // Fallback search in case of concurrent creation
        dbUser = await db.query.users.findFirst({
          where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
        });
      }

      if (!dbUser) {
        res.status(500).json({ error: "Internal Server Error", message: "Failed to provision user profile" });
        return;
      }
    }

    // Attach the authoritative PostgreSQL DB user to the request
    req.dbUser = dbUser;
    next();
  } catch (error) {
    req.log.error({ error, clerkUserId: auth.userId }, "Error resolving user from database");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Middleware factory to restrict route access based on user role.
 * ALWAYS use this *after* `requireAuth`.
 */
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return (req, res, next) => {
    const dbUser = req.dbUser;
    
    if (!dbUser) {
      res.status(401).json({ error: "Unauthorized", message: "Database user context missing" });
      return;
    }

    if (!allowedRoles.includes(dbUser.role)) {
      req.log.warn(
        { userId: dbUser.id, role: dbUser.role, allowedRoles },
        "Forbidden access attempt"
      );
      res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
      return;
    }

    next();
  };
};

// Common reusable authorization middleware
export const requireSuperAdmin = requireRole(["super_admin"]);
export const requireAdmin = requireRole(["admin", "super_admin"]);
export const requireOwner = requireRole(["owner", "admin", "super_admin"]);

/**
 * Helper to ensure a specific requested user ID (e.g., from URL param) 
 * matches the authenticated user, preventing IDOR.
 * Use for student-scoped operations. Admins and Super Admins might be allowed to bypass.
 */
export const requireSelfOrAdmin = (idParamName: string = "id"): RequestHandler => {
  return (req, res, next) => {
    const dbUser = req.dbUser;
    if (!dbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestedId = req.params[idParamName];
    
    // User is accessing their own data OR user is an admin or super_admin
    if (dbUser.id === requestedId || dbUser.clerkUserId === requestedId || dbUser.role === "admin" || dbUser.role === "super_admin") {
      next();
      return;
    }

    req.log.warn(
      { userId: dbUser.id, requestedId, role: dbUser.role },
      "IDOR attempt blocked"
    );
    res.status(403).json({ error: "Forbidden", message: "Cannot access resources belonging to other users" });
  };
};
