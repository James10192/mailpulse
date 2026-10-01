"use client";

import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PresenceHeartbeat() {
  const { isAuthenticated } = useConvexAuth();
  const pathname = usePathname();
  const heartbeat = useMutation(api.presence.heartbeat);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Identity comes from the Convex token; a failed heartbeat is only a missed presence ping.
    const send = () => {
      heartbeat({ currentPage: pathname }).catch(() => {});
    };

    send();
    const interval = setInterval(send, 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, pathname, heartbeat]);

  return null;
}

export function OnlineUsers() {
  const users = useQuery(api.presence.getOnlineUsers, {});

  if (!users || users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1.5">
        {users.slice(0, 3).map((user) => (
          <div
            key={user.userId}
            title={`${user.userName} — ${user.currentPage}`}
            className="h-6 w-6 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-[10px] font-medium border-2 border-white dark:border-zinc-950"
          >
            {user.userName[0]?.toUpperCase() ?? "?"}
          </div>
        ))}
        {users.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center text-[10px] font-medium border-2 border-white dark:border-zinc-950">
            +{users.length - 3}
          </div>
        )}
      </div>
      <span className="relative flex h-2 w-2 ml-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    </div>
  );
}
