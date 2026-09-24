import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { professionals, bookings, reviews, services, availabilitySlots, insertReviewSchema } from "@shared/schema";
import { db } from "./db";
import { setupChatWebSocket } from "./chatSocket";

// Import the auth middleware from auth.ts instead of duplicating
import { authenticateToken, AuthRequest } from "./auth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Service routes
  app.get('/api/services', async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Professional routes
  app.get('/api/professionals', async (req: AuthRequest, res) => {
    try {
      const professionals = await storage.getAllProfessionals();
      res.json(professionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ message: "Failed to fetch professionals" });
    }
  });

  app.get('/api/professionals/service/:serviceSlug', async (req: AuthRequest, res) => {
    try {
      const { serviceSlug } = req.params;
      const professionals = await storage.getProfessionalsByService(serviceSlug);
      res.json(professionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ message: "Failed to fetch professionals" });
    }
  });

  // Professional specific routes (must come before parameterized route)
  app.get('/api/professional/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.patch('/api/professional/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { title, bio, experience } = req.body;
      const updated = await storage.updateProfessional(userId, {
        ...(title !== undefined && { title }),
        ...(bio !== undefined && { bio }),
        ...(experience !== undefined && { experience: parseInt(experience) || 0 }),
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating professional profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/professional/bookings', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      // Get professional record for this user
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }

      const bookings = await storage.getBookingsByProfessional(professional.id);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching professional bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Payout routes (must come before parameterized :id route)
  app.get('/api/professional/earnings', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      // Get professional profile
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }

      // Get completed bookings
      const completedBookings = await storage.getCompletedBookingsByProfessional(professional.id);

      // Calculate earnings with 70/30 split
      const earnings = completedBookings.map((booking) => {
        const totalAmount = parseFloat(booking.amount);
        const platformFee = totalAmount * 0.30;
        const professionalEarning = totalAmount * 0.70;

        return {
          ...booking,
          totalAmount,
          platformFee,
          professionalEarning,
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
          availableForPayout: totalEarned.toFixed(2),
        },
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  app.post('/api/professional/payout-request', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { amount, notes } = req.body;

      // Validate amount
      if (!amount || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount. Must be a positive number." });
      }

      // Get professional profile
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }

      // Create payout request with properly formatted amount
      const payoutRequest = await storage.createPayoutRequest({
        professionalId: professional.id,
        amount: amount.toFixed(2),
        notes,
      });

      res.json(payoutRequest);
    } catch (error) {
      console.error("Error creating payout request:", error);
      res.status(500).json({ message: "Failed to create payout request" });
    }
  });

  app.get('/api/professional/payout-requests', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      // Get professional profile
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }

      // Get payout requests
      const payoutRequests = await storage.getPayoutRequestsByProfessional(professional.id);

      res.json(payoutRequests);
    } catch (error) {
      console.error("Error fetching payout requests:", error);
      res.status(500).json({ message: "Failed to fetch payout requests" });
    }
  });

  // Availability management routes (must come before parameterized :id route)
  app.get('/api/professional/availability', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const professional = await storage.getProfessionalByUserId(req.user!.id);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }
      const slots = await storage.getAvailabilitySlots(professional.id);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.put('/api/professional/availability', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const professional = await storage.getProfessionalByUserId(req.user!.id);
      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found" });
      }

      const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = req.body.slots;

      if (!Array.isArray(slots)) {
        return res.status(400).json({ message: "slots must be an array" });
      }

      // Validate each slot
      for (const slot of slots) {
        if (
          typeof slot.dayOfWeek !== 'number' || slot.dayOfWeek < 0 || slot.dayOfWeek > 6 ||
          typeof slot.startTime !== 'string' || !/^\d{2}:\d{2}$/.test(slot.startTime) ||
          typeof slot.endTime !== 'string' || !/^\d{2}:\d{2}$/.test(slot.endTime) ||
          slot.startTime >= slot.endTime
        ) {
          return res.status(400).json({ message: "Invalid slot data" });
        }
      }

      const saved = await storage.setAvailabilitySlots(professional.id, slots);
      res.json(saved);
    } catch (error) {
      console.error("Error saving availability:", error);
      res.status(500).json({ message: "Failed to save availability" });
    }
  });

  app.get('/api/professional/:id', async (req: AuthRequest, res) => {
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

  // Get available time slots for a professional
  app.get('/api/professional/:id/available-slots', async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid professional ID" });
      }

      // Fetch this professional's availability windows from the DB
      const availabilityWindows = await db
        .select()
        .from(availabilitySlots)
        .where(eq(availabilitySlots.professionalId, id));

      // Get existing bookings for this professional (pending or confirmed)
      const existingBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.professionalId, id));

      const bookedTimes = new Set(
        existingBookings
          .filter(b => b.status === 'pending' || b.status === 'confirmed')
          .map(b => new Date(b.scheduledAt).toISOString())
      );

      // Helper: format an hour number as "H:00 AM/PM"
      const formatHour = (hour: number): string => {
        const period = hour < 12 ? 'AM' : 'PM';
        const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${h}:00 ${period}`;
      };

      const slots = [];
      const today = new Date();
      const now = new Date();

      // If the professional has no availability configured, fall back to default windows
      const hasAvailability = availabilityWindows.length > 0;

      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat

        const dayName = i === 0 ? 'Today' :
                       i === 1 ? 'Tomorrow' :
                       date.toLocaleDateString('en-US', { weekday: 'long' });

        // Determine which hours are available for this day
        let hours: number[] = [];

        if (hasAvailability) {
          const dayWindows = availabilityWindows.filter(
            w => w.dayOfWeek === dayOfWeek && w.isActive
          );
          for (const window of dayWindows) {
            const [startH] = window.startTime.split(':').map(Number);
            const [endH] = window.endTime.split(':').map(Number);
            for (let h = startH; h < endH; h++) {
              hours.push(h);
            }
          }
        } else {
          // Default fallback: 9 AM, 11 AM, 2 PM, 4 PM
          hours = [9, 11, 14, 16];
        }

        for (const hour of hours) {
          const slotDate = new Date(date);
          slotDate.setHours(hour, 0, 0, 0);

          // Skip past slots
          if (i === 0 && slotDate.getTime() <= now.getTime()) continue;

          const year = slotDate.getFullYear();
          const month = String(slotDate.getMonth() + 1).padStart(2, '0');
          const day = String(slotDate.getDate()).padStart(2, '0');
          const hourStr = String(slotDate.getHours()).padStart(2, '0');
          const localDateTimeString = `${year}-${month}-${day}T${hourStr}:00`;

          if (!bookedTimes.has(slotDate.toISOString())) {
            slots.push({
              id: localDateTimeString,
              day: dayName,
              time: formatHour(hour),
              date: date.toDateString(),
              fullDate: slotDate,
            });
          }
        }
      }

      res.json(slots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });

  // Booking routes
  app.post('/api/bookings', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const professionalId = parseInt(req.body.professionalId);
      const scheduledAt = new Date(req.body.scheduledAt);
      
      // Normalize the scheduled time to remove milliseconds for consistent comparison
      scheduledAt.setMilliseconds(0);
      scheduledAt.setSeconds(0);
      
      // Check if the time slot is already booked
      const existingBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.professionalId, professionalId));
      
      const isSlotTaken = existingBookings.some(booking => {
        const bookingTime = new Date(booking.scheduledAt);
        bookingTime.setMilliseconds(0);
        bookingTime.setSeconds(0);
        return (
          (booking.status === 'pending' || booking.status === 'confirmed') &&
          bookingTime.getTime() === scheduledAt.getTime()
        );
      });
      
      if (isSlotTaken) {
        return res.status(409).json({ 
          message: "This time slot is no longer available. Please select another time." 
        });
      }
      
      // Get service to fetch the correct base price
      const serviceId = parseInt(req.body.serviceId);
      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);
      
      if (!service || service.length === 0) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Use the service's base price instead of time-based calculation
      const amount = parseFloat(service[0].basePrice || '99');
      const platformFee = amount * 0.3;
      const professionalAmount = amount * 0.7;

      const isBeta = process.env.BETA_MODE === "true";
      const bookingData = {
        ...req.body,
        amount: isBeta ? "25.00" : amount.toFixed(2),
        clientId: userId,
        scheduledAt: scheduledAt,
        platformFee: isBeta ? "0.00" : platformFee.toFixed(2),
        professionalAmount: isBeta ? "25.00" : professionalAmount.toFixed(2),
        // In beta, skip payment and auto-confirm immediately
        ...(isBeta && { status: "confirmed" }),
      };

      const booking = await storage.createBooking(bookingData);

      // Notify the professional of new booking request
      const professional = await storage.getProfessionalById(booking.professionalId);
      const client = await storage.getUser(booking.clientId);
      if (professional?.user?.id) {
        const clientName = client ? `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.email : "A client";
        const scheduledDate = new Date(booking.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        await storage.createNotification({
          userId: professional.user.id,
          type: isBeta ? "booking_confirmed" : "booking_request",
          title: isBeta ? "New Booking Confirmed" : "New Booking Request",
          message: isBeta
            ? `${clientName} booked a session on ${scheduledDate}.`
            : `${clientName} requested a session on ${scheduledDate}. Please confirm or decline.`,
          bookingId: booking.id,
        });
      }
      // In beta, also notify the client their booking is confirmed
      if (isBeta && client) {
        const scheduledDate = new Date(booking.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        const profName = professional?.user ? `${professional.user.firstName || ""} ${professional.user.lastName || ""}`.trim() : "your professional";
        await storage.createNotification({
          userId: client.id,
          type: "booking_confirmed",
          title: "Booking Confirmed",
          message: `Your session with ${profName} on ${scheduledDate} is confirmed.`,
          bookingId: booking.id,
        });
      }

      res.json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      
      // Handle unique constraint violation (duplicate booking)
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        return res.status(409).json({ 
          message: "This time slot is no longer available. Please select another time." 
        });
      }
      
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get('/api/bookings', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const bookings = await storage.getBookingsByClient(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/booking/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const booking = await storage.getBookingById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user owns this booking (client or professional)
      console.log('Booking authorization check:', {
        bookingClientId: booking.clientId,
        requestingUserId: userId,
        professionalUserId: booking.professional?.userId,
        bookingData: JSON.stringify(booking, null, 2)
      });
      
      // Check if user owns this booking (client or professional)
      if (booking.clientId !== userId && booking.professional?.userId !== userId) {
        console.log('Authorization failed - user does not own this booking');
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.patch('/api/booking/:id/status', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { status } = req.body;
      
      // First get the booking to check authorization
      const booking = await storage.getBookingById(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only the assigned professional can update booking status
      if (booking.professional?.userId !== userId) {
        return res.status(403).json({ message: "Only the assigned professional can update booking status" });
      }
      
      const updatedBooking = await storage.updateBookingStatus(req.params.id, status);

      // Notify client of status change
      if (status === "confirmed" || status === "cancelled") {
        const scheduledDate = new Date(booking.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
        const profName = `${booking.professional.user.firstName || ""} ${booking.professional.user.lastName || ""}`.trim() || "your professional";
        await storage.createNotification({
          userId: booking.clientId,
          type: status === "confirmed" ? "booking_confirmed" : "booking_cancelled",
          title: status === "confirmed" ? "Booking Confirmed" : "Booking Declined",
          message: status === "confirmed"
            ? `Your session with ${profName} on ${scheduledDate} has been confirmed.`
            : `Your session with ${profName} on ${scheduledDate} was declined. Please book another time.`,
          bookingId: booking.id,
        });
      }

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Check if user is a professional
  app.get('/api/professional/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;

      // Only allow users to check their own professional status
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



  // Update profile route
  app.patch('/api/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Update user profile
      const updatedUser = await storage.updateUser(userId, updateData);
      // Don't echo profileImageUrl back — it can be a large base64 string
      const { profileImageUrl: _omit, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Review routes
  app.post('/api/reviews', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        clientId: userId,
      });

      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Chat routes
  app.get('/api/bookings/:bookingId/messages', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.id;

      // Verify user is part of this booking
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

  app.get('/api/bookings/:bookingId/chat-status', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.id;

      // Get booking
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify user is part of this booking
      if (booking.clientId !== userId && booking.professional.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check if booking is confirmed or completed
      if (booking.status !== "confirmed" && booking.status !== "completed") {
        return res.json({ 
          canAccess: false, 
          reason: "Booking not confirmed" 
        });
      }

      // Allow chat access for all confirmed/completed bookings
      res.json({
        canAccess: true,
        reason: null,
        scheduledStart: booking.scheduledAt,
      });
    } catch (error) {
      console.error("Error checking chat status:", error);
      res.status(500).json({ message: "Failed to check chat status" });
    }
  });

  app.post('/api/chat/upload', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { fileName, fileData, fileType, fileSize } = req.body;

      // Basic validation
      if (!fileName || !fileData || !fileType) {
        return res.status(400).json({ message: "Missing file data" });
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        return res.status(400).json({ message: "File too large (max 10MB)" });
      }

      // For now, we'll store the base64 data directly
      // In production, you'd upload to S3 or similar storage
      const fileUrl = `data:${fileType};base64,${fileData}`;

      res.json({
        url: fileUrl,
        name: fileName,
        type: fileType,
        size: fileSize,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Create payment intent
  app.post('/api/create-payment-intent', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { bookingId } = req.body;

      // Get booking to verify ownership and get correct amount
      const booking = await storage.getBookingById(bookingId);
      if (!booking || booking.clientId !== userId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Use server-side amount from booking, not client-provided
      const amount = parseFloat(booking.amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          bookingId,
          clientId: userId,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent" });
    }
  });

  // Confirm payment and update booking status
  app.post('/api/confirm-payment', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { bookingId, paymentIntentId } = req.body;

      // Verify the booking belongs to the user
      const booking = await storage.getBookingById(bookingId);
      if (!booking || booking.clientId !== userId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify payment was actually successful (if paymentIntentId provided)
      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ message: "Payment not successful" });
          }
          if (paymentIntent.metadata.bookingId !== bookingId) {
            return res.status(400).json({ message: "Payment does not match booking" });
          }
        } catch (stripeError) {
          console.error('Error verifying payment:', stripeError);
          return res.status(400).json({ message: "Invalid payment" });
        }
      }

      // Update booking status to pending (awaiting professional confirmation)
      const updatedBooking = await storage.updateBookingStatus(bookingId, 'pending');

      res.json({ success: true, booking: updatedBooking });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Error confirming payment" });
    }
  });

  // Webhook for successful payments
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;

      if (bookingId) {
        await storage.updateBookingStatus(bookingId, 'pending');
      }
    }

    res.json({ received: true });
  });

  // ─── Professional free chat inbox ───────────────────────────────────────────
  app.get('/api/professional/free-chats', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const professional = await storage.getProfessionalByUserId(userId);
      if (!professional) return res.status(404).json({ message: "Professional profile not found" });
      const sessions = await storage.getFreeChatSessionsByProfessional(professional.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching professional free chats:", error);
      res.status(500).json({ message: "Failed to fetch free chats" });
    }
  });


  // ─── Inbox route ─────────────────────────────────────────────────────────────
  app.get('/api/inbox', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role === 'professional') {
        const professional = await storage.getProfessionalByUserId(userId);
        if (!professional) return res.json({ bookingChats: [], freeChats: [] });

        const bookings = await storage.getBookingsByProfessional(professional.id);
        const bookingChats = bookings
          .filter((b) => b.status === 'confirmed')
          .map((b) => ({
            id: b.id,
            type: 'booking',
            otherPartyName: `${b.client.firstName || ''} ${b.client.lastName || ''}`.trim() || b.client.email,
            otherPartyInitials: ((b.client.firstName?.[0] || '') + (b.client.lastName?.[0] || '')).toUpperCase() || b.client.email[0].toUpperCase(),
            scheduledAt: b.scheduledAt,
            status: b.status,
            label: b.service?.name || 'Session',
          }));

        const freeChats = await storage.getFreeChatSessionsByProfessional(professional.id);
        const freeChatItems = freeChats.map((fc) => ({
          id: fc.id,
          type: 'free',
          otherPartyName: `${fc.client.firstName || ''} ${fc.client.lastName || ''}`.trim() || fc.client.email,
          otherPartyInitials: ((fc.client.firstName?.[0] || '') + (fc.client.lastName?.[0] || '')).toUpperCase() || fc.client.email[0].toUpperCase(),
          scheduledAt: fc.createdAt,
          status: fc.isExpired ? 'ended' : 'active',
          label: 'Free 45-min Chat',
          expiresAt: fc.expiresAt,
          professionalId: professional.id,
        }));

        return res.json({ bookingChats, freeChats: freeChatItems });
      }

      // Client
      const bookings = await storage.getBookingsByClient(userId);
      const bookingChats = bookings
        .filter((b) => b.status === 'confirmed')
        .map((b) => ({
          id: b.id,
          type: 'booking',
          otherPartyName: `${b.professional.user.firstName || ''} ${b.professional.user.lastName || ''}`.trim() || b.professional.user.email,
          otherPartyInitials: ((b.professional.user.firstName?.[0] || '') + (b.professional.user.lastName?.[0] || '')).toUpperCase() || b.professional.user.email[0].toUpperCase(),
          scheduledAt: b.scheduledAt,
          status: b.status,
          label: b.service?.name || 'Session',
        }));

      // Find active free chat sessions for this client
      const { rows: fcRows } = await (await import('./db')).pool.query<any>(
        `SELECT fc.*, p.id as prof_id, pu.first_name, pu.last_name, pu.email as prof_email
         FROM free_chats fc
         JOIN professionals p ON p.id = fc.professional_id
         JOIN users pu ON pu.id = p.user_id
         WHERE fc.client_id = $1 AND fc.is_expired = false`,
        [userId]
      );
      const freeChats = fcRows.map((r: any) => ({
        id: r.id,
        type: 'free',
        otherPartyName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.prof_email,
        otherPartyInitials: ((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() || r.prof_email[0].toUpperCase(),
        scheduledAt: r.created_at,
        status: r.is_expired ? 'ended' : 'active',
        label: 'Free 45-min Chat',
        expiresAt: r.expires_at,
        professionalId: r.prof_id,
      }));

      res.json({ bookingChats, freeChats });
    } catch (err) {
      console.error("Inbox error:", err);
      res.status(500).json({ message: "Failed to load inbox" });
    }
  });

  // ─── Notification routes ─────────────────────────────────────────────────────
  app.get('/api/notifications', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notifs = await storage.getNotifications(req.user!.id);
      res.json(notifs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch('/api/notifications/:id/read', authenticateToken, async (req: AuthRequest, res) => {
    try {
      await storage.markNotificationRead(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.patch('/api/notifications/read-all', authenticateToken, async (req: AuthRequest, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark all read" });
    }
  });

  // ─── Help chat routes ────────────────────────────────────────────────────────
  const HELP_AGENT_EMAIL = process.env.HELP_AGENT_EMAIL || "detolakinbi@gmail.com";

  app.get('/api/help-chat/messages', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const msgs = await storage.getHelpMessages(req.user!.id);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch help messages" });
    }
  });

  // Admin: list all help conversations
  app.get('/api/admin/help-conversations', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user || user.email !== HELP_AGENT_EMAIL) return res.status(403).json({ message: "Forbidden" });
      const conversations = await storage.getHelpConversationUsers();
      res.json(conversations);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Admin: get messages for a specific user
  app.get('/api/admin/help-conversations/:userId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user || user.email !== HELP_AGENT_EMAIL) return res.status(403).json({ message: "Forbidden" });
      const msgs = await storage.getHelpMessages(req.params.userId);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });


  // ─── Free chat routes ────────────────────────────────────────────────────────
  // Start or resume a free chat session with a professional
  app.post('/api/free-chat/start/:professionalId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.user!.id;
      const professionalId = parseInt(req.params.professionalId);
      if (isNaN(professionalId)) return res.status(400).json({ message: "Invalid professional ID" });

      let session = await storage.getFreeChatSession(clientId, professionalId);
      if (!session) {
        session = await storage.createFreeChatSession(clientId, professionalId);
      }

      const timeRemaining = session.expiresAt
        ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000))
        : 2700; // 45 min in seconds

      res.json({
        sessionId: session.id,
        isExpired: session.isExpired || (session.expiresAt ? new Date(session.expiresAt) < new Date() : false),
        started: !!session.startedAt,
        timeRemaining,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error("Error starting free chat:", error);
      res.status(500).json({ message: "Failed to start free chat session" });
    }
  });

  // Get free chat status for a professional
  app.get('/api/free-chat/status/:professionalId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.user!.id;
      const professionalId = parseInt(req.params.professionalId);
      if (isNaN(professionalId)) return res.status(400).json({ message: "Invalid professional ID" });

      const session = await storage.getFreeChatSession(clientId, professionalId);
      if (!session) {
        return res.json({ hasSession: false, isExpired: false, timeRemaining: 600 });
      }

      const now = new Date();
      const isExpired = session.isExpired || (session.expiresAt ? new Date(session.expiresAt) < now : false);

      // Auto-expire in DB if time ran out
      if (!session.isExpired && session.expiresAt && new Date(session.expiresAt) < now) {
        await storage.expireFreeChatSession(session.id);
      }

      const timeRemaining = session.expiresAt
        ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now.getTime()) / 1000))
        : 2700;

      res.json({
        hasSession: true,
        sessionId: session.id,
        isExpired,
        started: !!session.startedAt,
        timeRemaining,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching free chat status:", error);
      res.status(500).json({ message: "Failed to fetch free chat status" });
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for chat
  setupChatWebSocket(httpServer);

  return httpServer;
}