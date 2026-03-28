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
          Dashboard temps reel via Convex, metriques de campagne,
          page des emails transactionnels, desabonnements et flux d&apos;activite live.
        </p>
      </div>

      {/* Real-time dashboard */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Dashboard temps reel (Convex)</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Le dashboard principal utilise Convex pour afficher les statistiques en temps reel
            via <code className="text-zinc-200">useQuery</code>. Les donnees sont synchronisees
            depuis Prisma vers Convex a chaque evenement webhook. Aucun refresh necessaire.
          </p>
          <p>Tables Convex utilisees :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "dashboardStats — Compteurs globaux par organisation (envoyes, delivres, ouverts...)",
              "campaignProgress — Progression en temps reel de l'envoi d'une campagne",
              "activityFeed — Flux d'evenements live (ouvertures, clics, bounces...)",
              "notifications — Alertes pour l'equipe (bounce rate eleve, campagne terminee...)",
              "presence — Utilisateurs connectes en temps reel",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Sync Prisma → Convex (webhook handler)">{`// Dans /api/webhooks/email/route.ts
// Apres mise a jour Prisma, sync vers Convex :
await convexServer.mutation(api.dashboard.updateStats, {
  organizationId: contact.organizationId,
  event: "delivered" | "bounced" | "complained",
});`}</CodeBlock>
      </div>

      {/* Campaign analytics */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Analytics par campagne</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Chaque campagne a une table <code className="text-zinc-200">CampaignAnalytics</code>
            (relation 1:1) qui est mise a jour a chaque evenement webhook via upsert :
          </p>
        </div>

        <div className="space-y-2">
          {[
            { metric: "totalSent", desc: "Nombre total d'emails envoyes", color: "text-zinc-300" },
            { metric: "totalDelivered", desc: "Emails livres avec succes", color: "text-emerald-400" },
            { metric: "totalOpened / uniqueOpens", desc: "Ouvertures totales et uniques", color: "text-blue-400" },
            { metric: "totalClicked / uniqueClicks", desc: "Clics totaux et uniques", color: "text-purple-400" },
            { metric: "totalBounced", desc: "Emails rebondis (hard + soft)", color: "text-amber-400" },
            { metric: "totalComplaints", desc: "Signalements spam", color: "text-red-400" },
            { metric: "totalUnsubscribed", desc: "Desabonnements suite a cette campagne", color: "text-red-400" },
          ].map((item) => (
            <div
              key={item.metric}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <code className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800/50 shrink-0 mt-0.5 ${item.color}`}>
                {item.metric}
              </code>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rate calculations */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Calcul des taux</h2>
        <div className="space-y-4">
          {[
            {
              metric: "Taux d'ouverture (openRate)",
              formula: "uniqueOpens / totalDelivered",
              explanation: "Detecte via le pixel de tracking 1x1 GIF injecte avant </body>. Sous-estime a cause d'Apple Mail Privacy Protection et du blocage d'images.",
              benchmark: "20 — 35%",
            },
            {
              metric: "Taux de clic (clickRate)",
              formula: "uniqueClicks / totalDelivered",
              explanation: "Detecte via les liens wrapes avec redirect 302 (/api/track/click). Metrique la plus fiable car independante du pixel.",
              benchmark: "2 — 5%",
            },
            {
              metric: "Taux de rebond (bounceRate)",
              formula: "totalBounced / totalSent",
              explanation: "Pourcentage d'emails non delivres. Au-dessus de 2%, nettoyez votre base. Les hard bounces desactivent automatiquement le contact.",
              benchmark: "< 2%",
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

      {/* Transactional emails */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Emails transactionnels</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            La page des emails transactionnels affiche les emails envoyes hors campagne
            (confirmation de compte, reset de mot de passe, etc.). Ces emails sont
            envoyes directement via l&apos;API Resend et suivis dans la table{" "}
            <code className="text-zinc-200">EmailEvent</code>.
          </p>
        </div>
      </div>

      {/* Unsubscribes page */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Page des desabonnements</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            La page des desabonnements affiche tous les contacts qui se sont desabonnes
            avec la raison et la date. Un score de sante global permet de suivre
            l&apos;evolution de votre liste :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Taux de desabonnement par campagne et par periode",
              "Raisons (lien desabonnement, plainte spam, hard bounce)",
              "Score de sante de la base (% de contacts actifs vs inactifs)",
              "Evolution dans le temps avec filtrage par date range",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Activity feed */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Flux d&apos;activite (live)</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Le flux d&apos;activite en temps reel est alimente par la table Convex{" "}
            <code className="text-zinc-200">activityFeed</code> et affiche chaque evenement
            au fur et a mesure qu&apos;il se produit :
          </p>
        </div>

        <CodeBlock title="Flux d'activite en temps reel">{`14:32:05  DELIVERED  marie@exemple.fr    Newsletter Mars
14:32:12  OPENED     jean@startup.io     Newsletter Mars
14:32:18  CLICKED    jean@startup.io     Newsletter Mars → /promo
14:32:25  BOUNCED    invalide@faux.xx    Newsletter Mars (hard)
14:32:31  UNSUB      ancien@client.com   Newsletter Mars`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Temps reel :</strong> Le flux est reactif grace a Convex{" "}
          <code className="font-mono text-zinc-200">useQuery</code>. Les evenements apparaissent
          instantanement sans polling ni WebSocket manuel.
        </InfoBox>
      </div>

      {/* Date range filtering */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Filtrage par date</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Toutes les vues analytiques supportent le filtrage par periode.
            Les evenements sont indexes par <code className="text-zinc-200">createdAt</code>
            dans la table <code className="text-zinc-200">EmailEvent</code> pour des requetes
            performantes.
          </p>
        </div>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous maitrisez les analytics !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/api/auth" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Explorer l&apos;API MailPulse
          </a>
        </p>
      </div>
    </div>
  );
}
