"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Loader2, Mail, Unlink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

interface AccountData {
  id: string;
  providerId: string;
  accountId: string;
}

const providers = [
  { id: "google", label: "Google", description: "Connexion avec Google", icon: GoogleIcon },
  { id: "github", label: "GitHub", description: "Connexion avec GitHub", icon: GitHubIcon },
] as const;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function AccountRow({
  icon: Icon,
  label,
  description,
  linked,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  linked: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{label}</p>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Badge variant={linked ? "success" : "outline"}>
          {linked ? (
            <>
              <Check className="h-3 w-3" />
              Connecté
            </>
          ) : (
            "Non lié"
          )}
        </Badge>
        {action}
      </div>
    </div>
  );
}

export function LinkedAccounts() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  useEffect(() => {
    authClient
      .listAccounts()
      .then((res) => {
        if (Array.isArray(res)) setAccounts(res);
        else if (res && "data" in res && Array.isArray(res.data)) setAccounts(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLink(provider: "google" | "github") {
    setLinking(provider);
    try {
      await authClient.linkSocial({
        provider,
        callbackURL: "/dashboard/settings",
      });
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(providerId: string) {
    setUnlinking(providerId);
    try {
      await authClient.unlinkAccount({ providerId });
      setAccounts((prev) => prev.filter((account) => account.providerId !== providerId));
    } finally {
      setUnlinking(null);
    }
  }

  const linkedProviders = new Set(accounts.map((account) => account.providerId));
  const hasCredential = linkedProviders.has("credential");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comptes liés</CardTitle>
        <CardDescription>
          Gérez les méthodes de connexion autorisées sur votre compte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[66px] w-full" />
            <Skeleton className="h-[66px] w-full" />
            <Skeleton className="h-[66px] w-full" />
          </div>
        ) : (
          <>
            <AccountRow
              icon={Mail}
              label="Email et mot de passe"
              description="Connexion par email"
              linked={hasCredential}
            />

            {providers.map((provider) => {
              const isLinked = linkedProviders.has(provider.id);
              const isPending = linking === provider.id || unlinking === provider.id;

              return (
                <AccountRow
                  key={provider.id}
                  icon={provider.icon}
                  label={provider.label}
                  description={isLinked ? "Compte lié" : provider.description}
                  linked={isLinked}
                  action={
                    isLinked ? (
                      accounts.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11"
                          onClick={() => handleUnlink(provider.id)}
                          disabled={isPending}
                        >
                          {unlinking === provider.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4" />
                          )}
                          Délier
                        </Button>
                      ) : null
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() => handleLink(provider.id)}
                        disabled={isPending}
                      >
                        {linking === provider.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                        Lier
                      </Button>
                    )
                  }
                />
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
