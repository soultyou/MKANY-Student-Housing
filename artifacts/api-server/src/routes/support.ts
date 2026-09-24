import { Router, type Request, type Response } from "express";
import { 
  db, 
  supportConversations, 
  supportMessages, 
  users 
} from "@workspace/db";
import { eq, and, desc, asc, ilike, or } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { createNotification } from "../lib/notifications-helper";

const router = Router();

export const VALID_SUPPORT_CATEGORIES = [
  "booking",
  "payment",
  "property",
  "inspection",
  "verification",
  "account",
  "technical",
  "other",
] as const;

export const VALID_SUPPORT_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

export const VALID_SUPPORT_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export type SupportCategory = typeof VALID_SUPPORT_CATEGORIES[number];
export type SupportStatus = typeof VALID_SUPPORT_STATUSES[number];
export type SupportPriority = typeof VALID_SUPPORT_PRIORITIES[number];

/**
 * Format support message for API responses
 */
function formatSupportMessage(m: any) {
  if (!m) return m;
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderUserId: m.senderUserId,
    senderRole: m.senderRole,
    body: m.body,
    createdAt: m.createdAt,
    senderName: m.sender?.fullName || (m.senderRole === "admin" ? "فريق دعم مكاني" : "المستخدم"),
    senderAvatar: m.sender?.avatarUrl || null,
  };
}

/**
 * Format support conversation for API responses
 */
function formatSupportConversation(c: any, includeMessages = false, isAdminView = false) {
  if (!c) return c;
  const messages = Array.isArray(c.messages) ? c.messages.map(formatSupportMessage) : [];
  
  return {
    id: c.id,
    conversationCode: c.conversationCode,
    userId: c.userId,
    userRole: c.userRole,
    subject: c.subject,
    category: c.category,
    status: c.status,
    priority: c.priority,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    user: c.user ? {
      id: c.user.id,
      fullName: c.user.fullName,
      role: c.user.role,
      isVerified: c.user.isVerified,
      avatarUrl: c.user.avatarUrl,
      // Private contact details provided to Admins strictly for support fulfillment
      ...(isAdminView ? {
        email: c.user.email,
        phoneNumber: c.user.phoneNumber,
      } : {}),
    } : undefined,
    messageCount: c.messages?.length || 0,
    lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
    ...(includeMessages ? { messages } : {}),
  };
}

/**
 * POST /api/support/conversations
 * Student / Owner creates a support conversation with Mkany Support
 * (Direct peer-to-peer Student <-> Owner communication is strictly impossible)
 */
router.post("/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const { subject, category, message, priority } = req.body || {};

    if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "عنوان المحادثة مطلوب ويجب ألا يقل عن 3 أحرف" 
      });
    }

    if (subject.trim().length > 200) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "عنوان المحادثة لا يجب أن يتجاوز 200 حرف" 
      });
    }

    if (!category || typeof category !== "string" || !VALID_SUPPORT_CATEGORIES.includes(category as SupportCategory)) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: `تصنيف المحادثة غير صالح. التصنيفات المسموحة: ${VALID_SUPPORT_CATEGORIES.join(", ")}` 
      });
    }

    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "نص الرسالة مطلوب ويجب ألا يقل عن حرفين" 
      });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "نص الرسالة لا يجب أن يتجاوز 5000 حرف" 
      });
    }

    const finalPriority: SupportPriority = 
      priority && typeof priority === "string" && VALID_SUPPORT_PRIORITIES.includes(priority as SupportPriority)
        ? (priority as SupportPriority)
        : "normal";

    // Strictly enforce identity from authenticated DB user - NEVER trust client body
    const authenticatedUser = req.dbUser!;
    const userId = authenticatedUser.id;
    const userRole = authenticatedUser.role === "owner" ? "owner" : (authenticatedUser.role === "admin" || authenticatedUser.role === "super_admin") ? "admin" : "student";

    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const conversationCode = `SUP-${new Date().getFullYear()}-${randomSuffix}`;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const [createdConv] = await db.insert(supportConversations).values({
      id: convId,
      conversationCode,
      userId,
      userRole,
      subject: subject.trim(),
      category: category as SupportCategory,
      status: "open",
      priority: finalPriority,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await db.insert(supportMessages).values({
      id: msgId,
      conversationId: convId,
      senderUserId: userId,
      senderRole: userRole,
      body: message.trim(),
      createdAt: new Date(),
    });

    try {
      await createNotification({
        userId: "admin",
        type: "admin_new_support",
        title: "محادثة دعم جديدة",
        body: `قام مستخدم بفتح تذكرة دعم جديدة بموضوع: "${subject.trim()}" (رقم التذكرة: ${conversationCode})`,
        referenceType: "support",
        referenceId: convId,
      });
    } catch (notifErr) {
      console.error("Failed to dispatch notification on support creation:", notifErr);
    }

    const fullConversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, convId),
      with: {
        messages: {
          orderBy: [asc(supportMessages.createdAt)],
        },
      },
    });

    return res.status(201).json({
      message: "تم إنشاء محادثة الدعم بنجاح",
      conversation: formatSupportConversation(fullConversation, true, false),
    });
  } catch (error) {
    req.log.error(error, "Failed to create support conversation");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر إنشاء محادثة الدعم" });
  }
});

