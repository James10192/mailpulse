"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Link2, Unlink, Loader2, Check, Mail, Key } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface AccountData {
  id: string;
  providerId: string;
  accountId: string;
}

const PROVIDERS = [
  { id: "google", label: "Google", icon: GoogleIcon, color: "text-white" },
  { id: "github", label: "GitHub", icon: GitHubIcon, color: "text-white" },
];

export function LinkedAccounts() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    authClient.listAccounts().then((res) => {
      if (Array.isArray(res)) setAccounts(res);
      else if (res && "data" in res && Array.isArray(res.data)) setAccounts(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleLink(provider: string) {
    setLinking(provider);
    try {
      await authClient.linkSocial({
        provider: provider as "google" | "github",
        callbackURL: "/dashboard/settings",
      });
    } catch {
      setLinking(null);
    }
  }

  const linkedProviders = new Set(accounts.map((a) => a.providerId));
  const hasCredential = linkedProviders.has("credential");

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Comptes lies</h2>
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
      <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Comptes lies</h2>
      <p className="text-xs text-zinc-500">Gerez vos methodes de connexion. Liez des comptes pour vous connecter de differentes facons.</p>

      <div className="space-y-2">
        {/* Email/password */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <Mail className="h-4 w-4 text-zinc-300" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Email & mot de passe</div>
              <div className="text-xs text-zinc-500">Connexion par email</div>
            </div>
          </div>
          {hasCredential ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
              <Check className="h-3 w-3" /> Connecte
            </span>
          ) : (
            <span className="text-xs text-zinc-500">Non configure</span>
          )}
        </div>

        {/* OAuth providers */}
        {PROVIDERS.map((provider) => {
          const isLinked = linkedProviders.has(provider.id);
          const Icon = provider.icon;

          return (
            <div key={provider.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{provider.label}</div>
                  <div className="text-xs text-zinc-500">
                    {isLinked ? "Compte lie" : "Non lie"}
                  </div>
                </div>
              </div>
              {isLinked ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                  <Check className="h-3 w-3" /> Connecte
                </span>
              ) : (
                <button
                  onClick={() => handleLink(provider.id)}
                  disabled={linking === provider.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-orange-500/30 text-orange-500 rounded-lg hover:bg-orange-500/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {linking === provider.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                  Lier
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
