"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useActiveOrganization } from "@/lib/auth-client";
import { Filter } from "lucide-react";

const actionIcons: Record<string, { color: string }> = {
  created: { color: "bg-emerald-500" },
  updated: { color: "bg-blue-500" },
  deleted: { color: "bg-red-500" },
  sent: { color: "bg-orange-500" },
  imported: { color: "bg-cyan-500" },
};

export function LiveActivityFeed() {
  const { data: org } = useActiveOrganization();
  const orgId = org?.id ?? "";

  const activities = useQuery(
    api.dashboard.getActivityFeed,
    orgId ? { organizationId: orgId, limit: 15 } : "skip"
  );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Activite</h2>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
        </div>
      </div>
      <div className="p-4">
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => {
              const icon = actionIcons[activity.action] ?? { color: "bg-zinc-400" };
              return (
                <div key={activity._id} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${icon.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {activity.userName}
                      </span>
                      <span className="text-zinc-500"> a {activity.action} </span>
                      <span className="text-zinc-400 font-mono truncate">
                        {activity.resourceName}
                      </span>
                      <span className="text-zinc-600 dark:text-zinc-500 text-[10px] ml-1">
                        ({activity.resourceType})
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {new Date(activity.createdAt).toLocaleString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-zinc-500 text-center py-8">
            L&apos;activite apparaitra ici en temps reel.
          </div>
        )}
      </div>
    </div>
  );
}
