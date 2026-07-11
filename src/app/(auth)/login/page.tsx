"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Fingerprint } from "lucide-react";
import { usePostHog } from "posthog-js/react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EVENTS } from "@/lib/analytics-events";
import { authClient, signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-100" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const posthog = usePostHog();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn.email({ email, password });
      posthog?.capture(EVENTS.USER_LOGGED_IN, { method: "email" });
      router.push(callbackUrl);
    } catch {
      posthog?.capture(EVENTS.LOGIN_FAILED, { method: "email" });
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      posthog?.capture(EVENTS.USER_LOGGED_IN, { method: "google" });
      await signIn.social({ provider: "google", callbackURL: callbackUrl });
    } catch {
      posthog?.capture(EVENTS.LOGIN_FAILED, { method: "google" });
      setError("Erreur avec Google. Réessayez.");
    }
  }

  async function handleGitHub() {
    try {
      posthog?.capture(EVENTS.USER_LOGGED_IN, { method: "github" });
      await signIn.social({ provider: "github", callbackURL: callbackUrl });
    } catch {
      posthog?.capture(EVENTS.LOGIN_FAILED, { method: "github" });
      setError("Erreur avec GitHub. Réessayez.");
    }
  }

  async function handlePasskey() {
    try {
      await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess: () => {
            router.push(callbackUrl);
          },
        },
      });
    } catch {
      setError("Passkey non disponible ou annulée.");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 text-zinc-100 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(249,115,22,0.16),transparent)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-orange-500/30" />
      <Card className="relative w-full max-w-md border-0 bg-zinc-950/95 p-6 text-zinc-100 shadow-[var(--shadow-overlay)] ring-1 ring-white/10 sm:p-8">
        <CardHeader className="items-center p-0 pb-8 text-center">
          <BrandMark className="mb-4 text-xl text-zinc-50" />
          <h1 className="text-2xl font-bold tracking-tight">Bon retour</h1>
          <p className="text-sm text-zinc-400">Connectez-vous à votre compte.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2.5">
            <Button type="button" variant="outline" className="w-full bg-zinc-900/80 text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-zinc-900" onClick={handleGoogle}>
              <GoogleIcon />
              Continuer avec Google
            </Button>
            <Button type="button" variant="outline" className="w-full bg-zinc-900/80 text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-zinc-900" onClick={handleGitHub}>
              <GitHubIcon />
              Continuer avec GitHub
            </Button>
            <Button type="button" variant="outline" className="w-full bg-orange-500/10 text-orange-300 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.28)] hover:bg-orange-500/15" onClick={handlePasskey}>
              <Fingerprint className="h-5 w-5" />
              Se connecter avec une passkey
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
            <Separator className="flex-1 bg-zinc-800" />
            ou par email
            <Separator className="flex-1 bg-zinc-800" />
          </div>

          {error && (
              <div className="mb-4 rounded-lg bg-red-400/10 px-4 py-3 text-sm text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.24)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <a href="#" className="text-xs font-medium text-orange-500 hover:text-orange-400">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="group w-full">
              {loading ? "Connexion..." : "Se connecter"}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-orange-500 hover:text-orange-400">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
