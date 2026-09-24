// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

import { relations } from "drizzle-orm";
import { users } from "./users";
import { apartments, apartmentPhotos } from "./apartments";
import { inspections } from "./inspections";
import { bookings, rentPayments } from "./bookings";
import { favorites } from "./favorites";
import { supportConversations, supportMessages } from "./support";
import { notifications } from "./notifications";
import { serviceRatings } from "./service-ratings";

export * from "./users";
export * from "./apartments";
export * from "./inspections";
export * from "./bookings";
export * from "./favorites";
export * from "./support";
export * from "./notifications";
export * from "./service-ratings";

export const usersRelations = relations(users, ({ many }) => ({
  apartments: many(apartments),
  inspections: many(inspections),
  bookings: many(bookings),
  favorites: many(favorites),
  supportConversations: many(supportConversations),
  supportMessages: many(supportMessages),
}));

export const apartmentsRelations = relations(apartments, ({ one, many }) => ({
  owner: one(users, {
    fields: [apartments.ownerId],
    references: [users.id],
  }),
  photos: many(apartmentPhotos),
  inspection: one(inspections, {
    fields: [apartments.inspectionId],
    references: [inspections.id],
  }),
  bookings: many(bookings),
  favorites: many(favorites),
}));

export const apartmentPhotosRelations = relations(apartmentPhotos, ({ one }) => ({
  apartment: one(apartments, {
    fields: [apartmentPhotos.apartmentId],
    references: [apartments.id],
  }),
}));

export const inspectionsRelations = relations(inspections, ({ one }) => ({
  owner: one(users, {
    fields: [inspections.ownerId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  student: one(users, {
    fields: [bookings.studentId],
    references: [users.id],
  }),
  property: one(apartments, {
    fields: [bookings.propertyId],
    references: [apartments.id],
  }),
  rentPayments: many(rentPayments),
}));

export const rentPaymentsRelations = relations(rentPayments, ({ one }) => ({
  booking: one(bookings, {
    fields: [rentPayments.bookingId],
    references: [bookings.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  student: one(users, {
    fields: [favorites.studentId],
    references: [users.id],
  }),
  property: one(apartments, {
    fields: [favorites.propertyId],
    references: [apartments.id],
  }),
}));

export const supportConversationsRelations = relations(supportConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [supportConversations.userId],
    references: [users.id],
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  conversation: one(supportConversations, {
    fields: [supportMessages.conversationId],
    references: [supportConversations.id],
  }),
  sender: one(users, {
    fields: [supportMessages.senderUserId],
    references: [users.id],
  }),
}));



