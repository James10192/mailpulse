import { Terminal } from "lucide-react";

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

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 text-sm text-zinc-300 leading-relaxed">
      {children}
    </div>
  );
}

export default function AutomationsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
          </span>
          Guide
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
          Automations
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Creez des workflows multi-etapes declenches par des evenements.
          Configurez une fois, MailPulse execute en continu.
        </p>
      </div>

      {/* Triggers */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Declencheurs (triggers)</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Le declencheur est l&apos;evenement qui fait entrer un contact dans l&apos;automation.
            Defini par l&apos;enum <code className="text-zinc-200">AutomationTrigger</code> :
          </p>
        </div>

        <div className="space-y-2">
          {[
            {
              trigger: "SUBSCRIBER_ADDED",
              desc: "Un nouveau contact est ajoute (formulaire, import CSV, API)",
              badge: "bg-emerald-500/10 text-emerald-400",
            },
            {
              trigger: "TAG_ADDED",
              desc: "Un tag specifique est attribue a un contact",
              badge: "bg-blue-500/10 text-blue-400",
            },
            {
              trigger: "CAMPAIGN_OPENED",
              desc: "Un contact ouvre un email d'une campagne specifique",
              badge: "bg-cyan-500/10 text-cyan-400",
            },
            {
              trigger: "LINK_CLICKED",
              desc: "Un contact clique sur un lien precis dans un email",
              badge: "bg-purple-500/10 text-purple-400",
            },
            {
              trigger: "DATE_BASED",
              desc: "Date liee au contact (anniversaire, date d'inscription, renouvellement)",
              badge: "bg-amber-500/10 text-amber-400",
            },
            {
              trigger: "CUSTOM_EVENT",
              desc: "Evenement personnalise envoye via l'API ou un webhook",
              badge: "bg-pink-500/10 text-pink-400",
            },
          ].map((item) => (
            <div
              key={item.trigger}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${item.badge}`}>
                {item.trigger}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Configuration du trigger (triggerConfig JSON)">{`// Exemple : declenchement quand le tag "VIP" est ajoute
{
  "trigger": "TAG_ADDED",
  "triggerConfig": {
    "tagName": "VIP"
  }
}

// Exemple : declenchement 7 jours apres inscription
{
  "trigger": "DATE_BASED",
  "triggerConfig": {
    "field": "createdAt",
    "offsetDays": 7
  }
}`}</CodeBlock>
      </div>

      {/* Automation statuses */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Statuts d&apos;automation</h2>
        <div className="space-y-2">
          {[
            { status: "DRAFT", desc: "En cours de configuration. Aucun contact ne peut entrer.", color: "text-zinc-400 bg-zinc-800/50" },
            { status: "ACTIVE", desc: "En cours d'execution. Les contacts entrent via le trigger.", color: "text-emerald-400 bg-emerald-500/10" },
            { status: "PAUSED", desc: "Temporairement arretee. Les contacts en cours sont mis en pause.", color: "text-amber-400 bg-amber-500/10" },
            { status: "ARCHIVED", desc: "Archivee. Plus visible dans la liste active.", color: "text-zinc-500 bg-zinc-800/50" },
          ].map((item) => (
            <div
              key={item.status}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${item.color}`}>
                {item.status}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-step workflows */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Workflows multi-etapes</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Chaque automation contient une liste ordonnee d&apos;etapes
            (<code className="text-zinc-200">AutomationStep</code>). Chaque etape a un type,
            une configuration JSON et une position :
          </p>
        </div>

        <CodeBlock title="schema.prisma — AutomationStep">{`model AutomationStep {
  id           String     @id @default(cuid())
  automationId String
  automation   Automation @relation(...)
  type         String     // "send_email", "wait", "add_tag", etc.
  config       Json       // Configuration specifique au type
  position     Int        // Ordre d'execution (0, 1, 2...)
}`}</CodeBlock>

        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Types d&apos;etapes</h3>
          <div className="space-y-2">
            {[
              { type: "send_email", desc: "Envoie un email (templateId + subject dans config)" },
              { type: "wait", desc: "Pause de X heures/jours avant l'etape suivante (duration dans config)" },
              { type: "add_tag", desc: "Ajoute un tag au contact (tagName dans config)" },
              { type: "remove_tag", desc: "Retire un tag du contact" },
              { type: "update_field", desc: "Met a jour un champ du contact (metadata)" },
              { type: "condition", desc: "Branchement conditionnel (if/then/else)" },
              { type: "webhook", desc: "Appelle une URL externe (CRM, Slack, etc.)" },
            ].map((item) => (
              <div key={item.type} className="flex items-start gap-3">
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-orange-400 shrink-0 mt-0.5">
                  {item.type}
                </code>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Example: Welcome series */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Exemple : Serie de bienvenue</h2>

        <CodeBlock title="Workflow — 3 etapes">{`Trigger : SUBSCRIBER_ADDED
│
├── Step 0 : send_email
│   config: { templateId: "tpl_bienvenue", subject: "Bienvenue !" }
│
├── Step 1 : wait
│   config: { duration: 3, unit: "days" }
│
├── Step 2 : send_email
│   config: { templateId: "tpl_onboarding", subject: "Decouvrez nos outils" }
│
├── Step 3 : wait
│   config: { duration: 7, unit: "days" }
│
└── Step 4 : send_email
    config: { templateId: "tpl_offre", subject: "Offre speciale" }`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Taux d&apos;ouverture :</strong> Les emails de bienvenue
          ont un taux d&apos;ouverture de 50 a 60%, soit deux fois plus qu&apos;une newsletter.
          Profitez de cet engagement pour faire une premiere impression forte.
        </InfoBox>
      </div>

      {/* Example: Re-engagement */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Exemple : Re-engagement</h2>

        <CodeBlock title="Workflow — avec condition">{`Trigger : CUSTOM_EVENT (contact rejoint segment "Inactif 60j")
│
├── Step 0 : send_email
│   config: { subject: "Vous nous manquez !" }
│
├── Step 1 : wait
│   config: { duration: 5, unit: "days" }
│
├── Step 2 : condition
│   config: { field: "lastEngagedAt", operator: "after", value: "step_0_sent_at" }
│   ├── TRUE  → Step 3a : add_tag { tagName: "Re-engage" }
│   └── FALSE → Step 3b : send_email { subject: "Derniere chance" }
│
└── Step 4 : wait + condition
    Si toujours inactif → remove_tag + unsubscribe`}</CodeBlock>
      </div>

      {/* Best practices */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Bonnes pratiques</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <ul className="space-y-2 list-none pl-0">
            {[
              "Commencez simple — 3 emails suffisent pour une serie de bienvenue",
              "Espacez les envois — Minimum 2 jours entre chaque email",
              "Testez avec un contact test — Parcourez l'automation avant de l'activer",
              "Surveillez les metriques — Verifiez les taux de chaque etape",
              "Definissez une sortie — Prevoyez une condition de fin pour eviter les boucles",
              "Un contact, une automation — Evitez les doublons d'envoi",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vos automations sont en place !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/analytics" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Comprendre vos analytics
          </a>
        </p>
      </div>
    </div>
  );
}
