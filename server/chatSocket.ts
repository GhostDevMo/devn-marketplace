import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { verifyToken } from "./auth";
import type { ChatMessage, InsertChatMessage } from "@shared/schema";

const FREE_CHAT_DURATION_MS = 45 * 60 * 1000;
const FREE_CHAT_WARNING_MS = 40 * 60 * 1000;
const HELP_AGENT_EMAIL = process.env.HELP_AGENT_EMAIL || "detolakinbi@gmail.com";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  bookingId?: string;
  isFreeChat?: boolean;
  freeChatSessionId?: string;
  freeChatProfessionalId?: number;
  isHelpChat?: boolean;
  helpRoomUserId?: string; // the help-seeker's userId (room owner)
}

interface WSConnection {
  ws: AuthenticatedWebSocket;
  userId: string;
}

export function setupChatWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Store active connections by bookingId
  const connections = new Map<string, WSConnection[]>();

  // Handle upgrade request
  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    
    const token = url.searchParams.get("token");

    // ── Help chat upgrade ────────────────────────────────────────────────────
    if (url.pathname.startsWith("/ws/help-chat")) {
      if (!token) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }
      try {
        const decoded = verifyToken(token);
        if (!decoded?.id) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }

        const parts = url.pathname.split("/"); // ["", "ws", "help-chat", "admin", userId?]
        let helpRoomUserId: string;

        if (parts[3] === "admin") {
          // Admin connecting to a specific user's room
          const user = await storage.getUserById(decoded.id);
          if (!user || user.email !== HELP_AGENT_EMAIL) {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return;
          }
          helpRoomUserId = parts[4]; // the user whose room the admin is joining
          if (!helpRoomUserId) { socket.write("HTTP/1.1 400 Bad Request\r\n\r\n"); socket.destroy(); return; }
        } else {
          // Regular user connecting to their own help room
          helpRoomUserId = decoded.id;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          const authWs = ws as AuthenticatedWebSocket;
          authWs.userId = decoded.id;
          authWs.isHelpChat = true;
          authWs.helpRoomUserId = helpRoomUserId;
          wss.emit("connection", authWs, request);
        });
      } catch (err) {
        console.error("Help-chat upgrade error:", err);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n"); socket.destroy();
      }
      return;
    }

    // Route to free-chat handler
    // Client connects via /ws/free-chat/:professionalId
    // Professional connects via /ws/free-chat/session/:sessionId
    if (url.pathname.startsWith("/ws/free-chat/")) {
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      try {
        const decoded = verifyToken(token);
        if (!decoded?.id) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        let session: any;
        const parts = url.pathname.split("/");

        if (parts[3] === "session") {
          // Professional joining by session ID
          const sessionId = parts[4];
          session = await storage.getFreeChatSessionById(sessionId);
          if (!session) {
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
            socket.destroy();
            return;
          }
          // Verify this professional owns the session
          const professional = await storage.getProfessionalByUserId(decoded.id);
          if (!professional || professional.id !== session.professionalId) {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            socket.destroy();
            return;
          }
        } else {
          // Client joining by professional ID
          const professionalId = parseInt(parts[3]);
          if (isNaN(professionalId)) {
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            socket.destroy();
            return;
          }
          session = await storage.getFreeChatSession(decoded.id, professionalId);
          if (!session) {
            session = await storage.createFreeChatSession(decoded.id, professionalId);
          }
        }

        if (session.isExpired || (session.expiresAt && new Date(session.expiresAt) < new Date())) {
          socket.write("HTTP/1.1 403 Free chat expired\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          const authWs = ws as AuthenticatedWebSocket;
          authWs.userId = decoded.id;
          authWs.freeChatSessionId = session!.id;
          authWs.freeChatProfessionalId = session!.professionalId;
          authWs.isFreeChat = true;
          wss.emit("connection", authWs, request);
        });
      } catch (error) {
        console.error("Free-chat WebSocket upgrade error:", error);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
      return;
    }

    // Only handle /ws/chat/:bookingId paths
    if (!url.pathname.startsWith("/ws/chat/")) {
      socket.destroy();
      return;
    }

    const bookingId = url.pathname.split("/")[3];

    if (!token || !bookingId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      if (!decoded || !decoded.id) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Verify user is part of this booking
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      // Check if user is either the client or the professional's user
      if (booking.clientId !== decoded.id && booking.professional.userId !== decoded.id) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Check if booking is confirmed or completed
      if (booking.status !== "confirmed" && booking.status !== "completed") {
        socket.write("HTTP/1.1 403 Forbidden - Booking not confirmed\r\n\r\n");
        socket.destroy();
        return;
      }

      // Upgrade to WebSocket
      wss.handleUpgrade(request, socket, head, (ws) => {
        const authWs = ws as AuthenticatedWebSocket;
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

  // Handle WebSocket connections
  wss.on("connection", (ws: AuthenticatedWebSocket) => {
    const { userId } = ws;
    if (!userId) { ws.close(); return; }

    // ── Help-chat room ─────────────────────────────────────────────────────
    if (ws.isHelpChat && ws.helpRoomUserId) {
      const roomKey = `help:${ws.helpRoomUserId}`;
      if (!connections.has(roomKey)) connections.set(roomKey, []);
      connections.get(roomKey)!.push({ ws, userId });

      // Send history on connect
      storage.getHelpMessages(ws.helpRoomUserId).then((msgs) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "history", messages: msgs }));
        }
      }).catch(() => {});

      ws.on("message", async (data) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.type !== "message") return;
          const msg = await storage.createHelpMessage(ws.helpRoomUserId!, userId, payload.content);
          const sender = await storage.getUser(userId);
          const broadcast = { type: "message", message: { ...msg, sender } };
          (connections.get(roomKey) || []).forEach((conn) => {
            if (conn.ws.readyState === WebSocket.OPEN) {
              conn.ws.send(JSON.stringify(broadcast));
            }
          });
        } catch (err) {
          console.error("Help-chat message error:", err);
        }
      });

      ws.on("close", () => {
        const roomConns = connections.get(roomKey) || [];
        const idx = roomConns.findIndex((c) => c.userId === userId);
        if (idx !== -1) roomConns.splice(idx, 1);
        if (roomConns.length === 0) connections.delete(roomKey);
      });

      ws.on("error", (err) => console.error("Help-chat WS error:", err));
      return;
    }

    // ── Free-chat room ──────────────────────────────────────────────────────
    if (ws.isFreeChat && ws.freeChatSessionId) {
      const roomKey = `free:${ws.freeChatSessionId}`;
      if (!connections.has(roomKey)) connections.set(roomKey, []);
      connections.get(roomKey)!.push({ ws, userId });

      // Send current timer state immediately
      storage.getFreeChatSession(userId, ws.freeChatProfessionalId!).then((session) => {
        if (!session || !ws.readyState) return;
        const timeRemaining = session.expiresAt
          ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000))
          : 600;
        ws.send(JSON.stringify({ type: "timer", timeRemaining, started: !!session.startedAt }));
        ws.send(JSON.stringify({ type: "history", messages: [] }));
      });

      ws.on("message", async (data) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.type !== "message") return;

          const session = await storage.getFreeChatSession(userId, ws.freeChatProfessionalId!);
          if (!session) return;

          // Start the timer on first message
          let activeSession = session;
          if (!session.startedAt) {
            activeSession = await storage.startFreeChatTimer(session.id);
            // Schedule 5-min warning
            setTimeout(() => {
              const roomConns = connections.get(roomKey) || [];
              roomConns.forEach((conn) => {
                if (conn.ws.readyState === WebSocket.OPEN) {
                  conn.ws.send(JSON.stringify({ type: "time_warning", timeRemaining: 300 }));
                }
              });
            }, FREE_CHAT_WARNING_MS);
            // Schedule expiry broadcast
            setTimeout(async () => {
              await storage.expireFreeChatSession(activeSession.id);
              const roomConns = connections.get(roomKey) || [];
              roomConns.forEach((conn) => {
                if (conn.ws.readyState === WebSocket.OPEN) {
                  conn.ws.send(JSON.stringify({ type: "time_expired" }));
                }
              });
            }, FREE_CHAT_DURATION_MS);
          }

          // Check if expired
          if (activeSession.isExpired || (activeSession.expiresAt && new Date(activeSession.expiresAt) < new Date())) {
            ws.send(JSON.stringify({ type: "time_expired" }));
            return;
          }

          const sender = await storage.getUser(userId);
          const message = {
            id: Date.now().toString(),
            content: payload.content,
            senderId: userId,
            createdAt: new Date().toISOString(),
            sender,
          };

          const timeRemaining = activeSession.expiresAt
            ? Math.max(0, Math.floor((new Date(activeSession.expiresAt).getTime() - Date.now()) / 1000))
            : 600;

          const roomConns = connections.get(roomKey) || [];
          roomConns.forEach((conn) => {
            if (conn.ws.readyState === WebSocket.OPEN) {
              conn.ws.send(JSON.stringify({ type: "message", message }));
              conn.ws.send(JSON.stringify({ type: "timer", timeRemaining, started: true }));
            }
          });
        } catch (err) {
          console.error("Free-chat message error:", err);
        }
      });

      ws.on("close", () => {
        const roomConns = connections.get(roomKey) || [];
        const idx = roomConns.findIndex((c) => c.userId === userId);
        if (idx !== -1) roomConns.splice(idx, 1);
        if (roomConns.length === 0) connections.delete(roomKey);
      });

      ws.on("error", (err) => console.error("Free-chat WS error:", err));
      return;
    }

    // ── Booking chat room (existing logic) ──────────────────────────────────
    const { bookingId } = ws;
    if (!bookingId) { ws.close(); return; }

    console.log(`User ${userId} connected to booking ${bookingId} chat`);

    // Add connection to the map
    if (!connections.has(bookingId)) {
      connections.set(bookingId, []);
    }
    connections.get(bookingId)!.push({ ws, userId });

    // Send chat history to the newly connected user
    storage.getChatMessagesByBookingId(bookingId).then((messages) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "history",
          messages: messages,
        }));
      }
    }).catch((error) => {
      console.error("Error fetching chat history:", error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "history",
          messages: [],
        }));
      }
    });

    // Handle incoming messages
    ws.on("message", async (data) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === "message") {
          // Create and persist the message
          const messageData: InsertChatMessage = {
            bookingId: bookingId!,
            senderId: userId!,
            content: payload.content,
            attachmentUrl: payload.attachmentUrl,
            attachmentName: payload.attachmentName,
            attachmentSize: payload.attachmentSize,
            attachmentType: payload.attachmentType,
          };

          const savedMessage = await storage.createChatMessage(messageData);

          // Get sender info
          const sender = await storage.getUser(userId!);

          // Broadcast to all connections in this booking
          const bookingConnections = connections.get(bookingId!) || [];
          console.log(`Broadcasting message to ${bookingConnections.length} connections for booking ${bookingId}`);

          const messageWithSender = {
            type: "message",
            message: {
              ...savedMessage,
              sender,
            },
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
          message: "Failed to process message",
        }));
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      console.log(`User ${userId} disconnected from booking ${bookingId} chat`);

      // Remove connection from the map
      const bookingConnections = connections.get(bookingId!) || [];
      const index = bookingConnections.findIndex(conn => conn.userId === userId);
      if (index !== -1) {
        bookingConnections.splice(index, 1);
      }

      // Clean up empty booking connections
      if (bookingConnections.length === 0) {
        connections.delete(bookingId!);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return wss;
}
