import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
import { clerkClient } from "@clerk/express";

const profileRouter = Router();

// Secure all profile routes
profileRouter.use(requireAuth);

profileRouter.get("/", (req, res) => {
  // Return current user's profile
  res.json(req.dbUser);
});

profileRouter.patch("/", async (req, res) => {
  const dbUser = req.dbUser;
  if (!dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Security check: Students and Owners cannot self-verify or modify privileged fields
  if ("isVerified" in req.body || "verified" in req.body || "role" in req.body) {
    res.status(403).json({
      error: "Forbidden",
      message: "لا يمكن تعديل الحقول الأمنية المحمية (isVerified, verified, role) - التوثيق يتم حصراً بواسطة المشرفين",
    });
    return;
  }

  const result = UpdateProfileBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Bad Request", issues: result.error.format() });
    return;
  }

  const { fullName, nationalId, phoneNumber, university, avatarUrl } = result.data;

  // Prevent resetting sentinel values or empty values that could be exploited to re-trigger onboarding
  if (nationalId !== undefined && nationalId.trim() === "00000000000000") {
    res.status(400).json({ error: "Bad Request", message: "Cannot reset national ID to placeholder value" });
    return;
  }
  if (phoneNumber !== undefined && phoneNumber.trim() === "01000000000") {
    res.status(400).json({ error: "Bad Request", message: "Cannot reset phone number to placeholder value" });
    return;
  }

  // Explicitly sanitize update payload to prevent any possibility of role/isVerified/id/clerkUserId manipulation
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (fullName !== undefined) updateData.fullName = fullName;
  if (nationalId !== undefined) updateData.nationalId = nationalId;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (university !== undefined) updateData.university = university;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  try {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, dbUser.id))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(updatedUser);
  } catch (error) {
    req.log.error({ error, clerkUserId: dbUser.clerkUserId }, "Failed to update profile");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

profileRouter.post("/onboarding", async (req, res) => {
  const dbUser = req.dbUser;
  if (!dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Security check 1: Admin, Owner, or Student with real completed data cannot re-run onboarding to alter roles.
  const isStudentCompleted = dbUser.role === "student" && dbUser.nationalId !== "00000000000000" && dbUser.phoneNumber !== "01000000000";
  if (dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "owner" || isStudentCompleted) {
    res.status(403).json({ error: "Forbidden", message: "Onboarding already completed for this account" });
    return;
  }

  const { accountType, fullName, nationalId, phoneNumber, university, avatarUrl } = req.body || {};

  if (!accountType || (accountType !== "student" && accountType !== "owner")) {
    res.status(400).json({ error: "Bad Request", message: "Invalid account type. Must be 'student' or 'owner'." });
    return;
  }

  // Security check 2: Prevent any student account that has established profile data or without owner signup intent from converting to owner
  if (dbUser.role === "student" && accountType === "owner") {
    if (dbUser.nationalId !== "00000000000000" || dbUser.phoneNumber !== "01000000000") {
      res.status(403).json({ error: "Forbidden", message: "Existing Student account cannot be converted to Owner" });
      return;
    }
    try {
      const clerkUser = await clerkClient.users.getUser(dbUser.clerkUserId);
      const clerkRole = (clerkUser?.unsafeMetadata?.role as string) || (clerkUser?.publicMetadata?.role as string);
      if (clerkRole !== "owner") {
        res.status(403).json({ error: "Forbidden", message: "Unauthorized account type conversion attempt to owner" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Forbidden", message: "Could not verify account creation intent" });
      return;
    }
  }

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 3) {
    res.status(400).json({ error: "Bad Request", message: "Full name must be at least 3 characters." });
    return;
  }

  if (!phoneNumber || typeof phoneNumber !== "string" || !/^(01[0125]\d{8}|\+201[0125]\d{8})$/.test(phoneNumber.trim())) {
    res.status(400).json({ error: "Bad Request", message: "Invalid Egyptian phone number format (e.g., 01012345678)." });
    return;
  }

  const updateData: Record<string, any> = {
    fullName: fullName.trim(),
    phoneNumber: phoneNumber.trim(),
    updatedAt: new Date(),
  };

  if (avatarUrl && typeof avatarUrl === "string") {
    updateData.avatarUrl = avatarUrl;
  }

  if (accountType === "student") {
    if (!nationalId || typeof nationalId !== "string" || !/^\d{14}$/.test(nationalId.trim())) {
      res.status(400).json({ error: "Bad Request", message: "National ID must be exactly 14 digits." });
      return;
    }
    if (!university || typeof university !== "string" || university.trim().length < 2) {
      res.status(400).json({ error: "Bad Request", message: "University name is required for student accounts." });
      return;
    }
    updateData.nationalId = nationalId.trim();
    updateData.university = university.trim();
    updateData.role = "student";
  } else if (accountType === "owner") {
    updateData.university = "مالك عقار سكن طلابي";
    updateData.nationalId = nationalId && /^\d{14}$/.test(nationalId.trim()) ? nationalId.trim() : "00000000000000";
    updateData.role = "owner";
  }

  try {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, dbUser.id))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    req.log.info({ userId: updatedUser.id, role: updatedUser.role }, "Completed user onboarding successfully");
    res.json(updatedUser);
  } catch (error) {
    req.log.error({ error, userId: dbUser.id }, "Failed to complete onboarding");
    res.status(500).json({ 
      error: "Internal Server Error",
      message: "An unexpected error occurred during onboarding."
    });
  }
});

export default profileRouter;
