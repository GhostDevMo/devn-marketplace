import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";

const HELP_AGENT_EMAIL = "detolakinbi@gmail.com";

interface Message {
  id: string;
  userId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { firstName?: string | null; lastName?: string | null; email: string };
}

interface ConversationEntry {
  user: { id: string; firstName?: string | null; lastName?: string | null; email: string };
  lastMessage: Message;
}

function ChatPane({ userId, adminId }: { userId: string; adminId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/help-chat/admin/${userId}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); wsRef.current = null; };
    ws.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === "history") setMessages(payload.messages || []);
      else if (payload.type === "message") setMessages((prev) => [...prev, payload.message]);
    };
    return () => ws.close();
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", content: text }));
    setInput("");
  };

  const senderLabel = (msg: Message) => {
    if (msg.senderId === adminId) return "You (Support)";
    if (msg.sender?.firstName) return `${msg.sender.firstName} ${msg.sender.lastName || ""}`.trim();
    return msg.sender?.email || "User";
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isAdmin = msg.senderId === adminId;
          return (
            <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                isAdmin ? "bg-green-600 text-white rounded-br-sm" : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
              }`}>
                <p className={`text-xs font-semibold mb-0.5 ${isAdmin ? "text-green-100" : "text-green-600"}`}>
                  {senderLabel(msg)}
                </p>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isAdmin ? "text-green-200" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t bg-white flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={connected ? "Type a reply…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 text-sm"
        />
        <Button size="icon" onClick={send} disabled={!connected || !input.trim()} className="bg-green-600 hover:bg-green-700 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminHelpInbox() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: conversations = [], isLoading: convLoading } = useQuery<ConversationEntry[]>({
    queryKey: ["/api/admin/help-conversations"],
    queryFn: () => apiRequest("GET", "/api/admin/help-conversations").then((r) => r.json()),
    enabled: !!isAuthenticated && user?.email === HELP_AGENT_EMAIL,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user && user.email !== HELP_AGENT_EMAIL))) {
      navigate("/");
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading || !user) return null;

  const selectedConvo = conversations.find((c) => c.user.id === selectedUserId);
  const userName = (u: ConversationEntry["user"]) =>
    u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        {selectedUserId && (
          <button onClick={() => setSelectedUserId(null)} className="sm:hidden mr-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">D</div>
        <div>
          <p className="font-semibold">Support Inbox</p>
          <p className="text-xs text-green-100">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full sm:w-72 border-r flex flex-col shrink-0 ${selectedUserId ? "hidden sm:flex" : "flex"}`}>
          {convLoading && <p className="p-4 text-sm text-gray-500">Loading…</p>}
          {!convLoading && conversations.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No conversations yet</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.user.id}
              onClick={() => setSelectedUserId(c.user.id)}
              className={`text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${selectedUserId === c.user.id ? "bg-green-50 border-l-4 border-l-green-600" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {(c.user.firstName || c.user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{userName(c.user)}</p>
                  <p className="text-xs text-gray-500 truncate">{c.lastMessage.content}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!selectedUserId ? "hidden sm:flex" : "flex"}`}>
          {selectedUserId && selectedConvo ? (
            <>
              <div className="px-4 py-2 border-b bg-white shrink-0">
                <p className="font-semibold text-gray-900">{userName(selectedConvo.user)}</p>
                <p className="text-xs text-gray-500">{selectedConvo.user.email}</p>
              </div>
              <ChatPane userId={selectedUserId} adminId={user.id} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
