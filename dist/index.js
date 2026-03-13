var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";
import Stripe from "stripe";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  availabilitySlots: () => availabilitySlots,
  availabilitySlotsRelations: () => availabilitySlotsRelations,
  bookings: () => bookings,
  bookingsRelations: () => bookingsRelations,
  certifications: () => certifications,
  certificationsRelations: () => certificationsRelations,
  chatMessages: () => chatMessages,
  chatMessagesRelations: () => chatMessagesRelations,
  clientRegistrationSchema: () => clientRegistrationSchema,
  insertBookingSchema: () => insertBookingSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertPayoutRequestSchema: () => insertPayoutRequestSchema,
  insertProfessionalSchema: () => insertProfessionalSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertServiceSchema: () => insertServiceSchema,
  loginSchema: () => loginSchema,
  payoutRequests: () => payoutRequests,
  payoutRequestsRelations: () => payoutRequestsRelations,
  professionalRegistrationSchema: () => professionalRegistrationSchema,
  professionalServices: () => professionalServices,
  professionalServicesRelations: () => professionalServicesRelations,
  professionals: () => professionals,
  professionalsRelations: () => professionalsRelations,
  registrationSchema: () => registrationSchema,
  reviews: () => reviews,
  reviewsRelations: () => reviewsRelations,
  services: () => services,
  servicesRelations: () => servicesRelations,
  sessions: () => sessions,
  upsertUserSchema: () => upsertUserSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
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
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
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
  updatedAt: timestamp("updated_at").defaultNow()
});
var services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  description: text("description"),
  icon: varchar("icon"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow()
});
var professionals = pgTable("professionals", {
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
  updatedAt: timestamp("updated_at").defaultNow()
});
var professionalServices = pgTable("professional_services", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  specialtyDescription: text("specialty_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var certifications = pgTable("certifications", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  name: varchar("name").notNull(),
  issuingOrganization: varchar("issuing_organization"),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  credentialId: varchar("credential_id"),
  createdAt: timestamp("created_at").defaultNow()
});
var bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sessionDuration: integer("session_duration").notNull().default(1),
  // 1 or 2 hours
  duration: integer("duration").default(60),
  // minutes (deprecated, kept for compatibility)
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
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Unique index to prevent double-booking (only for active bookings)
  uniqueActiveBooking: uniqueIndex("unique_active_booking_idx").on(table.professionalId, table.scheduledAt).where(sql`status IN ('pending', 'confirmed')`)
}));
var reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  rating: integer("rating").notNull(),
  // 1-5
  comment: text("comment"),
  isVerified: boolean("is_verified").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachment_url"),
  attachmentName: varchar("attachment_name"),
  attachmentSize: integer("attachment_size"),
  attachmentType: varchar("attachment_type"),
  createdAt: timestamp("created_at").defaultNow()
});
var availabilitySlots = pgTable("availability_slots", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  // 0-6 (Sunday-Saturday)
  startTime: varchar("start_time").notNull(),
  // HH:MM format
  endTime: varchar("end_time").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var payoutRequests = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  professionalId: integer("professional_id").references(() => professionals.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", {
    enum: ["pending", "processing", "completed", "rejected"]
  }).notNull().default("pending"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ one, many }) => ({
  professional: one(professionals, {
    fields: [users.id],
    references: [professionals.userId]
  }),
  clientBookings: many(bookings, { relationName: "clientBookings" }),
  reviews: many(reviews)
}));
var professionalsRelations = relations(professionals, ({ one, many }) => ({
  user: one(users, {
    fields: [professionals.userId],
    references: [users.id]
  }),
  services: many(professionalServices),
  certifications: many(certifications),
  bookings: many(bookings),
  reviews: many(reviews),
  availabilitySlots: many(availabilitySlots),
  payoutRequests: many(payoutRequests)
}));
var servicesRelations = relations(services, ({ many }) => ({
  professionals: many(professionalServices),
  bookings: many(bookings)
}));
var professionalServicesRelations = relations(professionalServices, ({ one }) => ({
  professional: one(professionals, {
    fields: [professionalServices.professionalId],
    references: [professionals.id]
  }),
  service: one(services, {
    fields: [professionalServices.serviceId],
    references: [services.id]
  })
}));
var bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
    relationName: "clientBookings"
  }),
  professional: one(professionals, {
    fields: [bookings.professionalId],
    references: [professionals.id]
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id]
  }),
  review: one(reviews, {
    fields: [bookings.id],
    references: [reviews.bookingId]
  }),
  chatMessages: many(chatMessages)
}));
var reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id]
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id]
  }),
  professional: one(professionals, {
    fields: [reviews.professionalId],
    references: [professionals.id]
  })
}));
var certificationsRelations = relations(certifications, ({ one }) => ({
  professional: one(professionals, {
    fields: [certifications.professionalId],
    references: [professionals.id]
  })
}));
var availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  professional: one(professionals, {
    fields: [availabilitySlots.professionalId],
    references: [professionals.id]
  })
}));
var chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  booking: one(bookings, {
    fields: [chatMessages.bookingId],
    references: [bookings.id]
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id]
  })
}));
var payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  professional: one(professionals, {
    fields: [payoutRequests.professionalId],
    references: [professionals.id]
  })
}));
var upsertUserSchema = createInsertSchema(users);
var insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
var insertProfessionalSchema = createInsertSchema(professionals).omit({ id: true, createdAt: true, updatedAt: true });
var insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
var insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
var insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
var insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({ id: true, createdAt: true, requestedAt: true });
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
var clientRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.literal("client")
});
var professionalRegistrationSchema = z.object({
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
  role: z.literal("professional")
});
var registrationSchema = z.discriminatedUnion("role", [
  clientRegistrationSchema,
  professionalRegistrationSchema
]);

