import { pgTable, varchar, text, timestamp, boolean, uuid, integer, doublePrecision, jsonb, index, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";
import { z } from "zod";

export const apartments = pgTable("apartments", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  pricePerMonth: integer("price").notNull(),
  city: varchar("city", { length: 150 }).notNull(),
  address: text("address").notNull(),
  university: varchar("university", { length: 150 }).notNull(),
  roomType: varchar("room_type", { length: 100 }).notNull(),
  areaSqm: integer("area_sqm").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  floor: varchar("floor", { length: 50 }).notNull(),
  furnishing: varchar("furnishing", { length: 100 }).notNull(),
  availableFrom: varchar("available_from", { length: 100 }).default("متاح الآن فوراً").notNull(),
  currentRoommates: integer("current_roommates").default(0).notNull(),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  video360Url: text("video_360_url"),
  model3dUrl: text("model_3d_url"),
  verified: boolean("verified").default(false).notNull(),
  premium: boolean("premium").default(false).notNull(),
  livabilityScore: integer("livability_score").default(0).notNull(),
  status: varchar("status", { length: 50 }).default("متاح").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  nearbyAmenities: jsonb("nearby_amenities").$type<any>(),
  inspectionId: varchar("inspection_id", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    ownerIdx: index("apartments_owner_idx").on(table.ownerId),
    cityIdx: index("apartments_city_idx").on(table.city),
    universityIdx: index("apartments_university_idx").on(table.university),
    priceIdx: index("apartments_price_idx").on(table.pricePerMonth)
  };
});

export const apartmentPhotos = pgTable("apartment_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  apartmentId: integer("apartment_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isCover: boolean("is_cover").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    apartmentIdx: index("photos_apartment_idx").on(table.apartmentId)
  };
});

// Zod validation schemas
export const insertApartmentSchema = createInsertSchema(apartments, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  pricePerMonth: (schema) => schema.min(1, "Price must be greater than 0"),
  description: (schema) => schema.optional(),
  availableFrom: (schema) => schema.optional(),
  currentRoommates: (schema) => schema.optional(),
  images: (schema) => schema.optional(),
  video360Url: (schema) => schema.optional(),
  model3dUrl: (schema) => schema.optional(),
  verified: (schema) => schema.optional(),
  premium: (schema) => schema.optional(),
  livabilityScore: (schema) => schema.optional(),
  status: (schema) => schema.optional(),
  lat: (schema) => schema.optional(),
  lng: (schema) => schema.optional(),
  nearbyAmenities: (schema: any) => schema.optional(),
  inspectionId: (schema) => schema.optional(),
}).omit({ ownerId: true, createdAt: true, updatedAt: true, id: true });

export const selectApartmentSchema = createSelectSchema(apartments);
export const insertApartmentPhotoSchema = createInsertSchema(apartmentPhotos);
export const selectApartmentPhotoSchema = createSelectSchema(apartmentPhotos);

export type Apartment = typeof apartments.$inferSelect;
export type InsertApartment = typeof apartments.$inferInsert;
export type ApartmentPhoto = typeof apartmentPhotos.$inferSelect;
export type InsertApartmentPhoto = typeof apartmentPhotos.$inferInsert;
