"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession, useActiveOrganization } from "@/lib/auth-client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PresenceHeartbeat() {
  const { data: session } = useSession();
  const { data: org } = useActiveOrganization();
  const pathname = usePathname();
  const heartbeat = useMutation(api.presence.heartbeat);

  useEffect(() => {
    if (!session?.user?.id || !org?.id) return;

    const send = () => {
      heartbeat({
        userId: session.user.id,
        userName: session.user.name ?? session.user.email,
        organizationId: org.id,
        currentPage: pathname,
      });
    };

    send();
    const interval = setInterval(send, 30_000);
    return () => clearInterval(interval);
  }, [session?.user?.id, session?.user?.name, session?.user?.email, org?.id, pathname, heartbeat]);

  return null;
}

export function OnlineUsers() {
  const { data: org } = useActiveOrganization();
  const orgId = org?.id ?? "";

  const users = useQuery(
    api.presence.getOnlineUsers,
    orgId ? { organizationId: orgId } : "skip"
  );

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