// server/db.ts
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  console.error("Environment variables loaded:", Object.keys(process.env).filter(
    (key) => key.includes("DATABASE") || key.includes("STRIPE") || key.includes("SESSION")
  ));
  throw new Error("DATABASE_URL must be set.");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
  // required for Railway
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, or, desc, asc, sql as sql2 } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations - required for Replit Auth
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(userData) {
    const userId = userData.id || crypto.randomUUID();
    const [user] = await db.insert(users).values({
      ...userData,
      id: userId,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return user;
  }
  async createProfessional(professionalData) {
    const [professional] = await db.insert(professionals).values(professionalData).returning();
    return professional;
  }
  async createProfessionalService(serviceData) {
    const [professionalService] = await db.insert(professionalServices).values(serviceData).returning();
    return professionalService;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  // Service operations
  async getServices() {
    return await db.select().from(services).orderBy(asc(services.name));
  }
  async getServiceBySlug(slug) {
    const [service] = await db.select().from(services).where(eq(services.slug, slug));
    return service;
  }
  // Professional operations
  async getAllProfessionals() {
    const professionalsData = await db.select({
      professional: professionals,
      user: users,
      service: services,
      professionalService: professionalServices
    }).from(professionals).innerJoin(users, eq(professionals.userId, users.id)).innerJoin(professionalServices, eq(professionals.id, professionalServices.professionalId)).innerJoin(services, eq(professionalServices.serviceId, services.id)).orderBy(desc(professionals.averageRating));
    const professionalMap = /* @__PURE__ */ new Map();
    for (const row of professionalsData) {
      if (!professionalMap.has(row.professional.id)) {
        const certs = await db.select({ name: certifications.name, issuingOrganization: certifications.issuingOrganization }).from(certifications).where(eq(certifications.professionalId, row.professional.id));
        const reviewCount = await db.select({ count: sql2`count(*)` }).from(reviews).where(eq(reviews.professionalId, row.professional.id));
        professionalMap.set(row.professional.id, {
          ...row.professional,
          user: row.user,
          services: [],
          certifications: certs,
          averageRating: parseFloat(row.professional.averageRating || "0"),
          reviewCount: reviewCount[0]?.count || 0
        });
      }
      const prof = professionalMap.get(row.professional.id);
      prof.services.push({
        service: row.service,
        price: row.professionalService.price
      });
    }
    return Array.from(professionalMap.values());
  }
  async getProfessionalsByService(serviceSlug) {
    const service = await this.getServiceBySlug(serviceSlug);
    if (!service) return [];
    const professionalsData = await db.select({
      professional: professionals,
      user: users,
      service: services,
      professionalService: professionalServices
    }).from(professionals).innerJoin(users, eq(professionals.userId, users.id)).innerJoin(professionalServices, eq(professionals.id, professionalServices.professionalId)).innerJoin(services, eq(professionalServices.serviceId, services.id)).where(eq(services.slug, serviceSlug)).orderBy(desc(professionals.averageRating));
    const professionalMap = /* @__PURE__ */ new Map();
    for (const row of professionalsData) {
      if (!professionalMap.has(row.professional.id)) {
        const certs = await db.select({ name: certifications.name, issuingOrganization: certifications.issuingOrganization }).from(certifications).where(eq(certifications.professionalId, row.professional.id));
        const reviewCount = await db.select({ count: sql2`count(*)` }).from(reviews).where(eq(reviews.professionalId, row.professional.id));
        professionalMap.set(row.professional.id, {
          ...row.professional,
          user: row.user,
          services: [],
          certifications: certs,
          averageRating: parseFloat(row.professional.averageRating || "0"),
          reviewCount: reviewCount[0]?.count || 0
        });
      }
      const prof = professionalMap.get(row.professional.id);
      prof.services.push({
        service: row.service,
        price: row.professionalService.price
      });
    }
    return Array.from(professionalMap.values());
  }
  async getProfessionalById(id) {
    const [professional] = await db.select().from(professionals).where(eq(professionals.id, id));
    if (!professional) return void 0;
    const [user] = await db.select().from(users).where(eq(users.id, professional.userId));
    const servicesData = await db.select({
      service: services,
      price: professionalServices.price
    }).from(professionalServices).innerJoin(services, eq(professionalServices.serviceId, services.id)).where(eq(professionalServices.professionalId, id));
    const certs = await db.select({ name: certifications.name, issuingOrganization: certifications.issuingOrganization }).from(certifications).where(eq(certifications.professionalId, id));
    const reviewsData = await db.select({
      review: reviews,
      client: { firstName: users.firstName, lastName: users.lastName }
    }).from(reviews).innerJoin(users, eq(reviews.clientId, users.id)).where(eq(reviews.professionalId, id)).orderBy(desc(reviews.createdAt)).limit(10);
    return {
      ...professional,
      user,
      services: servicesData.map((s) => ({ service: s.service, price: s.price })),
      certifications: certs,
      reviews: reviewsData.map((r) => ({ ...r.review, client: r.client }))
    };
  }
  // Booking operations
  async createBooking(booking) {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }
  async getBookingById(id) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) return void 0;
    const [professional] = await db.select({
      professional: professionals,
      user: users
    }).from(professionals).innerJoin(users, eq(professionals.userId, users.id)).where(eq(professionals.id, booking.professionalId));
    const [service] = await db.select().from(services).where(eq(services.id, booking.serviceId));
    const [client] = await db.select().from(users).where(eq(users.id, booking.clientId));
    if (!professional || !service || !client) return void 0;
    return {
      ...booking,
      professional: { ...professional.professional, user: professional.user },
      service,
      client
    };
  }
  async getBookingsByClient(clientId) {
    const results = await db.select({
      booking: bookings,
      professional: professionals,
      professionalUser: users,
      service: services,
      review: reviews
    }).from(bookings).innerJoin(professionals, eq(bookings.professionalId, professionals.id)).innerJoin(users, eq(professionals.userId, users.id)).innerJoin(services, eq(bookings.serviceId, services.id)).leftJoin(reviews, eq(bookings.id, reviews.bookingId)).where(eq(bookings.clientId, clientId)).orderBy(desc(bookings.scheduledAt));
    return results.map((r) => ({
      ...r.booking,
      professional: { ...r.professional, user: r.professionalUser },
      service: r.service,
      reviewId: r.review?.id
    }));
  }
  async getBookingsByProfessional(professionalId) {
    const results = await db.select({
      booking: bookings,
      client: users,
      service: services
    }).from(bookings).innerJoin(users, eq(bookings.clientId, users.id)).innerJoin(services, eq(bookings.serviceId, services.id)).where(eq(bookings.professionalId, professionalId)).orderBy(desc(bookings.scheduledAt));
    return results.map((r) => ({
      ...r.booking,
      client: r.client,
      service: r.service
    }));
  }
  async updateBookingStatus(id, status) {
    const [booking] = await db.update(bookings).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bookings.id, id)).returning();
    if (!booking) return void 0;
    if (status === "confirmed") {
      const existingBookings = await db.select().from(bookings).where(and(
        eq(bookings.professionalId, booking.professionalId),
        eq(bookings.clientId, booking.clientId),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
        sql2`${bookings.id} != ${booking.id}`
        // Exclude the current booking
      ));
      if (existingBookings.length === 0) {
        await db.update(professionals).set({
          totalClients: sql2`${professionals.totalClients} + 1`,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(professionals.id, booking.professionalId));
      }
    }
    if (status === "completed") {
      await db.update(professionals).set({
        totalSessions: sql2`${professionals.totalSessions} + 1`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(professionals.id, booking.professionalId));
    }
    return booking;
  }
  // Review operations
  async createReview(review) {
    const [newReview] = await db.insert(reviews).values(review).returning();
    const avgRating = await db.select({ avg: sql2`avg(${reviews.rating})` }).from(reviews).where(eq(reviews.professionalId, review.professionalId));
    if (avgRating[0]?.avg) {
      await db.update(professionals).set({ averageRating: avgRating[0].avg.toFixed(1) }).where(eq(professionals.id, review.professionalId));
    }
    return newReview;
  }
  async getReviewsByProfessional(professionalId) {
    const results = await db.select({
      review: reviews,
      client: { firstName: users.firstName, lastName: users.lastName }
    }).from(reviews).innerJoin(users, eq(reviews.clientId, users.id)).where(eq(reviews.professionalId, professionalId)).orderBy(desc(reviews.createdAt));
    return results.map((r) => ({ ...r.review, client: r.client }));
  }
  async updateUser(id, data) {
    const [updatedUser] = await db.update(users).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  async getProfessionalByUserId(userId) {
    const [professional] = await db.select().from(professionals).where(eq(professionals.userId, userId));
    return professional;
  }
  async getChatMessagesByBookingId(bookingId) {
    const results = await db.select({
      message: chatMessages,
      sender: users
    }).from(chatMessages).innerJoin(users, eq(chatMessages.senderId, users.id)).where(eq(chatMessages.bookingId, bookingId)).orderBy(asc(chatMessages.createdAt));
    return results.map((r) => ({ ...r.message, sender: r.sender }));
  }
  async createChatMessage(message) {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }
  async getCompletedBookingsByProfessional(professionalId) {
    const results = await db.select({
      booking: bookings,
      service: services,
      client: users
    }).from(bookings).innerJoin(services, eq(bookings.serviceId, services.id)).innerJoin(users, eq(bookings.clientId, users.id)).where(and(
      eq(bookings.professionalId, professionalId),
      or(eq(bookings.status, "completed"), eq(bookings.status, "confirmed"))
    )).orderBy(desc(bookings.scheduledAt));
    return results.map((r) => ({ ...r.booking, service: r.service, client: r.client }));
  }
  async createPayoutRequest(payoutData) {
    const [request] = await db.insert(payoutRequests).values({
      professionalId: payoutData.professionalId,
      amount: payoutData.amount,
      notes: payoutData.notes,
      status: "pending"
    }).returning();
    return request;
  }
  async getPayoutRequestsByProfessional(professionalId) {
    return await db.select().from(payoutRequests).where(eq(payoutRequests.professionalId, professionalId)).orderBy(desc(payoutRequests.requestedAt));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { eq as eq2 } from "drizzle-orm";

// server/chatSocket.ts
import { WebSocketServer, WebSocket } from "ws";

// server/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
var JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";
var JWT_EXPIRES_IN = "7d";
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
var authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }
  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
  try {
    const fullUser = await storage.getUserById(user.id);
    if (!fullUser) {
      return res.status(403).json({ message: "User not found" });
    }
    req.user = {
      id: fullUser.id,
      email: fullUser.email || "",
      firstName: fullUser.firstName || "",
      lastName: fullUser.lastName || "",
      profileImageUrl: fullUser.profileImageUrl || void 0,
      role: fullUser.role || "client"
    };
    next();
  } catch (error) {
    return res.status(500).json({ message: "Authentication error" });
  }
};

// server/chatSocket.ts
function setupChatWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });
  const connections = /* @__PURE__ */ new Map();
  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (!url.pathname.startsWith("/ws/chat/")) {
      socket.destroy();
      return;
    }
    const bookingId = url.pathname.split("/")[3];
    const token = url.searchParams.get("token");
    if (!token || !bookingId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    try {
      const decoded = verifyToken(token);
      if (!decoded || !decoded.id) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }
      if (booking.clientId !== decoded.id && booking.professional.userId !== decoded.id) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
      if (booking.status !== "confirmed" && booking.status !== "completed") {
        socket.write("HTTP/1.1 403 Forbidden - Booking not confirmed\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        const authWs = ws;
        authWs.userId = decoded.id;
        authWs.bookingId = bookingId;
        wss.emit("connection", authWs, request);
      });
    } catch (error) {
      console.error("WebSocket upgrade error:", error);
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
    }
  });
  wss.on("connection", (ws) => {
    const { userId, bookingId } = ws;
    if (!userId || !bookingId) {
      ws.close();
      return;
    }
    console.log(`User ${userId} connected to booking ${bookingId} chat`);
    if (!connections.has(bookingId)) {
      connections.set(bookingId, []);
    }
    connections.get(bookingId).push({ ws, userId });
    storage.getChatMessagesByBookingId(bookingId).then((messages) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "history",
          messages
        }));
      }
    }).catch((error) => {
      console.error("Error fetching chat history:", error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "history",
          messages: []
        }));
      }
    });
    ws.on("message", async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.type === "message") {
          const messageData = {
            bookingId,
            senderId: userId,
            content: payload.content,
            attachmentUrl: payload.attachmentUrl,
            attachmentName: payload.attachmentName,
            attachmentSize: payload.attachmentSize,
            attachmentType: payload.attachmentType
          };
          const savedMessage = await storage.createChatMessage(messageData);
          const sender = await storage.getUser(userId);
          const bookingConnections = connections.get(bookingId) || [];
          console.log(`Broadcasting message to ${bookingConnections.length} connections for booking ${bookingId}`);
          const messageWithSender = {
            type: "message",
            message: {
              ...savedMessage,
              sender
            }
          };
          bookingConnections.forEach((conn) => {
            if (conn.ws.readyState === WebSocket.OPEN) {
              console.log(`Sending message to user ${conn.userId}`);
              conn.ws.send(JSON.stringify(messageWithSender));
            } else {
              console.log(`Skipping user ${conn.userId} - connection not open (state: ${conn.ws.readyState})`);
            }
          });
        }
      } catch (error) {
        console.error("Error handling message:", error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Failed to process message"
        }));
      }
    });
    ws.on("close", () => {
      console.log(`User ${userId} disconnected from booking ${bookingId} chat`);
      const bookingConnections = connections.get(bookingId) || [];
      const index2 = bookingConnections.findIndex((conn) => conn.userId === userId);
      if (index2 !== -1) {
        bookingConnections.splice(index2, 1);
      }
      if (bookingConnections.length === 0) {
        connections.delete(bookingId);
      }
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
  return wss;
}

// server/routes.ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});
async function registerRoutes(app2) {
  app2.get("/api/services", async (req, res) => {
    try {
      const services2 = await storage.getServices();
      res.json(services2);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });
  app2.get("/api/professionals", async (req, res) => {
    try {
      const professionals3 = await storage.getAllProfessionals();
      res.json(professionals3);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ message: "Failed to fetch professionals" });
    }
  });
  app2.get("/api/professionals/service/:serviceSlug", async (req, res) => {
    try {
      const { serviceSlug } = req.params;
      const professionals3 = await storage.getProfessionalsByService(serviceSlug);
      res.json(professionals3);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ message: "Failed to fetch professionals" });
    }
  });
  app2.get("/api/professional/profile", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }
      res.json(professional);
    } catch (error) {
      console.error("Error fetching professional profile:", error);
      res.status(500).json({ message: "Failed to fetch professional profile" });
    }
  });
  app2.get("/api/professional/bookings", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }
      const bookings2 = await storage.getBookingsByProfessional(professional.id);
      res.json(bookings2);
    } catch (error) {
      console.error("Error fetching professional bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  app2.get("/api/professional/earnings", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }
      const completedBookings = await storage.getCompletedBookingsByProfessional(professional.id);
      const earnings = completedBookings.map((booking) => {
        const totalAmount = parseFloat(booking.amount);
        const platformFee = totalAmount * 0.3;
        const professionalEarning = totalAmount * 0.7;
        return {
          ...booking,
          totalAmount,
          platformFee,
          professionalEarning
        };
      });
      const totalEarned = earnings.reduce((sum, e) => sum + e.professionalEarning, 0);
      const totalPlatformFees = earnings.reduce((sum, e) => sum + e.platformFee, 0);
      res.json({
        earnings,
        summary: {
          totalSessions: earnings.length,
          totalEarned: totalEarned.toFixed(2),
          totalPlatformFees: totalPlatformFees.toFixed(2),
          availableForPayout: totalEarned.toFixed(2)
        }
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });
  app2.post("/api/professional/payout-request", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { amount, notes } = req.body;
      if (!amount || typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount. Must be a positive number." });
      }
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }
      const payoutRequest = await storage.createPayoutRequest({
        professionalId: professional.id,
        amount: amount.toFixed(2),
        notes
      });
      res.json(payoutRequest);
    } catch (error) {
      console.error("Error creating payout request:", error);
      res.status(500).json({ message: "Failed to create payout request" });
    }
  });
  app2.get("/api/professional/payout-requests", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }
      const payoutRequests2 = await storage.getPayoutRequestsByProfessional(professional.id);
      res.json(payoutRequests2);
    } catch (error) {
      console.error("Error fetching payout requests:", error);
      res.status(500).json({ message: "Failed to fetch payout requests" });
    }
  });
  app2.get("/api/professional/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid professional ID" });
      }
      const professional = await storage.getProfessionalById(id);
      if (!professional) {
        return res.status(404).json({ message: "Professional not found" });
      }
      res.json(professional);
    } catch (error) {
      console.error("Error fetching professional:", error);
      res.status(500).json({ message: "Failed to fetch professional" });
    }
  });
  app2.get("/api/professional/:id/available-slots", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid professional ID" });
      }
      const slots = [];
      const today = /* @__PURE__ */ new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "long" });
        const times = [
          { display: "9:00 AM", hour: 9, minute: 0 },
          { display: "11:00 AM", hour: 11, minute: 0 },
          { display: "2:00 PM", hour: 14, minute: 0 },
          { display: "4:00 PM", hour: 16, minute: 0 }
        ];
        for (const time of times) {
          const slotDate = new Date(date);
          slotDate.setHours(time.hour, time.minute, 0, 0);
          const now = /* @__PURE__ */ new Date();
          const isPastSlot = i === 0 && slotDate.getTime() <= now.getTime();
          if (!isPastSlot) {
            const year = slotDate.getFullYear();
            const month = String(slotDate.getMonth() + 1).padStart(2, "0");
            const day = String(slotDate.getDate()).padStart(2, "0");
            const hour = String(slotDate.getHours()).padStart(2, "0");
            const minute = String(slotDate.getMinutes()).padStart(2, "0");
            const localDateTimeString = `${year}-${month}-${day}T${hour}:${minute}`;
            slots.push({
              id: localDateTimeString,
              day: dayName,
              time: time.display,
              date: date.toDateString(),
              fullDate: slotDate
            });
          }
        }
      }
      const existingBookings = await db.select().from(bookings).where(eq2(bookings.professionalId, id));
      const bookedTimes = new Set(
        existingBookings.filter((b) => b.status === "pending" || b.status === "confirmed").map((b) => new Date(b.scheduledAt).toISOString())
      );
      const availableSlots = slots.filter((slot) => !bookedTimes.has(slot.fullDate.toISOString()));
      res.json(availableSlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });
  app2.post("/api/bookings", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const professionalId = parseInt(req.body.professionalId);
      const scheduledAt = new Date(req.body.scheduledAt);
      scheduledAt.setMilliseconds(0);
      scheduledAt.setSeconds(0);
      const existingBookings = await db.select().from(bookings).where(eq2(bookings.professionalId, professionalId));
      const isSlotTaken = existingBookings.some((booking2) => {
        const bookingTime = new Date(booking2.scheduledAt);
        bookingTime.setMilliseconds(0);
        bookingTime.setSeconds(0);
        return (booking2.status === "pending" || booking2.status === "confirmed") && bookingTime.getTime() === scheduledAt.getTime();
      });
      if (isSlotTaken) {
        return res.status(409).json({
          message: "This time slot is no longer available. Please select another time."
        });
      }
      const serviceId = parseInt(req.body.serviceId);
      const service = await db.select().from(services).where(eq2(services.id, serviceId)).limit(1);
      if (!service || service.length === 0) {
        return res.status(404).json({ message: "Service not found" });
      }
      const amount = parseFloat(service[0].basePrice || "99");
      const platformFee = amount * 0.3;
      const professionalAmount = amount * 0.7;
      const bookingData = {
        ...req.body,
        amount: amount.toFixed(2),
        clientId: userId,
        scheduledAt,
        platformFee: platformFee.toFixed(2),
        professionalAmount: professionalAmount.toFixed(2)
      };
      const booking = await storage.createBooking(bookingData);
      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error?.code === "23505" || error?.message?.includes("unique")) {
        return res.status(409).json({
          message: "This time slot is no longer available. Please select another time."
        });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });
  app2.get("/api/bookings", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const bookings2 = await storage.getBookingsByClient(userId);
      res.json(bookings2);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  app2.get("/api/booking/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const booking = await storage.getBookingById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      console.log("Booking authorization check:", {
        bookingClientId: booking.clientId,
        requestingUserId: userId,
        professionalUserId: booking.professional?.userId,
        bookingData: JSON.stringify(booking, null, 2)
      });
      if (booking.clientId !== userId && booking.professional?.userId !== userId) {
        console.log("Authorization failed - user does not own this booking");
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });
  app2.patch("/api/booking/:id/status", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { status } = req.body;
      const booking = await storage.getBookingById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.professional?.userId !== userId) {
        return res.status(403).json({ message: "Only the assigned professional can update booking status" });
      }
      const updatedBooking = await storage.updateBookingStatus(req.params.id, status);
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });
  app2.get("/api/professional/user/:userId", authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      if (userId !== requestingUserId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional not found" });
      }
      res.json(professional);
    } catch (error) {
      console.error("Error fetching professional status:", error);
      res.status(500).json({ message: "Failed to fetch professional status" });
    }
  });
  app2.patch("/api/profile", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.post("/api/reviews", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        clientId: userId
      });
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });
  app2.get("/api/bookings/:bookingId/messages", authenticateToken, async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user.id;
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.clientId !== userId && booking.professional.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const messages = await storage.getChatMessagesByBookingId(bookingId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });
  app2.get("/api/bookings/:bookingId/chat-status", authenticateToken, async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user.id;
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.clientId !== userId && booking.professional.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (booking.status !== "confirmed" && booking.status !== "completed") {
        return res.json({
          canAccess: false,
          reason: "Booking not confirmed"
        });
      }
      res.json({
        canAccess: true,
        reason: null,
        scheduledStart: booking.scheduledAt
      });
    } catch (error) {
      console.error("Error checking chat status:", error);
      res.status(500).json({ message: "Failed to check chat status" });
    }
  });
  app2.post("/api/chat/upload", authenticateToken, async (req, res) => {
    try {
      const { fileName, fileData, fileType, fileSize } = req.body;
      if (!fileName || !fileData || !fileType) {
        return res.status(400).json({ message: "Missing file data" });
      }
      const maxSize = 10 * 1024 * 1024;
      if (fileSize > maxSize) {
        return res.status(400).json({ message: "File too large (max 10MB)" });
      }
      const fileUrl = `data:${fileType};base64,${fileData}`;
      res.json({
        url: fileUrl,
        name: fileName,
        type: fileType,
        size: fileSize
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });
  app2.post("/api/create-payment-intent", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { bookingId } = req.body;
      const booking = await storage.getBookingById(bookingId);
      if (!booking || booking.clientId !== userId) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const amount = parseFloat(booking.amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        // Convert to cents
        currency: "usd",
        metadata: {
          bookingId,
          clientId: userId
        }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent" });
    }
  });
  app2.post("/api/confirm-payment", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { bookingId, paymentIntentId } = req.body;
      const booking = await storage.getBookingById(bookingId);
      if (!booking || booking.clientId !== userId) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: "Payment not successful" });
          }
          if (paymentIntent.metadata.bookingId !== bookingId) {
            return res.status(400).json({ message: "Payment does not match booking" });
          }
        } catch (stripeError) {
          console.error("Error verifying payment:", stripeError);
          return res.status(400).json({ message: "Invalid payment" });
        }
      }
      const updatedBooking = await storage.updateBookingStatus(bookingId, "pending");
      res.json({ success: true, booking: updatedBooking });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Error confirming payment" });
    }
  });
  app2.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;
      if (bookingId) {
        await storage.updateBookingStatus(bookingId, "pending");
      }
    }
    res.json({ received: true });
  });
  const httpServer = createServer(app2);
  setupChatWebSocket(httpServer);
  return httpServer;
}

