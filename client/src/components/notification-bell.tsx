import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  bookingId?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  booking_request:   "📋",
  booking_confirmed: "✅",
  booking_cancelled: "❌",
  reminder_24h:      "📅",
  reminder_1h:       "⏰",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: () => apiRequest("GET", "/api/notifications/unread-count").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: () => apiRequest("GET", "/api/notifications").then((r) => r.json()),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) markRead.mutate(notif.id);
    if (notif.bookingId) navigate(`/booking/${notif.bookingId}`);
    setOpen(false);
  };

  const unread = countData?.count ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-green-600 hover:text-green-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
            )}
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${
                  !notif.isRead ? "bg-green-50" : ""
                }`}
              >
                <span className="text-lg shrink-0 mt-0.5">
                  {TYPE_ICON[notif.type] || "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!notif.isRead ? "text-gray-900" : "text-gray-700"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
