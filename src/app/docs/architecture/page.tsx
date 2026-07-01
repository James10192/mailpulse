import {
  ArrowRight,
  Blocks,
  Database,
  FolderTree,
  RefreshCw,
  Route,
  Shield,
  Signal,
  Upload,
} from "lucide-react";
import Link from "next/link";

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <Icon className="h-4 w-4 text-orange-400" />
        </div>
        <h2 className="text-lg font-semibold font-mono">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">{children}</div>
    </section>
  );
}

function FlowStep({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/40 p-4">
      <div className="font-medium text-zinc-100">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{desc}</div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="space-y-10">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-4">
          Documentation technique
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
          Architecture & conventions
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Vue d&apos;ensemble de la structure de MailPulse, des flux applicatifs
          et des conventions utiles avant de modifier le produit.
        </p>
      </div>

      <SectionCard title="Vue systeme" icon={Blocks}>
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/60 p-4 overflow-x-auto">
          <pre className="text-xs text-zinc-300 font-mono leading-6 whitespace-pre min-w-[640px]">{`Browser
  -> Next.js 16 App Router
     -> Server Components + Server Actions
     -> Route Handlers (/api/auth, /api/track, /api/webhooks, /api/upload)
  -> Prisma + PostgreSQL
     -> contacts, campaigns, recipients, analytics, auth, organizations
  -> Convex
     -> live stats, notifications, presence, activity feed
  -> Resend
     -> email delivery + webhook events
  -> Cloudflare R2
     -> uploaded assets and public files`}</pre>
        </div>
        <p>
          Prisma porte la donnee metier durable. Convex est reserve aux besoins
          temps reel du dashboard. Les evenements email transitent par Resend,
          puis enrichissent Prisma et Convex.
        </p>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Organisation du code" icon={FolderTree}>
          <div className="space-y-2">
            <p><code className="text-zinc-200">src/app</code> contient le routage App Router, les layouts, les pages publiques, les pages dashboard et les route handlers.</p>
            <p><code className="text-zinc-200">src/components</code> regroupe les briques UI metier par domaine: landing, dashboard, automations, editor.</p>
            <p><code className="text-zinc-200">src/lib</code> centralise les integrations, helpers serveur, auth, analytics et acces stockage.</p>
            <p><code className="text-zinc-200">convex</code> contient le schema et les fonctions temps reel.</p>
            <p><code className="text-zinc-200">prisma</code> contient le schema relationnel et les migrations.</p>
          </div>
        </SectionCard>

        <SectionCard title="Regles applicatives" icon={Shield}>
          <div className="space-y-2">
            <p>Les operations metier CRUD liees au produit passent surtout par Prisma et des Server Actions.</p>
            <p>Les fonctionnalites live du dashboard passent par Convex: notifications, presence, activite, stats reactives.</p>
            <p>Les webhooks et routes de tracking vivent dans les route handlers sous <code className="text-zinc-200">src/app/api</code>.</p>
            <p>Les vues complexes suivent le pattern App Router: page serveur pour les donnees, composant client pour l&apos;interaction.</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Routage & donnees" icon={Route}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/40 p-4">
            <div className="text-sm font-medium text-zinc-100 mb-2">Pages utilisateur</div>
            <p>Landing, auth, docs et capture pages sont servies via App Router avec layouts dedies et composants UI specialises.</p>
          </div>
          <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/40 p-4">
            <div className="text-sm font-medium text-zinc-100 mb-2">Dashboard</div>
            <p>Les vues dashboard chargent les donnees sur le serveur, puis deleguent les interactions client a des composants dedies.</p>
          </div>
          <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/40 p-4">
            <div className="text-sm font-medium text-zinc-100 mb-2">Server Actions</div>
            <p>Les actions de mutation sont proches des pages domaine, souvent dans des fichiers <code className="text-zinc-200">actions.ts</code>.</p>
          </div>
          <div className="rounded-xl border border-zinc-800/40 bg-zinc-950/40 p-4">
            <div className="text-sm font-medium text-zinc-100 mb-2">Route Handlers</div>
            <p>Les entrees externes passent par <code className="text-zinc-200">/api/auth</code>, <code className="text-zinc-200">/api/webhooks/email</code>, <code className="text-zinc-200">/api/track/*</code> et <code className="text-zinc-200">/api/upload</code>.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Flux developpeur cles" icon={RefreshCw}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FlowStep
            title="1. Creation de contact"
            desc="L'utilisateur ajoute un contact depuis le dashboard, une importation CSV ou une capture page. La donnee est persistee dans Prisma, puis reutilisee pour les listes, tags, segments et campagnes."
          />
          <FlowStep
            title="2. Creation / envoi de campagne"
            desc="La campagne est configuree dans Prisma, editee cote dashboard, puis l'envoi s'appuie sur Resend avec suivi des destinataires et analytics agregees."
          />
          <FlowStep
            title="3. Tracking email"
            desc="Les ouvertures et clics arrivent via webhooks et routes de tracking. Les evenements alimentent les tables Prisma et les stats de campagne."
          />
          <FlowStep
            title="4. Temps reel dashboard"
            desc="Convex diffuse notifications, presence et metriques live pour refleter l'activite sans recharger les ecrans."
          />
          <FlowStep
            title="5. Onboarding organisation"
            desc="A la premiere session, une organisation et un expediteur par defaut peuvent etre crees pour debloquer l'utilisation du produit."
          />
          <FlowStep
            title="6. Upload & assets"
            desc="Les fichiers montent vers R2 via une route dediee, puis sont reutilises dans les emails et les pages publiques."
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Prisma" icon={Database}>
          <p>Prisma heberge les tables d&apos;authentification, contacts, campagnes, analytics, domaines, expediteurs, automations et capture pages.</p>
        </SectionCard>
        <SectionCard title="Convex" icon={Signal}>
          <p>Convex est utilise pour les stats live, notifications, presence utilisateur et activity feed.</p>
        </SectionCard>
        <SectionCard title="Integrations externes" icon={Upload}>
          <p>Resend gere l&apos;email transactionnel et marketing, tandis que Cloudflare R2 gere les assets et uploads publics.</p>
        </SectionCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/docs/installation"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors"
        >
          Installation developpeur
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/docs/api/endpoints"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/40 text-sm transition-colors"
        >
          Routes & endpoints
        </Link>
      </div>
    </div>
  );
}
