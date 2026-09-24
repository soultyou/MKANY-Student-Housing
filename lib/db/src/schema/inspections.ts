import { pgTable, varchar, text, timestamp, integer, doublePrecision, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";

export const inspections = pgTable("inspections", {
  id: varchar("id", { length: 128 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerName: text("owner_name").notNull(),
  ownerPhone: varchar("owner_phone", { length: 50 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 255 }).notNull(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 150 }).notNull(),
  university: varchar("university", { length: 150 }).notNull(),
  roomType: varchar("room_type", { length: 100 }).notNull(),
  pricePerMonth: integer("price_per_month").notNull(),
  areaSqm: integer("area_sqm").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  floor: varchar("floor", { length: 100 }).notNull(),
  furnishing: varchar("furnishing", { length: 100 }).notNull(),
  initialPhotos: jsonb("initial_photos").$type<string[]>().default([]).notNull(),
  notes: text("notes"),
  preferredInspectionDate: text("preferred_inspection_date"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending | scheduled | inspected | approved | rejected
  scheduledDate: text("scheduled_date"),
  inspectorName: text("inspector_name"),
  inspectorReport: text("inspector_report"),
  livabilityScore: integer("livability_score"),
  video360Url: text("video360_url"),
  model3dUrl: text("model_3d_url"),
  finalImages: jsonb("final_images").$type<string[]>(),
  rejectionReason: text("rejection_reason"),
  publishedPropertyId: varchar("published_property_id", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    ownerIdx: index("inspections_owner_idx").on(table.ownerId),
    statusIdx: index("inspections_status_idx").on(table.status),
    cityIdx: index("inspections_city_idx").on(table.city),
    universityIdx: index("inspections_university_idx").on(table.university),
  };
});

export const insertInspectionSchema = createInsertSchema(inspections);
export const selectInspectionSchema = createSelectSchema(inspections);

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = typeof inspections.$inferInsert;