// server/authRoutes.ts
import { Router } from "express";
var router = Router();
router.get("/login", (req, res) => {
  res.redirect("/?auth=login");
});
router.post("/register", async (req, res) => {
  try {
    const { email, firstName, lastName, password, role, title, bio, experience, selectedServices } = req.body;
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({
        message: "Email, first name, last name, and password are required"
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long"
      });
    }
    if (role === "professional") {
      if (!title) {
        return res.status(400).json({
          message: "Professional title is required"
        });
      }
      if (!selectedServices || !Array.isArray(selectedServices) || selectedServices.length === 0) {
        return res.status(400).json({
          message: "Please select at least one service to offer"
        });
      }
    }
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }
    const hashedPassword = await hashPassword(password);
    const newUser = await storage.createUser({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      profileImageUrl: null,
      role: role || "client",
      stripeCustomerId: null,
      stripeConnectAccountId: null
    });
    if (role === "professional") {
      const professional = await storage.createProfessional({
        userId: newUser.id,
        title,
        bio: bio || "",
        experience: parseInt(experience) || 0
      });
      for (const serviceId of selectedServices) {
        await storage.createProfessionalService({
          professionalId: professional.id,
          serviceId: parseInt(serviceId),
          specialtyDescription: "",
          price: "99"
          // Fixed price for 1 hour session
        });
      }
    }
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      profileImageUrl: newUser.profileImageUrl
    });
    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email || "",
        firstName: newUser.firstName || "",
        lastName: newUser.lastName || "",
        profileImageUrl: newUser.profileImageUrl || void 0,
        role: newUser.role
      },
      token
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }
    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl
    });
    res.json({
      user: {
        id: user.id,
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        profileImageUrl: user.profileImageUrl || void 0,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/complete-profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, bio, experience, selectedServices } = req.body;
    const user = await storage.getUserById(userId);
    if (!user || user.role !== "professional") {
      return res.status(403).json({
        message: "Only professional users can complete professional profiles"
      });
    }
    const existingProfile = await storage.getProfessionalByUserId(userId);
    if (existingProfile) {
      return res.status(409).json({
        message: "Professional profile already exists"
      });
    }
    if (!title) {
      return res.status(400).json({
        message: "Professional title is required"
      });
    }
    if (!selectedServices || !Array.isArray(selectedServices) || selectedServices.length === 0) {
      return res.status(400).json({
        message: "Please select at least one service to offer"
      });
    }
    const professional = await storage.createProfessional({
      userId,
      title,
      bio: bio || "",
      experience: parseInt(experience) || 0
    });
    for (const serviceId of selectedServices) {
      await storage.createProfessionalService({
        professionalId: professional.id,
        serviceId: parseInt(serviceId),
        specialtyDescription: "",
        price: "99"
        // Fixed price for 1 hour session
      });
    }
    res.status(201).json({
      message: "Professional profile created successfully",
      professional
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/user", authenticateToken, async (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    email: user.email || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    profileImageUrl: user.profileImageUrl || void 0,
    role: user.role
  });
});
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});
router.delete("/account", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await storage.deleteUser(userId);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
});
var authRoutes_default = router;

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      host: "localhost",
      protocol: "ws",
      clientPort: 5e3
    },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use("/api/auth", authRoutes_default);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5050;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