/**
 * GET /api/support/conversations
 * Student / Owner lists their OWN support conversations
 * Enforces strict isolation: users can ONLY see conversations where userId === req.dbUser.id
 */
router.get("/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.dbUser!.id;

    const list = await db.query.supportConversations.findMany({
      where: eq(supportConversations.userId, userId),
      orderBy: [desc(supportConversations.updatedAt)],
      with: {
        messages: {
          orderBy: [asc(supportMessages.createdAt)],
        },
      },
    });

    return res.json({
      conversations: list.map((c: any) => formatSupportConversation(c, false, false)),
    });
  } catch (error) {
    req.log.error(error, "Failed to fetch user support conversations");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر جلب محادثات الدعم" });
  }
});

/**
 * GET /api/support/admin/conversations
 * Admin lists all support conversations across the platform with optional filters
 * Strictly protected with requireAdmin
 */
router.get("/admin/conversations", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, category, role, search } = req.query;

    const conditions: any[] = [];

    if (status && typeof status === "string" && VALID_SUPPORT_STATUSES.includes(status as SupportStatus)) {
      conditions.push(eq(supportConversations.status, status));
    }

    if (category && typeof category === "string" && VALID_SUPPORT_CATEGORIES.includes(category as SupportCategory)) {
      conditions.push(eq(supportConversations.category, category));
    }

    if (role && typeof role === "string" && (role === "student" || role === "owner")) {
      conditions.push(eq(supportConversations.userRole, role));
    }

    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(supportConversations.subject, term),
          ilike(supportConversations.conversationCode, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.query.supportConversations.findMany({
      where: whereClause,
      orderBy: [desc(supportConversations.updatedAt)],
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
            isVerified: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: [asc(supportMessages.createdAt)],
        },
      },
    });

    const counts = {
      total: list.length,
      open: list.filter((c: any) => c.status === "open").length,
      in_progress: list.filter((c: any) => c.status === "in_progress").length,
      resolved: list.filter((c: any) => c.status === "resolved").length,
      closed: list.filter((c: any) => c.status === "closed").length,
    };

    return res.json({
      counts,
      conversations: list.map((c: any) => formatSupportConversation(c, false, true)),
    });
  } catch (error) {
    req.log.error(error, "Failed to fetch admin support conversations");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر جلب محادثات الدعم للمشرفين" });
  }
});

/**
 * GET /api/support/conversations/:id
 * Retrieve a specific conversation and all its messages
 * IDOR Protection: Student/Owner can ONLY access their own conversation. Admins can view any conversation.
 */
router.get("/conversations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "معرّف المحادثة غير صالح" });
    }

    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, id),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
            isVerified: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: [asc(supportMessages.createdAt)],
          with: {
            sender: {
              columns: {
                id: true,
                fullName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Not Found", message: "محادثة الدعم غير موجودة" });
    }

    const isAdmin = req.dbUser!.role === "admin" || req.dbUser!.role === "super_admin";
    
    // IDOR Protection: Non-admins cannot access conversations owned by other users
    if (!isAdmin && conversation.userId !== req.dbUser!.id) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "غير مصرح لك بالوصول إلى هذه المحادثة" 
      });
    }

    return res.json({
      conversation: formatSupportConversation(conversation, true, isAdmin),
    });
  } catch (error) {
    req.log.error(error, "Failed to fetch support conversation details");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر جلب تفاصيل محادثة الدعم" });
  }
});

/**
 * POST /api/support/conversations/:id/messages
 * Send a message within a support conversation
 * - Student/Owner can send messages ONLY in their own conversations
 * - Admin can reply to any conversation
 * - Closed conversations reject new user messages
 */
