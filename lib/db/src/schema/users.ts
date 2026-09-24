import { pgTable, varchar, text, timestamp, boolean, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * جدول المستخدمين والطلاب (users) في مكاني
 * يشمل بيانات الطالب الكاملة المطلوبة:
 * - معرف كليرك (clerkUserId)
 * - اسم الطالب (fullName)
 * - الرقم القومي (nationalId - 14 رقم)
 * - رقم التليفون (phoneNumber)
 * - البريد الإلكتروني (email)
 * - الجامعة (university)
 */
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 128 }),
  fullName: text("full_name").notNull(),
  nationalId: varchar("national_id", { length: 14 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  university: varchar("university", { length: 150 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 50 }).default("student").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("unpaid").notNull(),
  subscriptionAmount: integer("subscription_amount").default(1200).notNull(),
  subscriptionReceiptUrl: text("subscription_receipt_url"),
  subscriptionApprovedAt: timestamp("subscription_approved_at"),
  subscriptionApprovedBy: varchar("subscription_approved_by", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    clerkUserIdIdx: uniqueIndex("clerk_user_id_idx").on(table.clerkUserId),
    emailIdx: uniqueIndex("email_idx").on(table.email)
  };
});

// Zod validation schemas
export const insertUserSchema = createInsertSchema(users, {
  clerkUserId: (schema) => schema.optional(),
  fullName: (schema) => schema.min(3, "يجب أن يكون اسم الطالب 3 أحرف على الأقل"),
  nationalId: (schema) => schema.regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً"),
  phoneNumber: (schema) => schema.regex(/^(01[0125]\d{8}|\+201[0125]\d{8})$/, "رقم التليفون يجب أن يكون رقم مصري صالح (مثال: 01012345678)"),
  email: (schema) => schema.email("البريد الإلكتروني غير صالح"),
  university: (schema) => schema.min(2, "يرجى اختيار أو كتابة الجامعة"),
});

export const selectUserSchema = createSelectSchema(users);

export type UserRole = "student" | "owner" | "admin" | "super_admin";
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
