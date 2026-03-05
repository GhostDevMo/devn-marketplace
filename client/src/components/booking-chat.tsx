import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Paperclip, Download, FileText } from "lucide-react";
import type { ChatMessage, User } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookingChatProps {
  bookingId: string;
  currentUserId: string;
}

interface ChatMessageWithSender extends ChatMessage {
  sender: User;
}

export default function BookingChat({ bookingId, currentUserId }: BookingChatProps) {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check chat status
  const { data: chatStatus } = useQuery({
    queryKey: [`/api/bookings/${bookingId}/chat-status`],
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    if (!chatStatus?.canAccess) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Build WebSocket URL from origin
    const origin = window.location.origin;
    const protocol = origin.startsWith("https") ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || (protocol === "wss:" ? "443" : "80");
    const wsUrl = `${protocol}//${host}:${port}/ws/chat/${bookingId}?token=${token}`;
    
    console.log("Connecting to WebSocket:", wsUrl);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);

      if (data.type === "history") {
        console.log("Setting chat history:", data.messages.length, "messages");
        setMessages(data.messages);
      } else if (data.type === "message") {
        console.log("New message received:", data.message);
        setMessages((prev) => {
          const newMessages = [...prev, data.message];
          console.log("Updated messages array:", newMessages.length);
          return newMessages;
        });
      } else if (data.type === "error") {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [bookingId, chatStatus?.canAccess, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!ws || !isConnected) {
      toast({
        title: "Not connected",
        description: "Chat connection is not available",
        variant: "destructive",
      });
      return;
    }

    try {
      let attachmentData = null;

      // Handle file upload if present
      if (selectedFile) {
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        const uploadResponse = await apiRequest("/api/chat/upload", {
          method: "POST",
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileData,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
          }),
        });

        attachmentData = {
          attachmentUrl: uploadResponse.url,
          attachmentName: uploadResponse.name,
          attachmentType: uploadResponse.type,
          attachmentSize: uploadResponse.size,
        };
      }

      // Send message via WebSocket
      ws.send(
        JSON.stringify({
          type: "message",
          content: newMessage.trim() || "(File attached)",
          ...attachmentData,
        })
      );

      setNewMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // If chat is not accessible, show message
  if (!chatStatus?.canAccess) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">
            {chatStatus?.reason === "Booking not confirmed"
              ? "Chat will be available once the booking is confirmed"
              : "Chat is available 30 minutes before and after your scheduled session"}
          </p>
          {chatStatus?.scheduledStart && (
            <p className="text-sm text-gray-500 mt-2">
              Scheduled: {format(new Date(chatStatus.scheduledStart), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Chat header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Session Chat</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="h-96 overflow-y-auto p-4 space-y-4" data-testid="chat-messages-container">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.sender.firstName} {msg.sender.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(msg.createdAt!), "h:mm a")}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.attachmentUrl && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <a
                            href={msg.attachmentUrl}
                            download={msg.attachmentName}
                            className="flex items-center gap-2 text-sm hover:underline"
                            data-testid={`attachment-${msg.id}`}
                          >
                            {msg.attachmentType?.startsWith("image/") ? (
                              <img
                                src={msg.attachmentUrl}
                                alt={msg.attachmentName || "Attachment"}
                                className="max-w-full rounded"
                              />
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                                <span>{msg.attachmentName}</span>
                                {msg.attachmentSize && (
                                  <span className="text-xs opacity-75">
                                    ({formatFileSize(msg.attachmentSize)})
                                  </span>
                                )}
                                <Download className="w-4 h-4" />
                              </>
                            )}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-200">
          {selectedFile && (
            <div className="mb-2 p-2 bg-gray-100 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                data-testid="button-remove-file"
              >
                Remove
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected}
              data-testid="button-attach-file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={!isConnected}
              data-testid="input-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected || (!newMessage.trim() && !selectedFile)}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
