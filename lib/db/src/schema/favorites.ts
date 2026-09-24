import { pgTable, varchar, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";
import { apartments } from "./apartments";

/**
 * جدول المفضلة للطلاب (favorites) في منصة مكاني
 * Student -> Favorite -> Apartment
 */
export const favorites = pgTable("favorites", {
  id: varchar("id", { length: 128 }).primaryKey(),
  studentId: varchar("student_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    studentPropertyUniqIdx: uniqueIndex("favorites_student_property_uniq_idx").on(table.studentId, table.propertyId),
    studentIdx: index("favorites_student_idx").on(table.studentId),
    propertyIdx: index("favorites_property_idx").on(table.propertyId),
  };
});

export const insertFavoriteSchema = createInsertSchema(favorites);
export const selectFavoriteSchema = createSelectSchema(favorites);

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