router.post("/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { body } = req.body || {};

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "معرّف المحادثة غير صالح" });
    }

    if (!body || typeof body !== "string" || body.trim().length < 2) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "نص الرسالة مطلوب ويجب ألا يقل عن حرفين" 
      });
    }

    if (body.trim().length > 5000) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "نص الرسالة لا يجب أن يتجاوز 5000 حرف" 
      });
    }

    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, id),
    });

    if (!conversation) {
      return res.status(404).json({ error: "Not Found", message: "محادثة الدعم غير موجودة" });
    }

    const isAdmin = req.dbUser!.role === "admin" || req.dbUser!.role === "super_admin";

    // IDOR Protection
    if (!isAdmin && conversation.userId !== req.dbUser!.id) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "غير مصرح لك بإرسال رسائل في هذه المحادثة" 
      });
    }

    // Closed conversation check
    if (conversation.status === "closed" && !isAdmin) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "هذه المحادثة مغلقة. يرجى فتح محادثة دعم جديدة في حال الحاجة للمساعدة." 
      });
    }

    const senderUserId = req.dbUser!.id;
    const senderRole = isAdmin ? "admin" : req.dbUser!.role === "owner" ? "owner" : "student";
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const [newMsg] = await db.insert(supportMessages).values({
      id: msgId,
      conversationId: conversation.id,
      senderUserId,
      senderRole,
      body: body.trim(),
      createdAt: new Date(),
    }).returning();

    // Auto status transition
    let newStatus = conversation.status;
    if (isAdmin && conversation.status === "open") {
      newStatus = "in_progress";
    } else if (!isAdmin && conversation.status === "resolved") {
      newStatus = "in_progress"; // Customer replied to resolved ticket -> reopens to in_progress
    }

    await db.update(supportConversations).set({
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(supportConversations.id, conversation.id));

    try {
      if (isAdmin) {
        // Support agent replied, notify student or owner who requested support
        await createNotification({
          userId: conversation.userId,
          type: "support_reply_from_admin",
          title: "لديك رسالة جديدة من دعم مكاني",
          body: `قام ممثل دعم مكاني بالرد على استفسارك في تذكرة الدعم برقم: ${conversation.conversationCode}`,
          referenceType: "support",
          referenceId: conversation.id,
        });
      } else {
        // User replied, notify admin
        await createNotification({
          userId: "admin",
          type: "admin_support_reply",
          title: "رد جديد على تذكرة الدعم",
          body: `قام المستخدم بالرد على تذكرة الدعم برقم: ${conversation.conversationCode}`,
          referenceType: "support",
          referenceId: conversation.id,
        });
      }
    } catch (notifErr) {
      console.error("Failed to dispatch support reply notification:", notifErr);
    }

    return res.status(201).json({
      message: "تم إرسال الرسالة بنجاح",
      messageData: formatSupportMessage({
        ...newMsg,
        sender: {
          id: req.dbUser!.id,
          fullName: req.dbUser!.fullName,
          role: req.dbUser!.role,
          avatarUrl: req.dbUser!.avatarUrl,
        },
      }),
    });
  } catch (error) {
    req.log.error(error, "Failed to send support message");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر إرسال الرسالة" });
  }
});

/**
 * PATCH /api/support/conversations/:id/status
 * Admin updates status and/or priority of a support conversation
 * Strictly protected with requireAdmin
 */
router.patch("/conversations/:id/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body || {};

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "معرّف المحادثة غير صالح" });
    }

    if (!status || typeof status !== "string" || !VALID_SUPPORT_STATUSES.includes(status as SupportStatus)) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: `حالة المحادثة غير صالحة. الحالات المسموحة: ${VALID_SUPPORT_STATUSES.join(", ")}` 
      });
    }

    if (priority && (!VALID_SUPPORT_PRIORITIES.includes(priority as SupportPriority))) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: `أولوية المحادثة غير صالحة. الأولويات المسموحة: ${VALID_SUPPORT_PRIORITIES.join(", ")}` 
      });
    }

    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, id),
    });

    if (!conversation) {
      return res.status(404).json({ error: "Not Found", message: "محادثة الدعم غير موجودة" });
    }

    const updateFields: any = {
      status: status as SupportStatus,
      updatedAt: new Date(),
    };

    if (priority) {
      updateFields.priority = priority as SupportPriority;
    }

    await db.update(supportConversations)
      .set(updateFields)
      .where(eq(supportConversations.id, id));

    try {
      if (status === "resolved" || status === "closed") {
        await createNotification({
          userId: conversation.userId,
          type: "support_status_changed",
          title: "تحديث حالة تذكرة الدعم",
          body: `تم تغيير حالة تذكرة الدعم الخاصة بك إلى: ${status === 'resolved' ? 'تم حلها' : 'مغلقة'} (رقم التذكرة: ${conversation.conversationCode})`,
          referenceType: "support",
          referenceId: id,
        });
      }
    } catch (notifErr) {
      console.error("Failed to dispatch support status change notification:", notifErr);
    }

    const updated = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, id),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
            isVerified: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: [asc(supportMessages.createdAt)],
        },
      },
    });

    return res.json({
      message: "تم تحديث حالة تذكرة الدعم بنجاح",
      conversation: formatSupportConversation(updated, true, true),
    });
  } catch (error) {
    req.log.error(error, "Failed to update support conversation status");
    return res.status(500).json({ error: "Internal Server Error", message: "تعذر تحديث حالة تذكرة الدعم" });
  }
});

export default router;
