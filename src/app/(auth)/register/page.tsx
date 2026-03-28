"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Zap,
  BarChart3,
  Shield,
} from "lucide-react";
import { signUp, signIn } from "@/lib/auth-client";

const features = [
  { icon: Zap, text: "Campagnes illimitees" },
  { icon: BarChart3, text: "Analytics temps reel" },
  { icon: Shield, text: "Tracking & compliance" },
  { icon: Mail, text: "Templates professionnels" },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
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

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caracteres min", pass: password.length >= 8 },
    { label: "Une majuscule", pass: /[A-Z]/.test(password) },
    { label: "Un chiffre", pass: /[0-9]/.test(password) },
  ];
  const strength = checks.filter((c) => c.pass).length;

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength
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
          <span
            key={check.label}
            className={`text-[11px] flex items-center gap-1 ${
              check.pass ? "text-emerald-400" : "text-zinc-600"
            }`}
          >
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp.email({ name, email, password });
      router.push("/dashboard");
    } catch {
      setError("Impossible de creer le compte. Verifiez vos informations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch {
      setError("Erreur avec Google. Reessayez.");
      setGoogleLoading(false);
    }
  }

  async function handleGitHub() {
    try {
      await signIn.social({ provider: "github", callbackURL: "/dashboard" });
    } catch {
      setError("Erreur avec GitHub. Reessayez.");
    }
  }

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left - Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-zinc-950 to-zinc-950" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-orange-500" />
            <span className="text-lg font-semibold">
              Mail<span className="text-orange-500">Pulse</span>
            </span>
          </Link>

          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight leading-tight">
                Envoyez des emails
                <br />
                <span className="text-orange-500">qui convertissent.</span>
              </h2>
              <p className="mt-3 text-zinc-400 text-sm leading-relaxed max-w-sm">
                Rejoignez des milliers de marketeurs qui utilisent MailPulse pour
                leurs campagnes email.
              </p>
            </div>

            <div className="space-y-3">
              {features.map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/10">
                    <f.icon className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-sm text-zinc-300">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} MailPulse
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <Mail className="h-6 w-6 text-orange-500" />
              <span className="text-xl font-semibold">
                Mail<span className="text-orange-500">Pulse</span>
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Creer un compte
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Commencez gratuitement, sans carte bancaire.
            </p>
          </div>

          {/* Social login */}
          <div className="space-y-2.5 mb-6">
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 transition-all text-sm font-medium disabled:opacity-50"
            >
              <GoogleIcon />
              {googleLoading ? "Connexion..." : "Continuer avec Google"}
            </button>

            <button
              onClick={handleGitHub}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 transition-all text-sm font-medium"
            >
              <GitHubIcon />
              Continuer avec GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-zinc-950 text-zinc-600">
                ou par email
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Nom complet
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Email professionnel
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                placeholder="vous@entreprise.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-11 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                  placeholder="Minimum 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              {loading ? (
                "Creation du compte..."
              ) : (
                <>
                  Creer mon compte
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Deja un compte ?{" "}
            <Link
              href="/login"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Se connecter
            </Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-zinc-700 leading-relaxed">
            En creant un compte, vous acceptez nos{" "}
            <a href="#" className="underline hover:text-zinc-500">
              Conditions d&apos;utilisation
            </a>{" "}
            et notre{" "}
            <a href="#" className="underline hover:text-zinc-500">
              Politique de confidentialite
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
