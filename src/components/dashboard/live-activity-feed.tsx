"use client";

import { useQuery } from "convex/react";
import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../convex/_generated/api";

const actionLabels: Record<string, string> = {
  created: "a créé",
  updated: "a modifié",
  deleted: "a supprimé",
  sent: "a envoyé",
  imported: "a importé",
};

const actionVariants: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  created: "success",
  updated: "secondary",
  deleted: "destructive",
  sent: "default",
  imported: "warning",
};

export function LiveActivityFeed({ organizationId }: { organizationId: string }) {
  const activities = useQuery(
    api.dashboard.getActivityFeed,
    organizationId ? { organizationId, limit: 12 } : "skip",
  );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Activité
          </CardTitle>
          <CardDescription className="mt-1">Actions récentes synchronisées en temps réel.</CardDescription>
        </div>
        <Badge variant="success">Live</Badge>
      </CardHeader>
      <CardContent>
        {!organizationId ? (
          <div className="flex h-40 items-center justify-center text-center text-sm text-zinc-500">
            Organisation introuvable.
          </div>
        ) : activities === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex min-w-0 items-start justify-between gap-3 rounded-md px-2 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/70"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">{activity.userName}</span>{" "}
                    {actionLabels[activity.action] ?? activity.action}{" "}
                    <span className="font-mono text-xs text-zinc-500">{activity.resourceName}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(activity.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge variant={actionVariants[activity.action] ?? "outline"} className="shrink-0">
                  {activity.resourceType}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-center text-sm text-zinc-500">
            L&apos;activité apparaîtra ici en temps réel.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
