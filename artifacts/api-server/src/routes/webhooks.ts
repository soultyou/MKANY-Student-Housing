import { Router } from "express";
import express from "express";
import { Webhook } from "svix";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

export const clerkWebhooksRouter = Router();

// We need the raw request body to verify the webhook signature
clerkWebhooksRouter.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!SIGNING_SECRET) {
      req.log.error("CLERK_WEBHOOK_SECRET is not set");
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Get the headers and body
    const svix_id = req.headers["svix-id"] as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    // If there are no Svix headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      req.log.warn("Missing svix headers");
      res.status(400).json({ error: "Bad Request", message: "Missing svix headers" });
      return;
    }

    let payload: any;
    try {
      const wh = new Webhook(SIGNING_SECRET);
      // req.body is a Buffer when using express.raw
      payload = wh.verify(req.body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err: any) {
      req.log.warn({ err }, "Webhook signature verification failed");
      res.status(400).json({ error: "Bad Request", message: "Webhook verification failed" });
      return;
    }

    const evt = payload as any;
    const eventType = evt.type;
    const userData = evt.data;

    try {
      if (eventType === "user.created" || eventType === "user.updated") {
        const clerkUserId = userData.id;
        const email = userData.email_addresses?.[0]?.email_address || "";
        const fullName = userData.first_name 
          ? `${userData.first_name} ${userData.last_name || ""}`.trim() 
          : email;
        const avatarUrl = userData.image_url || null;
        
        // Metadata fields
        const publicMetadata = userData.public_metadata || {};
        const unsafeMetadata = userData.unsafe_metadata || {};

        const university = publicMetadata.university || "جامعة أخرى";
        const nationalId = unsafeMetadata.nationalId || "";
        const phoneNumber = unsafeMetadata.phoneNumber || "";
        const role = publicMetadata.role || "student";
        const isVerified = publicMetadata.isVerified === true;

        if (eventType === "user.created") {
          // Idempotent creation
          const existingUser = await db.query.users.findFirst({
            where: eq(users.clerkUserId, clerkUserId),
          });

          if (!existingUser) {
            await db.insert(users).values({
              id: clerkUserId, // use clerk ID as our primary ID as well
              clerkUserId: clerkUserId,
              email,
              fullName,
              university,
              nationalId,
              phoneNumber,
              avatarUrl,
              role,
              isVerified,
            });
            req.log.info({ clerkUserId }, "User created in database");
          } else {
            req.log.info({ clerkUserId }, "User already exists (idempotent webhook)");
          }
        } else if (eventType === "user.updated") {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.clerkUserId, clerkUserId),
          });

          if (existingUser) {
            await db.update(users)
              .set({
                email,
                fullName: fullName || existingUser.fullName,
                university: university !== "جامعة أخرى" ? university : existingUser.university,
                nationalId: nationalId || existingUser.nationalId,
                phoneNumber: phoneNumber || existingUser.phoneNumber,
                avatarUrl: avatarUrl || existingUser.avatarUrl,
                // Preserve existing DB role unless explicitly provided in publicMetadata with valid value
                role: publicMetadata.role && ["student", "owner", "admin", "super_admin"].includes(publicMetadata.role)
                  ? publicMetadata.role
                  : existingUser.role,
                isVerified: typeof publicMetadata.isVerified === "boolean"
                  ? publicMetadata.isVerified
                  : existingUser.isVerified,
                updatedAt: new Date(),
              })
              .where(eq(users.clerkUserId, clerkUserId));
            req.log.info({ clerkUserId }, "User updated in database preserving DB role");
          }
        }
      } else if (eventType === "user.deleted") {
        const clerkUserId = userData.id;
        await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
        req.log.info({ clerkUserId }, "User deleted from database");
      }

      res.status(200).json({ success: true });
    } catch (err: any) {
      req.log.error({ err, eventType, clerkUserId: userData?.id }, "Error processing webhook");
      // Return 500 to let Clerk retry
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
