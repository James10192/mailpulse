import {
  Mail,
  ArrowRight,
  Terminal,
  Zap,
  BarChart3,
  Shield,
  Users,
  Code,
  Webhook,
  Send,
  Settings,
  Sparkles,
  MessageCircle,
  KeyRound,
  ListChecks,
  HelpCircle,
  PanelLeftClose,
} from "lucide-react";
import Link from "next/link";

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 overflow-hidden my-6">
      {title && (
        <div className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500 font-mono">{title}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-zinc-300 leading-relaxed">{children}</code>
      </pre>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
  icon: Icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 rounded-lg bg-orange-500/10">
          <Icon className="h-4 w-4 text-orange-500" />
        </div>
        <h3 className="font-semibold text-sm group-hover:text-orange-400 transition-colors">
          {title}
        </h3>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-orange-500 ml-auto transition-all group-hover:translate-x-0.5" />
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
    </Link>
  );
}

export default function DocsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
          </span>
          v0.5.0
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
          Documentation
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          MailPulse est une plateforme d&apos;email marketing concue pour
          l&apos;Afrique francophone. Campagnes split-panel avec editeur riche
          et autosave, tracking via webhooks Resend (delivered/opened/clicked),
          guide interactif, checklist d&apos;onboarding et authentification avancee.
        </p>
      </div>

      {/* Architecture */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Architecture</h2>
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6">
          <div className="font-mono text-xs text-zinc-400 leading-loose whitespace-pre">{`┌──────────────────────────────────────────────────┐
│            Next.js 16 (App Router + Turbopack)   │
│        proxy.ts ── auth guard (cookie-based)     │
├────────────┬────────────┬────────────────────────┤
│  Prisma 7  │   Convex   │    Cloudflare R2       │
│  (Neon PG) │ (Realtime) │     (Storage)          │
├────────────┴────────────┴────────────────────────┤
│  Better Auth (Prisma adapter + Organization)     │
├──────────────────────────────────────────────────┤
│               Resend API                         │
│      (Envoi + Webhooks + Tracking HMAC)          │
└──────────────────────────────────────────────────┘`}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Prisma 7 + Neon", desc: "Donnees relationnelles" },
            { label: "Convex", desc: "Dashboard & activite live" },
            { label: "Cloudflare R2", desc: "Fichiers & assets email" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
              <div className="text-xs font-mono text-orange-400">{item.label}</div>
              <div className="text-[11px] text-zinc-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick install */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Demarrage rapide</h2>
        <CodeBlock title="Terminal">{`git clone https://github.com/James10192/mailpulse.git
cd mailpulse
pnpm install
cp .env.example .env.local
# Renseignez les variables d'environnement dans .env.local
npx prisma migrate dev --name init
pnpm dev`}</CodeBlock>
      </div>

      {/* Quick links grid */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickLink
            href="/docs/installation"
            title="Installation"
            desc="Prerequisites, variables d'environnement, base de donnees et serveur de dev."
            icon={Code}
          />
          <QuickLink
            href="/docs/first-campaign"
            title="Premiere campagne"
            desc="Contact, expediteur, editeur riche, envoi et tracking en 6 etapes."
            icon={Send}
          />
          <QuickLink
            href="/docs/contacts"
            title="Contacts & Listes"
            desc="Import CSV, tags colores, segments dynamiques et scoring d'engagement."
            icon={Users}
          />
          <QuickLink
            href="/docs/campaigns"
            title="Campagnes split-panel"
            desc="Editeur TipTap avec autosave, apercu HTML temps reel et variables de personnalisation."
            icon={PanelLeftClose}
          />
          <QuickLink
            href="/docs/automations"
            title="Automations"
            desc="Workflows multi-etapes avec triggers, conditions et actions automatiques."
            icon={Zap}
          />
          <QuickLink
            href="/docs/analytics"
            title="Analytics & Webhooks"
            desc="Webhooks Resend (delivered/opened/clicked), dashboard temps reel et CTR."
            icon={BarChart3}
          />
        </div>
      </div>

      {/* Features */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Fonctionnalites</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickLink
            href="/docs/first-campaign"
            title="Guide interactif"
            desc="Tour driver.js pour decouvrir l'interface pas a pas des votre premiere connexion."
            icon={Sparkles}
          />
          <QuickLink
            href="/docs/campaigns"
            title="Onboarding checklist"
            desc="Liste de taches guidee : contact, expediteur, domaine, premiere campagne."
            icon={ListChecks}
          />
          <QuickLink
            href="/docs/api/auth"
            title="Passkeys & OAuth"
            desc="Authentification par passkeys, liaison de comptes Google/GitHub et 2FA."
            icon={KeyRound}
          />
          <QuickLink
            href="/changelog"
            title="What's New"
            desc="Changelog des nouvelles fonctionnalites et mises a jour de la plateforme."
            icon={Sparkles}
          />
          <QuickLink
            href="/contact"
            title="Contact & Support"
            desc="Page de contact pour questions, suggestions ou signalement de bugs."
            icon={MessageCircle}
          />
          <QuickLink
            href="/docs/campaigns"
            title="Aide contextuelle"
            desc="Modales d'aide sur les pages domaines et expediteurs pour guider la configuration."
            icon={HelpCircle}
          />
        </div>
      </div>

      {/* API Reference links */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">API Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickLink
            href="/docs/api/auth"
            title="Authentification"
            desc="Better Auth, OAuth Google/GitHub, passkeys, liaison de comptes et proxy.ts."
            icon={Settings}
          />
          <QuickLink
            href="/docs/api/endpoints"
            title="Endpoints"
            desc="Server Actions pour contacts, campagnes, snippets, tags et plus."
            icon={Code}
          />
          <QuickLink
            href="/docs/api/webhooks"
            title="Webhooks Resend"
            desc="Evenements delivered/opened/clicked, signature Svix et tokens HMAC."
            icon={Webhook}
          />
        </div>
      </div>

      {/* API quick reference */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Routes API</h2>
        <div className="space-y-2">
          {[
            { method: "POST", path: "/api/auth/[...all]", desc: "Better Auth (login, register, session)" },
            { method: "GET", path: "/api/track/open?t={token}", desc: "Pixel de tracking (1x1 GIF)" },
            { method: "GET", path: "/api/track/click?url={url}&t={token}", desc: "Click redirect (302)" },
            { method: "POST", path: "/api/webhooks/email", desc: "Resend webhook (Svix)" },
            { method: "POST", path: "/api/upload", desc: "Upload fichier vers R2" },
            { method: "POST", path: "/api/unsubscribe?t={token}", desc: "One-click unsubscribe (RFC 8058)" },
            { method: "GET", path: "/api/unsubscribe?t={token}", desc: "Desabonnement navigateur" },
            { method: "GET", path: "/capture/{slug}", desc: "Page de capture publique" },
          ].map((endpoint) => (
            <div
              key={endpoint.path + endpoint.method}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors"
            >
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  endpoint.method === "GET"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {endpoint.method}
              </span>
              <code className="text-sm font-mono text-zinc-300">{endpoint.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{endpoint.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div>
        <h2 className="text-xl font-bold mb-4 font-mono">Stack technique</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { name: "Next.js 16", desc: "App Router + Turbopack" },
            { name: "Better Auth", desc: "Auth + Organizations" },
            { name: "Prisma 7", desc: "ORM + driver adapter" },
            { name: "Neon", desc: "PostgreSQL serverless" },
            { name: "Convex", desc: "Temps reel (dashboard)" },
            { name: "Resend", desc: "Email API + webhooks" },
            { name: "Cloudflare R2", desc: "Stockage S3-compatible" },
            { name: "Tailwind v4", desc: "CSS + shadcn/ui" },
            { name: "TipTap", desc: "Editeur email riche" },
          ].map((tech) => (
            <div
              key={tech.name}
              className="px-3 py-2.5 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <div className="text-sm font-mono font-medium">{tech.name}</div>
              <div className="text-[11px] text-zinc-600">{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
