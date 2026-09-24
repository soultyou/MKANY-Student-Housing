import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";

/**
 * جدول محادثات وتذاكر الدعم الفني (support_conversations) في مكاني
 * قنوات اتصال رسمية محصورة بين الطالب/المالك وإدارة منصة مكاني حصراً
 * يُحظر قطعياً أي تواصل مباشر بين الطالب والمالك.
 */
export const supportConversations = pgTable("support_conversations", {
  id: varchar("id", { length: 128 }).primaryKey(),
  conversationCode: varchar("conversation_code", { length: 64 }).notNull().unique(),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  userRole: varchar("user_role", { length: 50 }).notNull(), // 'student' | 'owner'
  subject: varchar("subject", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'booking' | 'inspection' | 'verification' | 'account' | 'technical' | 'other'
  status: varchar("status", { length: 50 }).default("open").notNull(), // 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: varchar("priority", { length: 20 }).default("normal").notNull(), // 'low' | 'normal' | 'high' | 'urgent'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("support_conversations_user_idx").on(table.userId),
    statusIdx: index("support_conversations_status_idx").on(table.status),
    categoryIdx: index("support_conversations_category_idx").on(table.category),
    codeIdx: index("support_conversations_code_idx").on(table.conversationCode),
  };
});

/**
 * جدول رسائل محادثات الدعم (support_messages)
 * كل رسالة ترتبط بمحادثة دعم وموجهة من المستخدم للإدارة أو من المشرف للمستخدم
 */
export const supportMessages = pgTable("support_messages", {
  id: varchar("id", { length: 128 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 128 }).notNull().references(() => supportConversations.id, { onDelete: "cascade" }),
  senderUserId: varchar("sender_user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: varchar("sender_role", { length: 50 }).notNull(), // 'student' | 'owner' | 'admin'
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    convIdx: index("support_messages_conv_idx").on(table.conversationId),
    senderIdx: index("support_messages_sender_idx").on(table.senderUserId),
    createdIdx: index("support_messages_created_idx").on(table.createdAt),
  };
});

export const insertSupportConversationSchema = createInsertSchema(supportConversations);
export const selectSupportConversationSchema = createSelectSchema(supportConversations);

export const insertSupportMessageSchema = createInsertSchema(supportMessages);
export const selectSupportMessageSchema = createSelectSchema(supportMessages);

export type SupportConversation = typeof supportConversations.$inferSelect;
export type InsertSupportConversation = typeof supportConversations.$inferInsert;

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
