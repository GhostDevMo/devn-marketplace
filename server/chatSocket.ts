import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { verifyToken } from "./auth";
import type { ChatMessage, InsertChatMessage } from "@shared/schema";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  bookingId?: string;
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
    
    // Only handle /ws/chat/:bookingId paths
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
    const { userId, bookingId } = ws;
    
    if (!userId || !bookingId) {
      ws.close();
      return;
    }

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
