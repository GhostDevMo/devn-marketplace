import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Clock, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface FreeChatSession {
  id: string;
  clientId: string;
  professionalId: number;
  startedAt: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  createdAt: string;
  client: { id: string; firstName: string | null; lastName: string | null; email: string };
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { firstName?: string | null; lastName?: string | null };
}

export default function ProfessionalFreeChat() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<FreeChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: freeChatSessions = [], refetch } = useQuery<FreeChatSession[]>({
    queryKey: ["/api/professional/free-chats"],
    refetchInterval: 15000, // poll every 15s for new chats
  });

  const activeSessions = freeChatSessions.filter((s) => !s.isExpired);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeSession) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const origin = window.location.origin;
    const protocol = origin.startsWith("https") ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || (protocol === "wss:" ? "443" : "80");
    const wsUrl = `${protocol}//${host}:${port}/ws/free-chat/session/${activeSession.id}?token=${token}`;

    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onerror = () => setIsConnected(false);

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "message") {
        setMessages((prev) => [...prev, payload.message]);
      } else if (payload.type === "timer") {
        setTimeRemaining(payload.timeRemaining);
        if (payload.started) {
          clearInterval(timerRef.current!);
          timerRef.current = setInterval(() => {
            setTimeRemaining((t) => (t !== null && t > 0 ? t - 1 : 0));
          }, 1000);
        }
      } else if (payload.type === "time_warning") {
        setTimeRemaining(payload.timeRemaining ?? 300);
      } else if (payload.type === "time_expired") {
        setTimeRemaining(0);
        clearInterval(timerRef.current!);
        refetch();
      }
    };

    setWs(socket);
    setMessages([]);

    return () => {
      socket.close();
      clearInterval(timerRef.current!);
    };
  }, [activeSession, refetch]);

  const sendMessage = () => {
    if (!input.trim() || !ws || !isConnected) return;
    ws.send(JSON.stringify({ type: "message", content: input.trim() }));
    setInput("");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const closeChat = () => {
    ws?.close();
    setActiveSession(null);
    setMessages([]);
    setWs(null);
    setIsConnected(false);
    setTimeRemaining(null);
    clearInterval(timerRef.current!);
  };

  if (activeSessions.length === 0 && !activeSession) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-[#3A6B47]" />
        Free Chat Requests
        {activeSessions.length > 0 && (
          <Badge className="bg-[#3A6B47] text-white">{activeSessions.length}</Badge>
        )}
      </h3>

      {!activeSession ? (
        <div className="grid grid-cols-1 gap-3">
          {activeSessions.map((session) => (
            <Card key={session.id} className="border-[#3A6B47]/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {session.client.firstName} {session.client.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {session.startedAt
                      ? `Chat in progress · started ${format(new Date(session.startedAt), "h:mm a")}`
                      : "Waiting to start"}
                  </p>
                </div>
                <Button
                  onClick={() => setActiveSession(session)}
                  className="bg-[#3A6B47] hover:bg-[#2d5538] text-white"
                  size="sm"
                >
                  {session.startedAt ? "Join Chat" : "Open Chat"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Chat header */}
          <div className="bg-[#3A6B47] px-4 py-3 text-white flex items-center justify-between">
            <div>
              <p className="font-bold">
                {activeSession.client.firstName} {activeSession.client.lastName}
              </p>
              <p className="text-xs text-white/70">Free intro chat</p>
            </div>
            <div className="flex items-center gap-3">
              {timeRemaining !== null && (
                <div className={`flex items-center gap-1 text-sm font-mono font-bold ${timeRemaining <= 300 ? "text-rose-300" : "text-white"}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(timeRemaining)}
                </div>
              )}
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-gray-400"}`} />
              <button onClick={closeChat} className="text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">
                {isConnected ? "Connected — waiting for messages" : "Connecting…"}
              </p>
            )}
            {messages.map((msg) => {
              const isOwn = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${isOwn ? "bg-[#3A6B47] text-white" : "bg-white border border-gray-200 text-gray-900"}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Reply…"
              disabled={!isConnected || timeRemaining === 0}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
              className="rounded-xl"
            />
            <Button
              onClick={sendMessage}
              disabled={!isConnected || !input.trim() || timeRemaining === 0}
              className="bg-[#3A6B47] hover:bg-[#2d5538] rounded-xl px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
