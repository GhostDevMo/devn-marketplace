import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  serial,
  integer,
  decimal,
  boolean,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["client", "professional"] }).notNull().default("client"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  description: text("description"),
  icon: varchar("icon"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  bio: text("bio"),
  experience: integer("experience"),
  isVerified: boolean("is_verified").default(false),
  averageRating: decimal("average_rating", { precision: 2, scale: 1 }),
  totalClients: integer("total_clients").default(0),
  totalSessions: integer("total_sessions").default(0),
  isAvailableToday: boolean("is_available_today").default(false),
  nextAvailableSlot: timestamp("next_available_slot"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const professionalServices = pgTable("professional_services", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  specialtyDescription: text("specialty_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const certifications = pgTable("certifications", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  name: varchar("name").notNull(),
  issuingOrganization: varchar("issuing_organization"),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  credentialId: varchar("credential_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sessionDuration: integer("session_duration").notNull().default(1), // 1 or 2 hours
  duration: integer("duration").default(60), // minutes (deprecated, kept for compatibility)
  status: varchar("status", { 
    enum: ["pending", "confirmed", "completed", "cancelled", "no_show"] 
  }).notNull().default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  professionalAmount: decimal("professional_amount", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  specialRequests: text("special_requests"),
  meetingLink: varchar("meeting_link"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique index to prevent double-booking (only for active bookings)
  uniqueActiveBooking: uniqueIndex("unique_active_booking_idx")
    .on(table.professionalId, table.scheduledAt)
    .where(sql`status IN ('pending', 'confirmed')`)
}));

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  isVerified: boolean("is_verified").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachment_url"),
  attachmentName: varchar("attachment_name"),
  attachmentSize: integer("attachment_size"),
  attachmentType: varchar("attachment_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const availabilitySlots = pgTable("availability_slots", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const freeChats = pgTable("free_chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  startedAt: timestamp("started_at"),
  expiresAt: timestamp("expires_at"),
  isExpired: boolean("is_expired").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // booking_request | booking_confirmed | booking_cancelled | reminder_24h | reminder_1h
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  bookingId: uuid("booking_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const helpMessages = pgTable("help_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payoutRequests = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", {
    enum: ["pending", "processing", "completed", "rejected"]
  }).notNull().default("pending"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  professional: one(professionals, {
    fields: [users.id],
    references: [professionals.userId],
  }),
  clientBookings: many(bookings, { relationName: "clientBookings" }),
  reviews: many(reviews),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  user: one(users, {
    fields: [professionals.userId],
    references: [users.id],
  }),
  services: many(professionalServices),
  certifications: many(certifications),
  bookings: many(bookings),
  reviews: many(reviews),
  availabilitySlots: many(availabilitySlots),
  payoutRequests: many(payoutRequests),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  professionals: many(professionalServices),
  bookings: many(bookings),
}));

export const professionalServicesRelations = relations(professionalServices, ({ one }) => ({
  professional: one(professionals, {
    fields: [professionalServices.professionalId],
    references: [professionals.id],
  }),
  service: one(services, {
    fields: [professionalServices.serviceId],
    references: [services.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
    relationName: "clientBookings",
  }),
  professional: one(professionals, {
    fields: [bookings.professionalId],
    references: [professionals.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  review: one(reviews, {
    fields: [bookings.id],
    references: [reviews.bookingId],
  }),
  chatMessages: many(chatMessages),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
  }),
  professional: one(professionals, {
    fields: [reviews.professionalId],
    references: [professionals.id],
  }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  professional: one(professionals, {
    fields: [certifications.professionalId],
    references: [professionals.id],
  }),
}));

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  professional: one(professionals, {
    fields: [availabilitySlots.professionalId],
    references: [professionals.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  booking: one(bookings, {
    fields: [chatMessages.bookingId],
    references: [bookings.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
}));

export const freeChatsRelations = relations(freeChats, ({ one }) => ({
  client: one(users, { fields: [freeChats.clientId], references: [users.id] }),
  professional: one(professionals, { fields: [freeChats.professionalId], references: [professionals.id] }),
}));

export const payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  professional: one(professionals, {
    fields: [payoutRequests.professionalId],
    references: [professionals.id],
  }),
}));

// Insert schemas
export const upsertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertProfessionalSchema = createInsertSchema(professionals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({ id: true, createdAt: true, requestedAt: true });
export const insertFreeChatSchema = createInsertSchema(freeChats).omit({ id: true, createdAt: true });

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const clientRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.literal("client"),
});

export const professionalRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  title: z.string().min(1),
  bio: z.string().min(10),
  experience: z.string().min(1),
  serviceId: z.string().min(1),
  specialtyDescription: z.string().min(10),
  role: z.literal("professional"),
});

export const registrationSchema = z.discriminatedUnion("role", [
  clientRegistrationSchema,
  professionalRegistrationSchema,
]);

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Professional = typeof professionals.$inferSelect;
export type ProfessionalService = typeof professionalServices.$inferSelect;
export type Certification = typeof certifications.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type FreeChat = typeof freeChats.$inferSelect;
export type InsertFreeChat = z.infer<typeof insertFreeChatSchema>;
export type HelpMessage = typeof helpMessages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
