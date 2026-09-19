import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HELP_AGENT_EMAIL = "detolakinbi@gmail.com";

interface Message {
  id: string;
  userId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { firstName?: string | null; lastName?: string | null; email: string };
}

export default function HelpChatBubble() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/help-chat?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); wsRef.current = null; };
    ws.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === "history") {
        setMessages(payload.messages || []);
      } else if (payload.type === "message") {
        setMessages((prev) => [...prev, payload.message]);
      }
    };
  }, []);

  useEffect(() => {
    if (open) {
      connectWS();
    } else {
      wsRef.current?.close();
      wsRef.current = null;
    }
  }, [open, connectWS]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Must be after all hooks — don't show for admin or unauthenticated users
  if (!isAuthenticated || !user || user.email === HELP_AGENT_EMAIL) return null;

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", content: text }));
    setInput("");
  };

  const senderName = (msg: Message) => {
    if (msg.senderId === user.id) return "You";
    if (msg.sender?.firstName) return msg.sender.firstName;
    return "Support";
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center hover:bg-green-700 transition-colors"
        aria-label="Open help chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-40 right-4 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden"
          style={{ maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              D
            </div>
            <div>
              <p className="font-semibold text-sm">Devn Support</p>
              <p className="text-xs text-green-100">{connected ? "Online" : "Connecting…"}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm mt-4">
                Hi! How can we help you today?
              </p>
            )}
            {messages.map((msg) => {
              const isOwn = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      isOwn
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-semibold text-green-600 mb-0.5">{senderName(msg)}</p>
                    )}
                    <p>{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-gray-200 flex gap-2 bg-white">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!connected || !input.trim()}
              className="bg-green-600 hover:bg-green-700 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
