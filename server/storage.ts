import {
  users,
  services,
  professionals,
  professionalServices,
  certifications,
  bookings,
  reviews,
  availabilitySlots,
  chatMessages,
  payoutRequests,
  passwordResetTokens,
  freeChats,
  type User,
  type UpsertUser,
  type Service,
  type Professional,
  type Booking,
  type Review,
  type AvailabilitySlot,
  type ChatMessage,
  type InsertBooking,
  type InsertReview,
  type InsertChatMessage,
  type PayoutRequest,
  type PasswordResetToken,
  type FreeChat,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, desc, asc, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: { id: string; email: string; password: string; firstName: string; lastName: string; role: "client" | "professional" }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // JWT Auth operations
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<User>;

  // Service operations
  getServices(): Promise<Service[]>;
  getServiceBySlug(slug: string): Promise<Service | undefined>;

  // Professional operations
  createProfessional(professionalData: { userId: string; title: string; bio: string; experience: number }): Promise<Professional>;
  createProfessionalService(serviceData: { professionalId: number; serviceId: number; specialtyDescription: string; price: string }): Promise<any>;
  getAllProfessionals(): Promise<(Professional & { 
    user: User, 
    services: Array<{ service: Service, price: string }>,
    certifications: Array<{ name: string, issuingOrganization: string | null }>,
    averageRating: number,
    reviewCount: number
  })[]>;
  getProfessionalsByService(serviceSlug: string): Promise<(Professional & { 
    user: User, 
    services: Array<{ service: Service, price: string }>,
    certifications: Array<{ name: string, issuingOrganization: string | null }>,
    averageRating: number,
    reviewCount: number
  })[]>;
  getProfessionalById(id: number): Promise<(Professional & { 
    user: User, 
    services: Array<{ service: Service, price: string }>,
    certifications: Array<{ name: string, issuingOrganization: string | null }>,
    reviews: Array<Review & { client: { firstName: string | null, lastName: string | null } }>
  }) | undefined>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingById(id: string): Promise<(Booking & { 
    professional: Professional & { user: User }, 
    service: Service,
    client: User 
  }) | undefined>;
  getBookingsByClient(clientId: string): Promise<Array<Booking & { 
    professional: Professional & { user: User }, 
    service: Service 
  }>>;
  getBookingsByProfessional(professionalId: number): Promise<Array<Booking & { 
    client: User, 
    service: Service 
  }>>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByProfessional(professionalId: number): Promise<Array<Review & { 
    client: { firstName: string | null, lastName: string | null } 
  }>>;

  // Additional user operations
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getProfessionalByUserId(userId: string): Promise<Professional | undefined>;
  updateProfessional(userId: string, data: { title?: string; bio?: string; experience?: number }): Promise<Professional>;
  deleteUser(id: string): Promise<void>;

  // Chat operations
  getChatMessagesByBookingId(bookingId: string): Promise<Array<ChatMessage & { sender: User }>>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Availability operations
  getAvailabilitySlots(professionalId: number): Promise<AvailabilitySlot[]>;
  setAvailabilitySlots(professionalId: number, slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): Promise<AvailabilitySlot[]>;

  // Payout operations
  getCompletedBookingsByProfessional(professionalId: number): Promise<Array<Booking & { service: Service, client: User }>>;
  createPayoutRequest(payoutData: { professionalId: number; amount: string; notes?: string }): Promise<any>;
  getPayoutRequestsByProfessional(professionalId: number): Promise<any[]>;

  // Password reset operations
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  // Free chat operations
  getFreeChatSession(clientId: string, professionalId: number): Promise<FreeChat | undefined>;
  getFreeChatSessionById(id: string): Promise<FreeChat | undefined>;
  getFreeChatSessionsByProfessional(professionalId: number): Promise<Array<FreeChat & { client: User }>>;
  createFreeChatSession(clientId: string, professionalId: number): Promise<FreeChat>;
  startFreeChatTimer(id: string): Promise<FreeChat>;
  expireFreeChatSession(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<User> {
    // Generate a UUID for the user ID if not provided
    const userId = userData.id || crypto.randomUUID();
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async createProfessional(professionalData: { userId: string; title: string; bio: string; experience: number }): Promise<Professional> {
    const [professional] = await db
      .insert(professionals)
      .values(professionalData)
      .returning();
    return professional;
  }

  async createProfessionalService(serviceData: { professionalId: number; serviceId: number; specialtyDescription: string; price: string }): Promise<any> {
    const [professionalService] = await db
      .insert(professionalServices)
      .values(serviceData)
      .returning();
    return professionalService;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(asc(services.name));
  }

  async getServiceBySlug(slug: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.slug, slug));
    return service;
  }

  // Professional operations
  async getAllProfessionals(): Promise<(Professional & { 
    user: User, 
    services: Array<{ service: Service, price: string }>,
    certifications: Array<{ name: string, issuingOrganization: string | null }>,
    averageRating: number,
    reviewCount: number
  })[]> {
    const professionalsData = await db
      .select({
        professional: professionals,
        user: users,
        service: services,
        professionalService: professionalServices,
      })
      .from(professionals)
      .innerJoin(users, eq(professionals.userId, users.id))
      .innerJoin(professionalServices, eq(professionals.id, professionalServices.professionalId))
      .innerJoin(services, eq(professionalServices.serviceId, services.id))
      .orderBy(desc(professionals.averageRating));

    // Group by professional and get additional data
    const professionalMap = new Map();

    for (const row of professionalsData) {
      if (!professionalMap.has(row.professional.id)) {
        const certs = await db
          .select({ name: certifications.name, issuingOrganization: certifications.issuingOrganization })
          .from(certifications)
          .where(eq(certifications.professionalId, row.professional.id));

        const reviewCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(reviews)
          .where(eq(reviews.professionalId, row.professional.id));

        professionalMap.set(row.professional.id, {
          ...row.professional,
          user: row.user,
          services: [],
          certifications: certs,
          averageRating: parseFloat(row.professional.averageRating || "0"),
          reviewCount: reviewCount[0]?.count || 0,
        });
      }

      const prof = professionalMap.get(row.professional.id);
      prof.services.push({
        service: row.service,
        price: row.professionalService.price,
      });
    }

    return Array.from(professionalMap.values());
  }

  async getProfessionalsByService(serviceSlug: string): Promise<(Professional & { 
    user: User, 
    services: Array<{ service: Service, price: string }>,
    certifications: Array<{ name: string, issuingOrganization: string | null }>,
    averageRating: number,
    reviewCount: number
  })[]> {
    const service = await this.getServiceBySlug(serviceSlug);
    if (!service) return [];

    const professionalsData = await db
      .select({
        professional: professionals,
        user: users,
        service: services,
        professionalService: professionalServices,
      })
      .from(professionals)
      .innerJoin(users, eq(professionals.userId, users.id))
      .innerJoin(professionalServices, eq(professionals.id, professionalServices.professionalId))
      .innerJoin(services, eq(professionalServices.serviceId, services.id))
      .where(eq(services.slug, serviceSlug))
      .orderBy(desc(professionals.averageRating));

    // Group by professional and get additional data
    const professionalMap = new Map();

    for (const row of professionalsData) {
      if (!professionalMap.has(row.professional.id)) {
        const certs = await db
          .select({ name: certifications.name, issuingOrganization: certifications.issuingOrganization })
          .from(certifications)
          .where(eq(certifications.professionalId, row.professional.id));

        const reviewCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(reviews)
          .where(eq(reviews.professionalId, row.professional.id));

        professionalMap.set(row.professional.id, {
          ...row.professional,
          user: row.user,
          services: [],
          certifications: certs,
          averageRating: parseFloat(row.professional.averageRating || "0"),
          reviewCount: reviewCount[0]?.count || 0,
        });
      }

      const prof = professionalMap.get(row.professional.id);
      prof.services.push({
        service: row.service,
        price: row.professionalService.price,
      });
    }

    return Array.from(professionalMap.values());
  }

  async getProfessionalById(id: number): Promise<(Professional & { 
    user: User, 
    services: Array<{ service: Service, price: string }>,
    certifications: Array<{ name: string, issuingOrganization: string | null }>,
    reviews: Array<Review & { client: { firstName: string | null, lastName: string | null } }>
  }) | undefined> {
    const [professional] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, id));

    if (!professional) return undefined;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, professional.userId));

    const servicesData = await db
      .select({
        service: services,
        price: professionalServices.price,
      })
      .from(professionalServices)
      .innerJoin(services, eq(professionalServices.serviceId, services.id))
      .where(eq(professionalServices.professionalId, id));

    const certs = await db
      .select({ name: certifications.name, issuingOrganization: certifications.issuingOrganization })
      .from(certifications)
      .where(eq(certifications.professionalId, id));

    const reviewsData = await db
      .select({
        review: reviews,
        client: { firstName: users.firstName, lastName: users.lastName },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.clientId, users.id))
      .where(eq(reviews.professionalId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    return {
      ...professional,
      user,
      services: servicesData.map(s => ({ service: s.service, price: s.price })),
      certifications: certs,
      reviews: reviewsData.map(r => ({ ...r.review, client: r.client })),
    };
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookingById(id: string): Promise<(Booking & { 
    professional: Professional & { user: User }, 
    service: Service,
    client: User 
  }) | undefined> {
    // Get booking first
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) return undefined;

    // Get professional with user
    const [professional] = await db
      .select({
        professional: professionals,
        user: users,
      })
      .from(professionals)
      .innerJoin(users, eq(professionals.userId, users.id))
      .where(eq(professionals.id, booking.professionalId));

    // Get service
    const [service] = await db.select().from(services).where(eq(services.id, booking.serviceId));

    // Get client
    const [client] = await db.select().from(users).where(eq(users.id, booking.clientId));

    if (!professional || !service || !client) return undefined;

    return {
      ...booking,
      professional: { ...professional.professional, user: professional.user },
      service,
      client,
    };
  }

  async getBookingsByClient(clientId: string): Promise<Array<Booking & { 
    professional: Professional & { user: User }, 
    service: Service,
    reviewId?: number
  }>> {
    const results = await db
      .select({
        booking: bookings,
        professional: professionals,
        professionalUser: users,
        service: services,
        review: reviews,
      })
      .from(bookings)
      .innerJoin(professionals, eq(bookings.professionalId, professionals.id))
      .innerJoin(users, eq(professionals.userId, users.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(reviews, eq(bookings.id, reviews.bookingId))
      .where(eq(bookings.clientId, clientId))
      .orderBy(desc(bookings.scheduledAt));

    return results.map(r => ({
      ...r.booking,
      professional: { ...r.professional, user: r.professionalUser },
      service: r.service,
      reviewId: r.review?.id,
    }));
  }

  async getBookingsByProfessional(professionalId: number): Promise<Array<Booking & { 
    client: User, 
    service: Service 
  }>> {
    const results = await db
      .select({
        booking: bookings,
        client: users,
        service: services,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.clientId, users.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.professionalId, professionalId))
      .orderBy(desc(bookings.scheduledAt));

    return results.map(r => ({
      ...r.booking,
      client: r.client,
      service: r.service,
    }));
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    
    if (!booking) return undefined;

    // When a booking is confirmed, check if this is a new client for this professional
    if (status === 'confirmed') {
      // Check if this client has any other confirmed or completed bookings with this professional
      const existingBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.professionalId, booking.professionalId),
          eq(bookings.clientId, booking.clientId),
          or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'completed')),
          sql`${bookings.id} != ${booking.id}` // Exclude the current booking
        ));

      // If no previous bookings, this is a new client - increment totalClients
      if (existingBookings.length === 0) {
        await db
          .update(professionals)
          .set({ 
            totalClients: sql`${professionals.totalClients} + 1`,
            updatedAt: new Date()
          })
          .where(eq(professionals.id, booking.professionalId));
      }
    }

    // When a booking is completed, increment totalSessions
    if (status === 'completed') {
      await db
        .update(professionals)
        .set({ 
          totalSessions: sql`${professionals.totalSessions} + 1`,
          updatedAt: new Date()
        })
        .where(eq(professionals.id, booking.professionalId));
    }

    return booking;
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();

    // Update professional's average rating
    const avgRating = await db
      .select({ avg: sql<number>`avg(${reviews.rating})` })
      .from(reviews)
      .where(eq(reviews.professionalId, review.professionalId));

    if (avgRating[0]?.avg) {
      await db
        .update(professionals)
        .set({ averageRating: avgRating[0].avg.toFixed(1) })
        .where(eq(professionals.id, review.professionalId));
    }

    return newReview;
  }

  async getReviewsByProfessional(professionalId: number): Promise<Array<Review & { 
    client: { firstName: string | null, lastName: string | null } 
  }>> {
    const results = await db
      .select({
        review: reviews,
        client: { firstName: users.firstName, lastName: users.lastName },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.clientId, users.id))
      .where(eq(reviews.professionalId, professionalId))
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({ ...r.review, client: r.client }));
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user (cascade will handle related data deletion via foreign key constraints)
    await db.delete(users).where(eq(users.id, id));
  }

  async getProfessionalByUserId(userId: string): Promise<Professional | undefined> {
    const [professional] = await db
      .select()
      .from(professionals)
      .where(eq(professionals.userId, userId));
    return professional;
  }

  async updateProfessional(userId: string, data: { title?: string; bio?: string; experience?: number }): Promise<Professional> {
    const [updated] = await db
      .update(professionals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(professionals.userId, userId))
      .returning();
    return updated;
  }

  async getChatMessagesByBookingId(bookingId: string): Promise<Array<ChatMessage & { sender: User }>> {
    const results = await db
      .select({
        message: chatMessages,
        sender: users,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.bookingId, bookingId))
      .orderBy(asc(chatMessages.createdAt));

    return results.map(r => ({ ...r.message, sender: r.sender }));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getCompletedBookingsByProfessional(professionalId: number): Promise<Array<Booking & { service: Service, client: User }>> {
    const results = await db
      .select({
        booking: bookings,
        service: services,
        client: users,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(users, eq(bookings.clientId, users.id))
      .where(and(
        eq(bookings.professionalId, professionalId),
        or(eq(bookings.status, 'completed'), eq(bookings.status, 'confirmed'))
      ))
      .orderBy(desc(bookings.scheduledAt));

    return results.map(r => ({ ...r.booking, service: r.service, client: r.client }));
  }

  async createPayoutRequest(payoutData: { professionalId: number; amount: string; notes?: string }): Promise<PayoutRequest> {
    const [request] = await db
      .insert(payoutRequests)
      .values({
        professionalId: payoutData.professionalId,
        amount: payoutData.amount,
        notes: payoutData.notes,
        status: 'pending',
      })
      .returning();
    return request;
  }

  async getPayoutRequestsByProfessional(professionalId: number): Promise<PayoutRequest[]> {
    return await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.professionalId, professionalId))
      .orderBy(desc(payoutRequests.requestedAt));
  }

  async getAvailabilitySlots(professionalId: number): Promise<AvailabilitySlot[]> {
    return await db
      .select()
      .from(availabilitySlots)
      .where(and(
        eq(availabilitySlots.professionalId, professionalId),
        eq(availabilitySlots.isActive, true),
      ))
      .orderBy(availabilitySlots.dayOfWeek, availabilitySlots.startTime);
  }

  async setAvailabilitySlots(
    professionalId: number,
    slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
  ): Promise<AvailabilitySlot[]> {
    // Delete all existing slots for this professional then insert the new set
    await db.delete(availabilitySlots).where(eq(availabilitySlots.professionalId, professionalId));

    if (slots.length === 0) return [];

    const inserted = await db
      .insert(availabilitySlots)
      .values(slots.map(s => ({ ...s, professionalId, isActive: true })))
      .returning();

    return inserted;
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    // Remove any existing tokens for this user first
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    const [created] = await db.insert(passwordResetTokens).values({ userId, token, expiresAt }).returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return row;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens).where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  async getFreeChatSession(clientId: string, professionalId: number): Promise<FreeChat | undefined> {
    const [session] = await db
      .select()
      .from(freeChats)
      .where(and(eq(freeChats.clientId, clientId), eq(freeChats.professionalId, professionalId)));
    return session;
  }

  async getFreeChatSessionById(id: string): Promise<FreeChat | undefined> {
    const [session] = await db.select().from(freeChats).where(eq(freeChats.id, id));
    return session;
  }

  async createFreeChatSession(clientId: string, professionalId: number): Promise<FreeChat> {
    const [session] = await db
      .insert(freeChats)
      .values({ clientId, professionalId })
      .onConflictDoUpdate({
        target: [freeChats.clientId, freeChats.professionalId],
        set: {
          // Reset the session if it was expired — gives fresh 45-min chat
          startedAt: null,
          expiresAt: null,
          isExpired: false,
          createdAt: new Date(),
        },
        where: sql`${freeChats.isExpired} = true`,
      })
      .returning();
    return session;
  }

  async getFreeChatSessionsByProfessional(professionalId: number): Promise<Array<FreeChat & { client: User }>> {
    const sessions = await db
      .select()
      .from(freeChats)
      .where(and(eq(freeChats.professionalId, professionalId), eq(freeChats.isExpired, false)));
    const withClients = await Promise.all(
      sessions.map(async (s) => {
        const client = await this.getUser(s.clientId);
        return { ...s, client: client! };
      })
    );
    return withClients;
  }

  async startFreeChatTimer(id: string): Promise<FreeChat> {
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 10 * 60 * 1000); // 10 minutes
    const [session] = await db
      .update(freeChats)
      .set({ startedAt, expiresAt })
      .where(eq(freeChats.id, id))
      .returning();
    return session;
  }

  async expireFreeChatSession(id: string): Promise<void> {
    await db.update(freeChats).set({ isExpired: true }).where(eq(freeChats.id, id));
  }
}

export async function upsertUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  password?: string;
}) {
  return db.insert(users).values(user).onConflictDoUpdate({
    target: users.id,
    set: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      ...(user.password && { password: user.password }),
    },
  });
}

export async function getUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

export async function createUser(user: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  profileImageUrl?: string;
}) {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newUser = { ...user, id };
  await db.insert(users).values(newUser);
  return newUser;
}

export const storage = new DatabaseStorage();