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

export default function AnalyticsPage() {
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
          Analytics
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Suivez la performance de vos campagnes en temps reel, comprenez
          le comportement de vos contacts et mesurez votre retour sur
          investissement.
        </p>
      </div>

      {/* Vue d'ensemble */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Vue d&apos;ensemble du dashboard</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Le tableau de bord analytique de MailPulse vous offre une vue complete de
            vos performances email. Il se compose de plusieurs sections :
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Emails envoyes", value: "12 450", trend: "+18%" },
            { label: "Taux d'ouverture", value: "32.4%", trend: "+2.1%" },
            { label: "Taux de clic", value: "4.8%", trend: "+0.6%" },
            { label: "Revenus generes", value: "8 340 EUR", trend: "+24%" },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 text-center">
              <div className="text-lg font-mono font-bold text-zinc-200">{item.value}</div>
              <div className="text-[11px] text-zinc-500 mt-1">{item.label}</div>
              <div className="text-xs font-mono text-emerald-400 mt-1">{item.trend}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metriques cles */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Metriques cles expliquees</h2>

        <div className="space-y-4">
          {[
            {
              metric: "Taux d'ouverture",
              formula: "(Emails ouverts / Emails delivres) x 100",
              explanation: "Mesure combien de destinataires ont ouvert votre email. Un bon taux se situe entre 20% et 35%. Attention : les ouvertures sont detectees via un pixel de tracking. Apple Mail Privacy Protection et certains clients de messagerie peuvent bloquer ce pixel, ce qui sous-estime le chiffre reel.",
              benchmark: "20 — 35%",
            },
            {
              metric: "Taux de clic (CTR)",
              formula: "(Clics uniques / Emails delivres) x 100",
              explanation: "Mesure combien de destinataires ont clique sur au moins un lien dans votre email. C'est la metrique la plus fiable car elle ne depend pas du tracking pixel. Un bon CTR se situe entre 2% et 5%.",
              benchmark: "2 — 5%",
            },
            {
              metric: "Taux de rebond",
              formula: "(Rebonds / Emails envoyes) x 100",
              explanation: "Pourcentage d'emails qui n'ont pas pu etre delivres. Les rebonds durs (adresse invalide) sont plus graves que les rebonds legers (boite pleine). Un taux superieur a 2% peut affecter votre reputation d'expediteur.",
              benchmark: "< 2%",
            },
            {
              metric: "Taux de plainte",
              formula: "(Plaintes spam / Emails delivres) x 100",
              explanation: "Mesure combien de destinataires ont signale votre email comme spam. C'est la metrique la plus critique : un taux superieur a 0.1% peut entrainer un blocage par les fournisseurs de messagerie.",
              benchmark: "< 0.1%",
            },
            {
              metric: "Taux de desabonnement",
              formula: "(Desabonnements / Emails delivres) x 100",
              explanation: "Pourcentage de contacts qui se sont desabonnes apres un envoi. Un taux normal est inferieur a 0.5%. Un pic peut indiquer un contenu inadapte ou une frequence d'envoi trop elevee.",
              benchmark: "< 0.5%",
            },
          ].map((item) => (
            <div key={item.metric} className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-mono font-semibold text-zinc-200">{item.metric}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">
                  Objectif : {item.benchmark}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-500 mb-2 p-2 rounded-lg bg-zinc-900/50">
                {item.formula}
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tracking temps reel */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Suivi en temps reel</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Grace a l&apos;integration Convex, le dashboard de MailPulse se met a jour
            en direct. Vous pouvez suivre en temps reel :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Les ouvertures et clics au fur et a mesure qu'ils se produisent",
              "Le nombre de contacts ayant recu l'email (progression de l'envoi)",
              "Les rebonds et erreurs de delivrabilite instantanement",
              "L'activite des automations (contacts entrant dans les workflows)",
              "Un flux d'activite en direct montrant chaque evenement",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Flux d'activite en temps reel">{`14:32:05  OUVERT   marie@exemple.fr        Newsletter Mars
14:32:12  CLIC     jean@startup.io          Newsletter Mars → /promo
14:32:18  DELIVRE  sophie@acme.com          Serie bienvenue #2
14:32:25  OUVERT   pierre@tech.fr           Newsletter Mars
14:32:31  DESABO   ancien@client.com        Newsletter Mars
14:32:45  REBOND   invalide@faux-domaine.xx Newsletter Mars (hard)`}</CodeBlock>
      </div>

      {/* Attribution de revenus */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Attribution de revenus</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            MailPulse peut suivre les revenus generes par vos campagnes email. Pour
            chaque vente, MailPulse verifie si le client a ouvert ou clique sur un
            email dans les 7 derniers jours et attribue le revenu a la campagne
            correspondante.
          </p>
        </div>

        <CodeBlock title="Rapport de revenus">{`Periode : Mars 2026
─────────────────────────────────────────────────
Campagne                    Revenus    Commandes
─────────────────────────────────────────────────
Promo printemps             4 230 EUR    47
Newsletter Mars             2 110 EUR    23
Serie bienvenue             1 450 EUR    18
Relance panier abandonne      550 EUR     8
─────────────────────────────────────────────────
Total                       8 340 EUR    96

Revenu par email envoye     : 0.67 EUR
ROI                         : 4 200%`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Configuration :</strong> Pour activer l&apos;attribution
          de revenus, integrez le pixel de suivi MailPulse sur votre page de confirmation de commande,
          ou connectez votre plateforme e-commerce via l&apos;API.
        </InfoBox>
      </div>

      {/* Score d'engagement */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Score d&apos;engagement global</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            En plus du score par contact, MailPulse calcule un score d&apos;engagement
            global pour votre organisation. Ce score reflete la sante de votre base
            de contacts et l&apos;efficacite de vos campagnes.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <div className="font-mono text-xs text-zinc-400 leading-loose whitespace-pre">{`Score d'engagement global : 72/100

Repartition de votre base :
━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tres engages (71-100)  ████████████░░░░  38%
  Moderement (31-70)     ██████████████░░  45%
  Inactifs (0-30)        █████░░░░░░░░░░░  17%

Tendance : +3 points vs mois precedent`}</div>
        </div>
      </div>

      {/* Export et rapports */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Export et rapports</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Exportez vos donnees analytiques pour les partager avec votre equipe
            ou les integrer dans vos outils de reporting :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Export CSV — Telechargez les donnees brutes de n'importe quelle campagne ou periode",
              "Rapport PDF — Generez un rapport visuel pret a partager avec votre equipe ou vos clients",
              "Rapports planifies — Programmez l'envoi automatique de rapports hebdomadaires ou mensuels par email",
              "API Analytics — Integrez les metriques dans vos propres dashboards via l'API REST",
              "Webhook — Recevez les evenements en temps reel dans votre propre systeme",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Etape suivante */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous maitrisez les analytics !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/api/auth" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Explorer l&apos;API MailPulse
          </a>
        </p>
      </div>
    </div>
  );
}
