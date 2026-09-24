import { db, notifications } from "@workspace/db";

export async function createNotification(params: {
  userId: string; // The target user's ID, or "admin" for admin system notifications
  type: string;
  title: string;
  body: string;
  referenceType?: string;
  referenceId?: string;
}) {
  try {
    // Avoid generating duplicate notifications repeatedly
    // We can do a quick check to see if a very recent identical notification was already sent (within last 5 seconds)
    const recentNotification = await db.query.notifications.findFirst({
      where: (n: any, { and, eq, gte }: any) =>
        and(
          eq(n.userId, params.userId),
          eq(n.type, params.type),
          params.referenceId ? eq(n.referenceId, params.referenceId) : undefined,
          gte(n.createdAt, new Date(Date.now() - 5000))
        ),
    });

    if (recentNotification) {
      console.log(`[Notification Center] Skipping duplicate notification for user ${params.userId} of type ${params.type}`);
      return null;
    }

    const [created] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        referenceType: params.referenceType || null,
        referenceId: params.referenceId || null,
        read: false,
      })
      .returning();

    console.log(`[Notification Center] Notification created: id=${created?.id} type=${created?.type} userId=${created?.userId}`);
    return created;
  } catch (error) {
    console.error("[Notification Center] Error creating notification:", error);
    return null;
  }
}
