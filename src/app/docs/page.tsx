import { Mail, ArrowRight, Terminal, Zap, BarChart3, Shield } from "lucide-react";
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
      className="group p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all"
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
          v0.1.0
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
          Documentation
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Tout ce qu&apos;il faut pour integrer MailPulse a votre application
          et envoyer vos premieres campagnes.
        </p>
      </div>

      {/* Quick install */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Installation rapide</h2>
        <CodeBlock title="Terminal">{`# Cloner le projet
git clone https://github.com/James10192/mailpulse.git
cd mailpulse

# Installer les dependances
pnpm install

# Configurer l'environnement
cp .env.example .env.local

# Lancer la base de donnees + migrations
docker compose up -d
npx prisma migrate dev --name init

# Demarrer le serveur
pnpm dev`}</CodeBlock>
      </div>

      {/* Quick links grid */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickLink
            href="/docs/first-campaign"
            title="Premiere campagne"
            desc="Envoyez votre premier email en 5 minutes avec le tracking complet."
            icon={Mail}
          />
          <QuickLink
            href="/docs/contacts"
            title="Gerer les contacts"
            desc="Import CSV, tags, segments dynamiques et scoring d'engagement."
            icon={Zap}
          />
          <QuickLink
            href="/docs/analytics"
            title="Analytics"
            desc="Dashboard temps reel, open rate, CTR, bounces et revenue attribution."
            icon={BarChart3}
          />
          <QuickLink
            href="/docs/api/webhooks"
            title="Webhooks"
            desc="Recevez les evenements email en temps reel (delivered, opened, clicked)."
            icon={Shield}
          />
        </div>
      </div>

      {/* Architecture overview */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Architecture</h2>
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6">
          <div className="font-mono text-xs text-zinc-400 leading-loose whitespace-pre">{`┌────────────────────────────────────────────┐
│              Next.js 16 App                │
│         (App Router + Turbopack)           │
├──────────┬──────────┬──────────────────────┤
│  Prisma  │  Convex  │   Cloudflare R2      │
│ (Neon DB)│(Realtime)│    (Storage)         │
├──────────┴──────────┴──────────────────────┤
│              Resend API                    │
│     (Email + Webhooks + Tracking)          │
└────────────────────────────────────────────┘`}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Prisma + Neon", desc: "Donnees relationnelles" },
            { label: "Convex", desc: "Dashboard live" },
            { label: "Cloudflare R2", desc: "Fichiers & assets" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
              <div className="text-xs font-mono text-orange-400">{item.label}</div>
              <div className="text-[11px] text-zinc-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* API quick reference */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">API Reference</h2>

        <div className="space-y-2">
          {[
            { method: "POST", path: "/api/auth/**", desc: "Authentication (Better Auth)" },
            { method: "GET", path: "/api/track/open", desc: "Open tracking pixel" },
            { method: "GET", path: "/api/track/click", desc: "Click tracking redirect" },
            { method: "POST", path: "/api/webhooks/email", desc: "Resend webhook events" },
            { method: "POST", path: "/api/unsubscribe", desc: "One-click unsubscribe" },
            { method: "GET", path: "/api/unsubscribe", desc: "Browser unsubscribe" },
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

      {/* Tracking system */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Systeme de tracking</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            MailPulse utilise un systeme de tracking signe par HMAC pour garantir
            l&apos;integrite des evenements. Chaque email envoye contient :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Un pixel invisible 1x1 GIF pour le suivi des ouvertures",
              "Des liens wrapes avec redirect 302 pour le suivi des clics",
              "Un header List-Unsubscribe (RFC 8058) pour la conformite",
              "Des tokens HMAC-SHA256 signes pour securiser les callbacks",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Token structure">{`// Token = base64url(recipientId:campaignId:hmac)
const token = generateTrackingToken(recipientId, campaignId);

// Tracking URLs
const openUrl  = \`\${APP_URL}/api/track/open?t=\${token}\`;
const clickUrl = \`\${APP_URL}/api/track/click?url=\${encodedUrl}&t=\${token}\`;
const unsubUrl = \`\${APP_URL}/api/unsubscribe?t=\${token}\`;`}</CodeBlock>
      </div>

      {/* Stack */}
      <div>
        <h2 className="text-xl font-bold mb-4 font-mono">Stack technique</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { name: "Next.js 16", desc: "Framework" },
            { name: "Better Auth", desc: "Authentification" },
            { name: "Prisma 7", desc: "ORM" },
            { name: "Neon", desc: "PostgreSQL" },
            { name: "Convex", desc: "Temps reel" },
            { name: "Resend", desc: "Email API" },
            { name: "Cloudflare R2", desc: "Stockage" },
            { name: "Tailwind v4", desc: "CSS" },
            { name: "PostHog", desc: "Analytics" },
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
