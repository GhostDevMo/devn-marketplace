import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Send, Clock, X, Zap } from "lucide-react";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { firstName?: string | null; lastName?: string | null };
}

interface Props {
  open: boolean;
  onClose: () => void;
  professionalId: number;
  professionalName: string;
}

export default function FreeChatModal({ open, onClose, professionalId, professionalName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(2700); // 45 min in seconds
  const [showWarning, setShowWarning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Start the countdown once timer is started
  useEffect(() => {
    if (!timerStarted || isExpired) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [timerStarted, isExpired]);

  // Init session + WebSocket when modal opens
  useEffect(() => {
    if (!open) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Create/resume session
    fetch(`/api/free-chat/start/${professionalId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.isExpired) {
          setIsExpired(true);
          return;
        }
        setSessionId(data.sessionId);
        setTimeRemaining(data.timeRemaining ?? 600);
        setTimerStarted(data.started ?? false);

        // Connect WebSocket
        const origin = window.location.origin;
        const protocol = origin.startsWith("https") ? "wss:" : "ws:";
        const host = window.location.hostname;
        const port = window.location.port || (protocol === "wss:" ? "443" : "80");
        const wsUrl = `${protocol}//${host}:${port}/ws/free-chat/${professionalId}?token=${token}`;
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
            if (payload.started) setTimerStarted(true);
          } else if (payload.type === "time_warning") {
            setShowWarning(true);
            setTimeRemaining(payload.timeRemaining ?? 300);
          } else if (payload.type === "time_expired") {
            setIsExpired(true);
            setTimeRemaining(0);
            setShowWarning(false);
            clearInterval(timerRef.current!);
          }
        };

        setWs(socket);
      })
      .catch(() => {
        toast({ title: "Error", description: "Could not start chat session.", variant: "destructive" });
      });

    return () => {
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, professionalId]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      ws?.close();
      setWs(null);
      setIsConnected(false);
      clearInterval(timerRef.current!);
    }
  }, [open, ws]);

  const sendMessage = () => {
    if (!input.trim() || !ws || !isConnected || isExpired) return;
    ws.send(JSON.stringify({ type: "message", content: input.trim() }));
    setInput("");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerColor =
    timeRemaining > 600 ? "text-emerald-600" : timeRemaining > 300 ? "text-amber-500" : "text-rose-500";

  const handleBookSession = () => {
    onClose();
    navigate(`/professional/${professionalId}`);
    setTimeout(() => {
      document.querySelector<HTMLElement>("[data-time-slot-picker]")?.scrollIntoView({ behavior: "smooth" });
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl gap-0 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#3A6B47] px-4 py-3 text-white flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">Free Intro Chat</p>
            <p className="font-bold">{professionalName}</p>
          </div>
          <div className="flex items-center gap-3">
            {timerStarted && !isExpired && (
              <div className={`flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 ${timerColor}`}>
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono font-bold text-sm">{formatTime(timeRemaining)}</span>
              </div>
            )}
            {!timerStarted && !isExpired && (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 text-white/80">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">10 min free</span>
              </div>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Intro banner */}
        {!timerStarted && !isExpired && (
          <div className="bg-[#FFE6C7]/70 border-b border-amber-200 px-4 py-2.5">
            <p className="text-xs text-amber-800 text-center">
              Your 45-minute free chat starts when you send your first message.
            </p>
          </div>
        )}

        {/* 5-min warning banner */}
        {showWarning && !isExpired && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs text-rose-700 font-semibold">
              ⏰ 5 minutes left in your free session
            </p>
            <button onClick={() => setShowWarning(false)} className="text-rose-400 hover:text-rose-600 text-xs ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Expired state */}
        {isExpired ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Your free chat has ended</p>
              <p className="text-sm text-gray-500 mt-1">
                To continue your conversation with {professionalName}, book a consulting session.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 w-full text-left">
              <p className="font-semibold text-gray-800 text-sm">Consulting Session</p>
              <p className="text-2xl font-bold text-[#3A6B47] mt-1">$25</p>
              <p className="text-xs text-gray-500 mt-1">1-hour session · Book any available time slot</p>
            </div>
            <Button
              onClick={handleBookSession}
              className="w-full bg-[#3A6B47] hover:bg-[#2d5538] text-white rounded-xl h-11 font-semibold"
            >
              Book a Consulting Session — $25
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-gray-400 text-sm">
              Maybe later
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">
                  Say hello to {professionalName}!
                </p>
              )}
              {messages.map((msg) => {
                const isOwn = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        isOwn ? "bg-[#3A6B47] text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {msg.sender?.firstName} {msg.sender?.lastName}
                        </p>
                      )}
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 shrink-0">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isConnected ? `Message ${professionalName}…` : "Connecting…"}
                  disabled={!isConnected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="rounded-xl"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!isConnected || !input.trim()}
                  className="bg-[#3A6B47] hover:bg-[#2d5538] rounded-xl px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {timerStarted && !isExpired && timeRemaining <= 300 && (
                <p className="text-xs text-rose-500 mt-2 text-center">
                  {formatTime(timeRemaining)} remaining — book a session to keep going
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
