"use client";

import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

export function ProfileSection() {
  const { data: session } = useSession();
  const user = session?.user;
  const initial = user?.name?.[0]?.toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>Informations visibles sur votre compte MailPulse.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-14 w-14 border border-zinc-200 dark:border-zinc-800">
            {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback>
              {initial ?? <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
              {user?.name ?? "Utilisateur"}
            </p>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
              {user?.email ?? "Aucun email renseigné"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
