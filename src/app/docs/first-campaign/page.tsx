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

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-500/10 text-orange-400 text-xs font-mono font-bold mr-2 shrink-0">
      {n}
    </span>
  );
}

export default function FirstCampaignPage() {
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
          Premiere campagne
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          De la creation de compte a l&apos;analyse des resultats :
          envoyez votre premier email marketing en suivant ce guide pas a pas.
        </p>
      </div>

      {/* Step 1 — Create account */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 1</span> — Creer un compte
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Rendez-vous sur <code className="text-zinc-200">/register</code> et
              renseignez votre email et un mot de passe (min 8 caracteres).
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Vous pouvez aussi vous connecter via <span className="text-zinc-200 font-medium">Google</span> ou{" "}
              <span className="text-zinc-200 font-medium">GitHub</span> en un clic (OAuth).
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Creez votre <span className="text-zinc-200 font-medium">organisation</span> :
              donnez-lui un nom et un slug. L&apos;organisation est l&apos;espace de travail
              partage par votre equipe (multi-tenant via Better Auth).
            </p>
          </div>
        </div>
      </div>

      {/* Step 2 — Add a contact */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 2</span> — Ajouter un contact
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Allez dans <span className="text-zinc-200 font-medium">Contacts</span> depuis le menu lateral.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Cliquez sur <span className="text-zinc-200 font-medium">&quot;Ajouter un contact&quot;</span> et renseignez
              l&apos;email (obligatoire), le prenom, le nom et le telephone.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Ajoutez des tags pour organiser vos contacts (ex: &quot;newsletter&quot;, &quot;VIP&quot;).
              Chaque tag a une couleur personnalisable.
            </p>
          </div>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Import en masse :</strong> Vous pouvez aussi importer
          vos contacts via un fichier CSV depuis la page Contacts. MailPulse detecte
          automatiquement les colonnes et deduplique par email.
        </InfoBox>
      </div>

      {/* Step 3 — Create campaign (3-step wizard) */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 3</span> — Creer une campagne
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Depuis <span className="text-zinc-200 font-medium">Campagnes</span>, cliquez sur{" "}
            <span className="text-zinc-200 font-medium">&quot;Nouvelle campagne&quot;</span>.
            L&apos;assistant de creation comporte 3 etapes :
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Wizard 1/3 — Configuration</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Nom de la campagne, type (REGULAR, AB_TEST ou AUTOMATED), objet de l&apos;email
              et texte de pre-header. Pour un A/B test, renseignez un second objet (subject B).
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Wizard 2/3 — Contenu</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Redigez votre email avec l&apos;editeur TipTap. Formatage riche, images
              (upload vers R2), variables de personnalisation et insertion de snippets
              reutilisables. Vous pouvez inserer des snippets reutilisables dans votre contenu.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Wizard 3/3 — Apercu</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Verifiez votre campagne et enregistrez-la. Elle est sauvegardee
              en statut <code className="text-zinc-200">DRAFT</code>. Passez ensuite a la
              page d&apos;envoi (<code className="text-zinc-200">/campaigns/[id]/send</code>)
              pour choisir l&apos;expediteur, les destinataires et envoyer.
            </p>
          </div>
        </div>
      </div>

      {/* Step 4 — Send */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 4</span> — Envoyer
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Lorsque vous cliquez sur <span className="text-zinc-200 font-medium">&quot;Envoyer&quot;</span>,
            la campagne passe du statut <code className="text-zinc-200">DRAFT</code> a{" "}
            <code className="text-zinc-200">SENDING</code>. MailPulse :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Genere un token HMAC signe pour chaque destinataire",
              "Injecte le pixel de tracking (1x1 GIF) avant </body>",
              "Wrappe les liens avec le redirect de click tracking (/api/track/click)",
              "Ajoute les headers List-Unsubscribe (RFC 8058)",
              "Envoie via l'API Resend avec les tags recipient_id et campaign_id",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Cycle de vie d'une campagne">{`DRAFT → SCHEDULED → SENDING → SENT
                              ↓
                          PAUSED / CANCELLED`}</CodeBlock>
      </div>

      {/* Step 5 — Track results */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 5</span> — Suivre les resultats
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Apres l&apos;envoi, le dashboard se met a jour en temps reel grace a Convex.
            Les metriques cles :
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { metric: "Envoyes / Delivres", desc: "Nombre d'emails envoyes et livres avec succes", color: "text-emerald-400" },
            { metric: "Taux d'ouverture", desc: "(uniqueOpens / totalDelivered) x 100 — detecte via pixel GIF", color: "text-blue-400" },
            { metric: "Taux de clic", desc: "(uniqueClicks / totalDelivered) x 100 — detecte via redirect 302", color: "text-purple-400" },
            { metric: "Bounces", desc: "Hard bounces : contact auto-desabonne. Objectif < 2%", color: "text-amber-400" },
            { metric: "Plaintes", desc: "Signalements spam : contact auto-supprime. Objectif < 0.1%", color: "text-red-400" },
          ].map((item) => (
            <div
              key={item.metric}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800/50 shrink-0 mt-0.5 ${item.color}`}>
                {item.metric}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Exemple de resultats">{`Campagne : Newsletter Mars 2026
─────────────────────────────────
Envoyes      : 5 230
Delivres     : 5 198 (99.4%)
Ouverts      : 1 612 (31.0%)
Cliques      :   287 (5.5%)
Rebonds      :    32 (0.6%)
Plaintes     :     3 (0.06%)
Desabonnes   :    12 (0.2%)`}</CodeBlock>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Votre premiere campagne est envoyee !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/contacts" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Gerer vos contacts
          </a>
        </p>
      </div>
    </div>
  );
}
