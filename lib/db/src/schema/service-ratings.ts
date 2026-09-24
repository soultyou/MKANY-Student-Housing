import { pgTable, varchar, text, timestamp, doublePrecision, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";

export const serviceRatings = pgTable("service_ratings", {
  id: serial("id").primaryKey(),
  osmType: varchar("osm_type", { length: 50 }).notNull(), // 'node' | 'way' | 'relation'
  osmId: varchar("osm_id", { length: 100 }).notNull(),   // e.g. '1234567'
  placeName: text("place_name"),
  category: varchar("category", { length: 100 }),         // 'hospital' | 'pharmacy' | 'transportation' | 'supermarket' | 'cafeRestaurant' | 'universityGate'
  rating: doublePrecision("rating").notNull(),           // 0 to 5 in 0.5 increments
  adminId: varchar("admin_id", { length: 128 }).references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    osmIdx: index("service_ratings_osm_idx").on(table.osmType, table.osmId),
    categoryIdx: index("service_ratings_category_idx").on(table.category),
  };
});

export const insertServiceRatingSchema = createInsertSchema(serviceRatings);
export const selectServiceRatingSchema = createSelectSchema(serviceRatings);

export type ServiceRating = typeof serviceRatings.$inferSelect;
export type InsertServiceRating = typeof serviceRatings.$inferInsert;
