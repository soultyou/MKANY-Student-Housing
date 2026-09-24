import { Router, type Request, type Response } from "express";
import { db, users, bookings, rentPayments, apartments } from "@workspace/db";
import { eq, or, and, isNotNull, inArray, desc } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middlewares/auth";
import { createNotification } from "../lib/notifications-helper";

const adminRouter = Router();

export function isPermanentSuperAdmin(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "soultyou@outlook.sa" || normalized === "soultyou@outlook.com";
}

/**
 * POST /api/admin/bootstrap-super-admin
 * Temporary bootstrap endpoint to set up the first Super Admin.
 * Permanently disables itself once a Super Admin with an attached Clerk user exists.
 */
adminRouter.post("/bootstrap-super-admin", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.dbUser;
    const auth = (req as any).auth;
    const clerkUserId = authUser?.clerkUserId || auth?.userId;

    // Check if an active Super Admin (with linked clerkUserId) already exists
    const existingActiveSuperAdmin = await db.query.users.findFirst({
      where: and(eq(users.role, "super_admin"), isNotNull(users.clerkUserId)),
    });

    if (existingActiveSuperAdmin && existingActiveSuperAdmin.clerkUserId !== clerkUserId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Super Admin is already bootstrapped",
      });
    }

    const targetEmail = "soultyou@outlook.sa";
    
    // Check if user record exists by email or clerkUserId or authUser id
    let userToPromote = await db.query.users.findFirst({
      where: or(
        eq(users.email, targetEmail),
        eq(users.email, "soultyou@outlook.com"),
        authUser?.id ? eq(users.id, authUser.id) : undefined,
        clerkUserId ? eq(users.clerkUserId, clerkUserId) : undefined
      ),
    });

    if (!userToPromote) {
      const [createdUser] = await db
        .insert(users)
        .values({
          id: authUser?.id || `usr_superadmin_${Date.now()}`,
          clerkUserId: clerkUserId || null,
          email: targetEmail,
          fullName: "ELFA7L kholio",
          role: "super_admin",
          isVerified: true,
          nationalId: "00000000000000",
          phoneNumber: "01000000000",
          university: "الإدارة المركزية",
        })
        .returning();
      userToPromote = createdUser;
    } else {
      const [updatedUser] = await db
        .update(users)
        .set({
          role: "super_admin",
          isVerified: true,
          fullName: "ELFA7L kholio",
          email: targetEmail,
          clerkUserId: clerkUserId || userToPromote.clerkUserId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userToPromote.id))
        .returning();
      userToPromote = updatedUser;
    }

    req.log.info({ userId: userToPromote.id, email: userToPromote.email }, "Bootstrapped first Super Admin");

    return res.json({
      success: true,
      message: "Super Admin bootstrapped successfully",
      user: userToPromote,
    });
  } catch (error) {
    req.log.error({ error }, "Failed to bootstrap super admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length < 6) return "****";
  return trimmed.slice(0, 4) + "****" + trimmed.slice(-3);
}

/**
 * GET /api/admin/admins
 * List all users with role 'admin' or 'super_admin'
 */
adminRouter.get("/admins", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const list = await db.query.users.findMany({
      where: inArray(users.role, ["admin", "super_admin"]),
      columns: {
        id: true,
        clerkUserId: true,
        fullName: true,
        email: true,
        role: true,
        phoneNumber: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [desc(users.createdAt)],
    });

    const sanitizedList = list.map((user: any) => ({
      ...user,
      phoneNumber: maskPhoneNumber(user.phoneNumber),
    }));

    return res.json(sanitizedList);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch admin list");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/admin/admins
 * Create/Pre-provision a new regular admin or super admin
 */
adminRouter.post("/admins", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { fullName, email, role, phoneNumber, nationalId, university } = req.body;

    if (!fullName || !email || !role) {
      return res.status(400).json({ error: "Bad Request", message: "fullName, email, and role are required" });
    }

    if (role !== "admin" && role !== "super_admin") {
      return res.status(400).json({ error: "Bad Request", message: "Invalid role specified" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existing) {
      return res.status(400).json({ error: "Conflict", message: "A user with this email already exists" });
    }

    const newId = `usr_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const [created] = await db
      .insert(users)
      .values({
        id: newId,
        clerkUserId: null, // Will be linked on first JIT login
        fullName,
        email: normalizedEmail,
        role,
        isVerified: true,
        phoneNumber: phoneNumber || "01000000000",
        nationalId: nationalId || "00000000000000",
        university: university || "الإدارة المركزية",
      })
      .returning({
        id: users.id,
        clerkUserId: users.clerkUserId,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const sanitizedCreated = {
      ...created,
      phoneNumber: maskPhoneNumber(created.phoneNumber),
    };

    req.log.info({ createdBy: req.dbUser?.id, createdId: created.id }, "Created new admin");
    return res.status(201).json(sanitizedCreated);
  } catch (error) {
    req.log.error({ error }, "Failed to create admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/admin/admins/:id
 * Update an admin's role, name, or verification status
 */
adminRouter.patch("/admins/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role, fullName, isVerified } = req.body;

    const userToUpdate = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!userToUpdate) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }

    // Security block: Prevent demoting or changing role of the permanent Super Admin
    if (isPermanentSuperAdmin(userToUpdate.email)) {
      if (role && role !== "super_admin") {
        return res.status(403).json({ error: "Forbidden", message: "The permanent Super Admin cannot be demoted" });
      }
    }

    // Build update object
    const updateData: any = {};
    if (role !== undefined) {
      if (role !== "admin" && role !== "super_admin" && role !== "student" && role !== "owner") {
        return res.status(400).json({ error: "Bad Request", message: "Invalid role specified" });
      }
      updateData.role = role;
    }
    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        clerkUserId: users.clerkUserId,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const sanitizedUpdated = {
      ...updated,
      phoneNumber: maskPhoneNumber(updated.phoneNumber),
    };

    req.log.info({ updatedBy: req.dbUser?.id, targetId: id }, "Updated admin details");

    if (isVerified !== undefined && isVerified !== userToUpdate.isVerified) {
      try {
        if (isVerified) {
          await createNotification({
            userId: userToUpdate.id,
            type: "user_verified",
            title: "تم قبول التحقق",
            body: "تم قبول التحقق من حسابك بنجاح.",
            referenceType: "user",
            referenceId: userToUpdate.id,
          });
        } else {
          await createNotification({
            userId: userToUpdate.id,
            type: "user_unverified",
            title: "تم رفض التحقق",
            body: "تم رفض طلب التحقق. يرجى مراجعة بيانات التحقق أو التواصل مع الدعم.",
            referenceType: "user",
            referenceId: userToUpdate.id,
          });
        }
      } catch (notifErr) {
        req.log.warn({ notifErr, targetUserId: userToUpdate.id }, "Failed to send verification status notification");
      }
    }

    return res.json(sanitizedUpdated);
  } catch (error) {
    req.log.error({ error }, "Failed to update admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * DELETE /api/admin/admins/:id
 * Delete a regular admin
 */
adminRouter.delete("/admins/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!userToDelete) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }

    // Security block: Prevent deleting the permanent Super Admin
    if (isPermanentSuperAdmin(userToDelete.email)) {
      return res.status(403).json({ error: "Forbidden", message: "The permanent Super Admin cannot be deleted" });
    }

    await db.delete(users).where(eq(users.id, id));

    req.log.info({ deletedBy: req.dbUser?.id, targetId: id }, "Deleted admin");
    return res.json({ success: true, message: "Admin user deleted successfully" });
  } catch (error) {
    req.log.error({ error }, "Failed to delete admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/admin/financial/summary
 * Returns fully aggregated real financial metrics for accounting & data analytics.
 * Strictly restricted to Admin and Super Admin roles.
 */
adminRouter.get("/financial/summary", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const yearFilter = req.query.year as string | undefined;
    const monthFilter = req.query.month as string | undefined;

    // Fetch raw authoritative datasets from PostgreSQL
    const allBookings = await db.query.bookings.findMany({
      with: {
        student: true,
      }
    });

    const allRentPayments = await db.query.rentPayments.findMany();

    const allApartments = await db.query.apartments.findMany({
      with: {
        bookings: true
      }
    });

    const allUsers = await db.query.users.findMany({
      where: eq(users.role, "student")
    });

    // 1. Subscription Metrics (Approved, Pending, Rejected, Pro)
    const approvedSubs = allBookings.filter((b: any) => b.subscriptionStatus === "approved");
    const pendingSubs = allBookings.filter((b: any) => b.subscriptionStatus === "pending_review");
    const rejectedSubs = allBookings.filter((b: any) => b.subscriptionStatus === "rejected");
    const proUsers = allUsers.filter((u: any) => u.subscriptionStatus === "approved");

    // 2. Rent Metrics (Paid, Due, Overdue, Pending Review, Rejected)
    const paidRent = allRentPayments.filter((p: any) => p.status === "paid");
    const dueRent = allRentPayments.filter((p: any) => p.status === "due");
    const overdueRent = allRentPayments.filter((p: any) => p.status === "overdue");
    const pendingRent = allRentPayments.filter((p: any) => p.status === "pending_review");
    const rejectedRent = allRentPayments.filter((p: any) => p.status === "rejected");

    const totalRentPaidAmount = paidRent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalRentDueAmount = dueRent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalRentOverdueAmount = overdueRent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalRentPendingAmount = pendingRent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalRentRejectedAmount = rejectedRent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // 3. Deposit Metrics
    const totalDepositsRequired = allBookings.reduce((sum: number, b: any) => sum + (b.depositAmount || 0), 0);
    const totalDepositsPaid = allBookings.filter((b: any) => b.depositStatus === "paid").reduce((sum: number, b: any) => sum + (b.depositAmount || 0), 0);
    const totalDepositsUnpaid = Math.max(0, totalDepositsRequired - totalDepositsPaid);

    // 4. Overall Revenue (Approved Subscription + Paid Rent + Paid Deposit)
    const subscriptionRevenue = approvedSubs.reduce((sum: number, b: any) => sum + (b.subscriptionAmount || 1200), 0);
    const totalRevenue = subscriptionRevenue + totalRentPaidAmount + totalDepositsPaid;

    // 5. Occupancy metrics based on existing authoritative calculations
    const totalPropertiesCount = allApartments.length;
    let availablePropertiesCount = 0;
    let reservedPropertiesCount = 0;
    let fullyBookedPropertiesCount = 0;

    let totalPlacesCapacity = 0;
    let totalPlacesOccupied = 0;

    allApartments.forEach((property: any) => {
      const capacity = property.bedrooms || 0;
      const currentRoommates = property.currentRoommates || 0;
      const propertyBookings = property.bookings || [];

      const activeBookingsCount = propertyBookings.filter((b: any) => b.status === "confirmed" || b.status === "pending_review").length;
      const occupiedPlaces = currentRoommates + activeBookingsCount;
      const availablePlaces = Math.max(0, capacity - occupiedPlaces);
      const isFull = availablePlaces <= 0;

      totalPlacesCapacity += capacity;
      totalPlacesOccupied += occupiedPlaces;

      if (isFull) {
        fullyBookedPropertiesCount++;
      } else {
        availablePropertiesCount++;
      }

      if (activeBookingsCount > 0) {
        reservedPropertiesCount++;
      }
    });

    const totalPlacesAvailable = Math.max(0, totalPlacesCapacity - totalPlacesOccupied);
    const occupancyRate = totalPlacesCapacity > 0 ? Math.round((totalPlacesOccupied / totalPlacesCapacity) * 100) : 0;

    // Apply Year and Month Filtering
    let filteredRevenue = totalRevenue;
    let filteredSubscriptionRevenue = subscriptionRevenue;
    let filteredCollectedRent = totalRentPaidAmount;
    let filteredDueRent = totalRentDueAmount;
    let filteredCollectedDeposit = totalDepositsPaid;

    const matchesFilter = (dateObj: Date | string | null | undefined, year: string | undefined, month: string | undefined): boolean => {
      if (!dateObj) return false;
      let d: Date;
      if (typeof dateObj === "string") {
        d = new Date(dateObj);
      } else {
        d = dateObj;
      }
      if (isNaN(d.getTime())) {
        if (typeof dateObj === "string") {
          const parts = dateObj.split("-");
          if (parts.length >= 2) {
            const y = parts[0];
            const m = parts[1];
            if (year && y !== year) return false;
            if (month && m !== month) return false;
            return true;
          }
        }
        return false;
      }
      const yStr = d.getFullYear().toString();
      const mStr = (d.getMonth() + 1).toString().padStart(2, "0");
      if (year && yStr !== year) return false;
      if (month && mStr !== month) return false;
      return true;
    };

    if (yearFilter || monthFilter) {
      const filteredApprovedSubs = approvedSubs.filter((b: any) => matchesFilter(b.subscriptionApprovedAt || b.createdAt, yearFilter, monthFilter));
      filteredSubscriptionRevenue = filteredApprovedSubs.reduce((sum: number, b: any) => sum + (b.subscriptionAmount || 1200), 0);

      const filteredPaidRent = paidRent.filter((p: any) => matchesFilter(p.paidAt || p.createdAt, yearFilter, monthFilter));
      filteredCollectedRent = filteredPaidRent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const filteredDueRentPayments = dueRent.filter((p: any) => {
        return matchesFilter(p.dueDate || p.createdAt, yearFilter, monthFilter);
      });
      filteredDueRent = filteredDueRentPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const filteredPaidDeposits = allBookings.filter((b: any) => b.depositStatus === "paid" && matchesFilter(b.depositPaidAt || b.createdAt, yearFilter, monthFilter));
      filteredCollectedDeposit = filteredPaidDeposits.reduce((sum: number, b: any) => sum + (b.depositAmount || 0), 0);

      filteredRevenue = filteredSubscriptionRevenue + filteredCollectedRent + filteredCollectedDeposit;
    }

    // Generate monthly revenue grouping data for standard chart
    const revenueItems: { amount: number, date: Date, type: string }[] = [];

    approvedSubs.forEach((b: any) => {
      const date = b.subscriptionApprovedAt || b.createdAt;
      if (date) {
        revenueItems.push({
          amount: b.subscriptionAmount || 1200,
          date: new Date(date),
          type: "subscription"
        });
      }
    });

    paidRent.forEach((p: any) => {
      const date = p.paidAt || p.createdAt;
      if (date) {
        revenueItems.push({
          amount: p.amount || 0,
          date: new Date(date),
          type: "rent"
        });
      }
    });

    allBookings.filter((b: any) => b.depositStatus === "paid").forEach((b: any) => {
      const date = b.depositPaidAt || b.createdAt;
      if (date) {
        revenueItems.push({
          amount: b.depositAmount || 0,
          date: new Date(date),
          type: "deposit"
        });
      }
    });

    const monthlyGroups: Record<string, { total: number, subscription: number, rent: number, deposit: number }> = {};
    revenueItems.forEach(item => {
      if (isNaN(item.date.getTime())) return;
      const yyyymm = `${item.date.getFullYear()}-${(item.date.getMonth() + 1).toString().padStart(2, "0")}`;
      if (!monthlyGroups[yyyymm]) {
        monthlyGroups[yyyymm] = { total: 0, subscription: 0, rent: 0, deposit: 0 };
      }
      monthlyGroups[yyyymm].total += item.amount;
      if (item.type === "subscription") monthlyGroups[yyyymm].subscription += item.amount;
      if (item.type === "rent") monthlyGroups[yyyymm].rent += item.amount;
      if (item.type === "deposit") monthlyGroups[yyyymm].deposit += item.amount;
    });

    const monthlyRevenueData = Object.keys(monthlyGroups).sort().map(month => {
      return {
        month,
        total: monthlyGroups[month].total,
        subscription: monthlyGroups[month].subscription,
        rent: monthlyGroups[month].rent,
        deposit: monthlyGroups[month].deposit,
      };
    });

    // Strictly returns aggregated metrics. Absolutely no PII exposed.
    return res.json({
      summary: {
        totalRevenue: filteredRevenue,
        subscriptionRevenue: filteredSubscriptionRevenue,
        collectedRent: filteredCollectedRent,
        dueRent: filteredDueRent,
        collectedDeposit: filteredCollectedDeposit,
        proUsersCount: proUsers.length,
        unfilteredTotalRevenue: totalRevenue,
        unfilteredSubscriptionRevenue: subscriptionRevenue,
        unfilteredCollectedRent: totalRentPaidAmount,
        unfilteredDueRent: totalRentDueAmount,
        unfilteredCollectedDeposit: totalDepositsPaid,
      },
      subscription: {
        approvedCount: approvedSubs.length,
        pendingCount: pendingSubs.length,
        rejectedCount: rejectedSubs.length,
        proMembersCount: proUsers.length,
        totalRevenue: subscriptionRevenue,
      },
      rent: {
        totalCollected: totalRentPaidAmount,
        totalDue: totalRentDueAmount,
        totalOverdue: totalRentOverdueAmount,
        paidCount: paidRent.length,
        dueCount: dueRent.length,
        overdueCount: overdueRent.length,
        pendingCount: pendingRent.length,
        rejectedCount: rejectedRent.length,
        totalRentPendingAmount,
        totalRentRejectedAmount
      },
      deposit: {
        totalRequired: totalDepositsRequired,
        totalPaid: totalDepositsPaid,
        totalUnpaid: totalDepositsUnpaid,
      },
      occupancy: {
        totalProperties: totalPropertiesCount,
        availableProperties: availablePropertiesCount,
        reservedProperties: reservedPropertiesCount,
        fullyBookedProperties: fullyBookedPropertiesCount,
        totalPlaces: totalPlacesCapacity,
        occupiedPlaces: totalPlacesOccupied,
        availablePlaces: totalPlacesAvailable,
        occupancyRate,
      },
      monthlyRevenueData,
      paymentStatusCounts: {
        paid: paidRent.length,
        pending_review: pendingRent.length,
        due: dueRent.length,
        overdue: overdueRent.length,
        rejected: rejectedRent.length,
      }
    });
  } catch (error) {
    req.log.error({ error }, "Failed to calculate financial analytics");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default adminRouter;
