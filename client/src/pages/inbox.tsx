import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import FreeChatModal from "@/components/free-chat-modal";

interface ConvoItem {
  id: string;
  type: "booking" | "free";
  otherPartyName: string;
  otherPartyInitials: string;
  scheduledAt: string;
  status: "confirmed" | "active" | "ended";
  label: string;
  expiresAt?: string | null;
  professionalId?: number;
}

interface InboxData {
  bookingChats: ConvoItem[];
  freeChats: ConvoItem[];
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed" || status === "active") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Active
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> Ended
    </span>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-11 h-11 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export default function Inbox() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [freeChatModal, setFreeChatModal] = useState<{ open: boolean; professionalId: number | null }>({
    open: false,
    professionalId: null,
  });

  const { data, isLoading: inboxLoading } = useQuery<InboxData>({
    queryKey: ["/api/inbox"],
    queryFn: () => apiRequest("GET", "/api/inbox").then((r) => r.json()),
    enabled: !!isAuthenticated,
  });

  if (isLoading || inboxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const allChats: ConvoItem[] = [
    ...(data?.bookingChats || []),
    ...(data?.freeChats || []),
  ].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const handleOpen = (item: ConvoItem) => {
    if (item.status === "ended") return;
    if (item.type === "booking") {
      navigate(`/booking/${item.id}`);
    } else if (item.type === "free" && item.professionalId) {
      setFreeChatModal({ open: true, professionalId: item.professionalId });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">Your active chat sessions</p>
      </div>

      {allChats.length === 0 && (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No conversations yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Chats appear here once a booking is confirmed
          </p>
        </div>
      )}

      <div className="space-y-2">
        {allChats.map((item) => {
          const ended = item.status === "ended";
          const isBooking = item.type === "booking";
          const date = new Date(item.scheduledAt);
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

          return (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleOpen(item)}
              disabled={ended}
              className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-all ${
                ended
                  ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                  : "bg-white border-gray-200 hover:border-green-300 hover:shadow-sm active:scale-[0.99]"
              }`}
            >
              <Avatar initials={item.otherPartyInitials} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {item.otherPartyName}
                  </p>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{item.label}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {isBooking ? `${dateStr} at ${timeStr}` : item.expiresAt ? `Expires ${new Date(item.expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : dateStr}
                </div>
              </div>

              <MessageSquare className={`w-4 h-4 shrink-0 ${ended ? "text-gray-300" : "text-green-500"}`} />
            </button>
          );
        })}
      </div>

      {freeChatModal.open && freeChatModal.professionalId && (
        <FreeChatModal
          professionalId={freeChatModal.professionalId}
          onClose={() => setFreeChatModal({ open: false, professionalId: null })}
        />
      )}
    </div>
  );
}
