"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { Bell, Check, CheckCheck, Send, AlertTriangle, UserPlus, Zap, Trophy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  campaign_sent: { icon: Send, color: "text-orange-500" },
  campaign_completed: { icon: Check, color: "text-emerald-500" },
  bounce_spike: { icon: AlertTriangle, color: "text-amber-500" },
  complaint_alert: { icon: AlertTriangle, color: "text-red-500" },
  new_subscriber: { icon: UserPlus, color: "text-zinc-500" },
  milestone_reached: { icon: Trophy, color: "text-orange-500" },
  automation_triggered: { icon: Zap, color: "text-orange-500" },
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
  const unread = unreadCount ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"}
          className="relative size-9 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-medium text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 overflow-hidden rounded-xl p-0 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Notifications
          </h3>
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (userId) markAllAsRead({ userId });
              }}
              className="-mr-2 gap-1 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
            >
              <CheckCheck />
              Tout lire
            </Button>
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
                  type="button"
                  onClick={() => {
                    if (!notif.read) markAsRead({ notificationId: notif._id });
                  }}
                  className={cn(
                    "block w-full border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:border-zinc-800 dark:hover:bg-zinc-800/50 dark:focus-visible:bg-zinc-800/50",
                    !notif.read && "bg-orange-500/5",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", typeInfo.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {notif.title}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
                        {notif.message}
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-400">
                        {new Date(notif.createdAt).toLocaleString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    {!notif.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
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
      </PopoverContent>
    </Popover>
  );
}
