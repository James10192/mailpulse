"use client";

import { useSession } from "@/lib/auth-client";
import { User } from "lucide-react";

export function ProfileSection() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
      <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Profil</h2>
      <div className="flex items-center gap-4">
        {user?.image ? (
          <img
            src={user.image}
            alt=""
            className="h-16 w-16 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-800"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl font-bold">
            {user?.name?.[0]?.toUpperCase() ?? <User className="h-6 w-6" />}
          </div>
        )}
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            {user?.name ?? "Utilisateur"}
          </div>
          <div className="text-sm text-zinc-500">{user?.email}</div>
        </div>
      </div>
    </section>
  );
}
