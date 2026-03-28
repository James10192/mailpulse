"use client";

import { Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ProBadge() {
  return (
    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
      Pro
    </span>
  );
}

export function FeatureGate({
  allowed,
  children,
  featureName,
}: {
  allowed: boolean;
  children: React.ReactNode;
  featureName?: string;
}) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-xl p-6 text-center max-w-sm shadow-2xl">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-5 w-5 text-orange-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">
            Fonctionnalite Pro
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            {featureName
              ? `${featureName} est disponible avec le plan Pro.`
              : "Passez au plan Pro pour debloquer cette fonctionnalite."}
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Passer au Pro
          </Link>
        </div>
      </div>
    </div>
  );
}

export function UpgradeBanner({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-orange-400 shrink-0" />
        <div>
          <div className="text-sm font-medium text-zinc-100">
            {message ?? "Debloquez plus de fonctionnalites"}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Passez au plan Pro pour des contacts illimites, A/B testing, automations et plus.
          </div>
        </div>
      </div>
      <Link
        href="/dashboard/settings/billing"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition-colors cursor-pointer"
      >
        Upgrader
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function UsageBar({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percent = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isWarning = percent >= 80;
  const isCritical = percent >= 95;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-300">
          {current.toLocaleString("fr-FR")}
          {isUnlimited ? "" : ` / ${limit.toLocaleString("fr-FR")}`}
          {isUnlimited && (
            <span className="text-emerald-400 ml-1">illimite</span>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCritical
                ? "bg-red-500"
                : isWarning
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
