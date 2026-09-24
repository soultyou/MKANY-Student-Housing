import { pgTable, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";
import { apartments } from "./apartments";

/**
 * جدول حجوزات الطلاب (bookings) في مكاني
 */
export const bookings = pgTable("bookings", {
  id: varchar("id", { length: 128 }).primaryKey(),
  bookingCode: varchar("booking_code", { length: 64 }).notNull(),
  propertyId: integer("property_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentAmount: integer("payment_amount").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  senderPhone: varchar("sender_phone", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending_review").notNull(), // pending_review | confirmed | rejected
  adminNotes: text("admin_notes"),
  appointmentDate: varchar("appointment_date", { length: 100 }),
  appointmentTime: varchar("appointment_time", { length: 100 }),
  contractStartDate: varchar("contract_start_date", { length: 100 }),
  contractEndDate: varchar("contract_end_date", { length: 100 }),
  depositAmount: integer("deposit_amount").default(0).notNull(),
  depositStatus: varchar("deposit_status", { length: 50 }).default("unpaid").notNull(), // unpaid | partial | paid
  depositPaidAt: timestamp("deposit_paid_at"),
  handoverStatus: varchar("handover_status", { length: 50 }).default("not_started").notNull(), // not_started | scheduled | completed
  handoverDate: varchar("handover_date", { length: 100 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("unpaid").notNull(), // unpaid | pending_review | approved | rejected
  subscriptionAmount: integer("subscription_amount").default(1200).notNull(),
  subscriptionReceiptUrl: text("subscription_receipt_url"),
  subscriptionApprovedAt: timestamp("subscription_approved_at"),
  subscriptionApprovedBy: varchar("subscription_approved_by", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    studentIdx: index("bookings_student_idx").on(table.studentId),
    propertyIdx: index("bookings_property_idx").on(table.propertyId),
    statusIdx: index("bookings_status_idx").on(table.status),
    bookingCodeIdx: index("bookings_code_idx").on(table.bookingCode),
  };
});

export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * جدول دفع الإيجار الشهري (rent_payments) المرتبط بالحجوزات النشطة
 */
export const rentPayments = pgTable("rent_payments", {
  id: varchar("id", { length: 128 }).primaryKey(),
  bookingId: varchar("booking_id", { length: 128 }).notNull().references(() => bookings.id, { onDelete: "cascade" }),
  billingPeriod: varchar("billing_period", { length: 100 }).notNull(), // e.g. "أكتوبر 2026"
  amount: integer("amount").notNull(),
  dueDate: varchar("due_date", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("due").notNull(), // due | pending_review | paid | overdue | rejected
  receiptImageUrl: text("receipt_image_url"),
  paidAt: timestamp("paid_at"),
  paymentSource: varchar("payment_source", { length: 100 }), // manual | student_upload
  approvedBy: varchar("approved_by", { length: 128 }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    bookingIdx: index("rent_payments_booking_idx").on(table.bookingId),
    statusIdx: index("rent_payments_status_idx").on(table.status),
  };
});

export const insertRentPaymentSchema = createInsertSchema(rentPayments);
export const selectRentPaymentSchema = createSelectSchema(rentPayments);

export type RentPayment = typeof rentPayments.$inferSelect;
export type InsertRentPayment = typeof rentPayments.$inferInsert;
