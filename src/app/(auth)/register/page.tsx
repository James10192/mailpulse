"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Check, Eye, EyeOff, Mail, Shield, Zap } from "lucide-react";
import { usePostHog } from "posthog-js/react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EVENTS } from "@/lib/analytics-events";
import { signIn, signUp } from "@/lib/auth-client";

const features = [
  { icon: Zap, text: "Campagnes illimitées" },
  { icon: BarChart3, text: "Analytics temps réel" },
  { icon: Shield, text: "Tracking et conformité" },
  { icon: Mail, text: "Templates professionnels" },
];

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

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caractères min.", pass: password.length >= 8 },
    { label: "Une majuscule", pass: /[A-Z]/.test(password) },
    { label: "Un chiffre", pass: /[0-9]/.test(password) },
  ];
  const strength = checks.filter((check) => check.pass).length;

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index <= strength
                ? strength === 1
                  ? "bg-red-500"
                  : strength === 2
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                : "bg-zinc-800"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map((check) => (
          <span key={check.label} className={`flex items-center gap-1 text-[11px] ${check.pass ? "text-emerald-400" : "text-zinc-500"}`}>
            <Check className="h-3 w-3" />
            {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const posthog = usePostHog();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp.email({ name, email, password });
      posthog?.capture(EVENTS.USER_SIGNED_UP, { method: "email" });
      router.push("/dashboard");
    } catch {
      setError("Impossible de créer le compte. Vérifiez vos informations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      posthog?.capture(EVENTS.USER_SIGNED_UP, { method: "google" });
      await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch {
      setError("Erreur avec Google. Réessayez.");
      setGoogleLoading(false);
    }
  }

  async function handleGitHub() {
    try {
      posthog?.capture(EVENTS.USER_SIGNED_UP, { method: "github" });
      await signIn.social({ provider: "github", callbackURL: "/dashboard" });
    } catch {
      setError("Erreur avec GitHub. Réessayez.");
    }
  }

  return (
    <main className="grid min-h-screen overflow-hidden bg-zinc-950 text-zinc-100 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-zinc-950 shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(249,115,22,0.16),transparent)]" />
        <div className="pointer-events-none absolute inset-y-12 right-0 w-px bg-orange-500/30" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <BrandMark className="text-lg text-zinc-50" />

          <div className="max-w-md space-y-8">
            <div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">
                Envoyez des emails
                <br />
                <span className="text-orange-500">qui convertissent.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Lancez vos campagnes, suivez les réponses et automatisez vos relances depuis un cockpit clair.
              </p>
            </div>

            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature.text} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.24)]">
                    <feature.icon className="h-4 w-4 text-orange-500" />
                  </span>
                  <span className="text-sm text-zinc-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-zinc-600">&copy; {new Date().getFullYear()} MailPulse</p>
        </div>
      </section>

      <section className="relative flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(249,115,22,0.1),transparent)] lg:hidden" />
        <Card className="relative w-full max-w-md border-0 bg-zinc-950/95 p-6 text-zinc-100 shadow-[var(--shadow-overlay)] ring-1 ring-white/10 sm:p-8">
          <CardHeader className="p-0 pb-8">
            <div className="mb-4 lg:hidden">
              <BrandMark className="text-xl text-zinc-50" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
            <p className="text-sm text-zinc-400">Commencez gratuitement, sans carte bancaire.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2.5">
              <Button type="button" variant="outline" disabled={googleLoading} className="w-full bg-zinc-900/80 text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-zinc-900" onClick={handleGoogle}>
                <GoogleIcon />
                {googleLoading ? "Connexion..." : "Continuer avec Google"}
              </Button>
              <Button type="button" variant="outline" className="w-full bg-zinc-900/80 text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-zinc-900" onClick={handleGitHub}>
                <GitHubIcon />
                Continuer avec GitHub
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
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                    placeholder="Minimum 8 caractères"
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
                <PasswordStrength password={password} />
              </div>

              <Button type="submit" disabled={loading} className="group w-full">
                {loading ? "Création du compte..." : "Créer mon compte"}
                {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-orange-500 hover:text-orange-400">
                Se connecter
              </Link>
            </p>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-600">
              En créant un compte, vous acceptez nos{" "}
              <a href="#" className="underline hover:text-zinc-400">
                Conditions d&apos;utilisation
              </a>{" "}
              et notre{" "}
              <a href="#" className="underline hover:text-zinc-400">
                Politique de confidentialité
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
