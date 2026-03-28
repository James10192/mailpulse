"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { Bell, Check, CheckCheck, Send, AlertTriangle, UserPlus, Zap, Trophy } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  campaign_sent: { icon: Send, color: "text-blue-500" },
  campaign_completed: { icon: Check, color: "text-emerald-500" },
  bounce_spike: { icon: AlertTriangle, color: "text-amber-500" },
  complaint_alert: { icon: AlertTriangle, color: "text-red-500" },
  new_subscriber: { icon: UserPlus, color: "text-cyan-500" },
  milestone_reached: { icon: Trophy, color: "text-orange-500" },
  automation_triggered: { icon: Zap, color: "text-purple-500" },
};

export function NotificationsDropdown() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  const unreadCount = useQuery(
    api.notifications.unreadCount,
    userId ? { userId } : "skip"
  );
  const notifications = useQuery(
    api.notifications.list,
    userId ? { userId, limit: 10 } : "skip"
  );
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-medium">
            {unreadCount! > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-50">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Notifications
            </h3>
            {(unreadCount ?? 0) > 0 && (
              <button
                onClick={() => {
                  if (userId) markAllAsRead({ userId });
                }}
                className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                Tout lire
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
              notifications.map((notif) => {
                const typeInfo = typeIcons[notif.type] ?? {
                  icon: Bell,
                  color: "text-zinc-500",
                };
                const Icon = typeInfo.icon;
                return (
                  <button
                    key={notif._id}
                    onClick={() => {
                      if (!notif.read) markAsRead({ notificationId: notif._id });
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${
                      !notif.read ? "bg-orange-500/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${typeInfo.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {notif.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                          {notif.message}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1">
                          {new Date(notif.createdAt).toLocaleString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-zinc-500">
                Aucune notification
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
