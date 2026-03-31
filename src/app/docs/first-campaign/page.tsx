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
          Du premier contact a l&apos;analyse des resultats :
          envoyez votre premiere campagne email en 6 etapes.
        </p>
      </div>

      {/* Step 1 — Create a contact */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 1</span> — Creer un contact
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

      {/* Step 2 — Configure a sender */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 2</span> — Configurer un expediteur
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Allez dans <span className="text-zinc-200 font-medium">Expediteurs</span> depuis les parametres.
              Par defaut, l&apos;adresse <code className="text-zinc-200">onboarding@resend.dev</code> est
              disponible pour vos premiers tests.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Pour creer un expediteur personnalise, renseignez un{" "}
              <span className="text-zinc-200 font-medium">nom d&apos;utilisateur</span> (ex: &quot;newsletter&quot;)
              puis selectionnez un <span className="text-zinc-200 font-medium">domaine verifie</span> dans
              le menu deroulant. L&apos;adresse finale sera composee automatiquement
              (ex: <code className="text-zinc-200">newsletter@votredomaine.com</code>).
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Ajoutez un nom d&apos;affichage (ex: &quot;L&apos;equipe MailPulse&quot;) pour
              personnaliser l&apos;en-tete &quot;From&quot; de vos emails.
            </p>
          </div>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Domaines :</strong> Pour utiliser votre propre domaine,
          ajoutez-le dans la page <span className="text-zinc-200 font-medium">Domaines</span> et
          configurez les enregistrements DNS indiques. Une aide contextuelle est disponible
          directement sur la page.
        </InfoBox>
      </div>

      {/* Step 3 — Create campaign */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 3</span> — Creer une campagne
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Depuis <span className="text-zinc-200 font-medium">Campagnes</span>, cliquez sur{" "}
              <span className="text-zinc-200 font-medium">&quot;Nouvelle campagne&quot;</span>.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Donnez simplement un <span className="text-zinc-200 font-medium">nom</span> a votre campagne
              et validez. Vous etes automatiquement redirige vers l&apos;editeur de contenu
              en mode split-panel.
            </p>
          </div>
        </div>
      </div>

      {/* Step 4 — Edit content */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 4</span> — Editer le contenu
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Renseignez l&apos;<span className="text-zinc-200 font-medium">objet</span> (subject line) et le{" "}
              <span className="text-zinc-200 font-medium">texte de pre-visualisation</span> (preview text)
              qui apparait dans la boite de reception.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Redigez votre email dans l&apos;editeur riche <span className="text-zinc-200 font-medium">TipTap</span>.
              Formatage riche, images (upload vers R2), variables de personnalisation
              et insertion de snippets reutilisables.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Le contenu est <span className="text-zinc-200 font-medium">sauvegarde automatiquement</span> (autosave)
              au fur et a mesure de votre saisie. Pas besoin de cliquer sur &quot;Enregistrer&quot;.
            </p>
          </div>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Split-panel :</strong> L&apos;editeur affiche le formulaire
          a gauche et un apercu HTML en temps reel a droite, pour visualiser le rendu
          final de votre email pendant la redaction.
        </InfoBox>
      </div>

      {/* Step 5 — Send */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 5</span> — Envoyer
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Depuis la page d&apos;envoi (<code className="text-zinc-200">/campaigns/[id]/send</code>),
            configurez les parametres d&apos;envoi :
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Expediteur</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Selectionnez l&apos;expediteur parmi vos adresses configurees via des{" "}
              <span className="text-zinc-200 font-medium">toggle pills</span>. Chaque pill affiche
              le nom et l&apos;adresse email de l&apos;expediteur.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Audience</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Choisissez les destinataires :{" "}
              <span className="text-zinc-200 font-medium">tous les contacts</span>,
              un <span className="text-zinc-200 font-medium">segment</span> specifique, ou
              filtrer par <span className="text-zinc-200 font-medium">tag</span>.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Planification</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <span className="text-zinc-200 font-medium">Envoyer maintenant</span> pour un envoi immediat,
              ou <span className="text-zinc-200 font-medium">Planifier</span> pour choisir une date et
              heure d&apos;envoi differees.
            </p>
          </div>
        </div>

        <div className="mt-6 prose-sm text-zinc-400 space-y-3">
          <p>
            Lorsque vous confirmez l&apos;envoi, MailPulse :
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

      {/* Step 6 — Track results */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 6</span> — Suivre les resultats
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Apres l&apos;envoi, les statistiques sont alimentees automatiquement par les{" "}
            <span className="text-zinc-200 font-medium">webhooks Resend</span>. Chaque evenement
            (delivered, opened, clicked, bounced, complained) est recu et traite en temps reel.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { metric: "Envoyes / Delivres", desc: "Nombre d'emails envoyes et livres avec succes (webhook: delivered)", color: "text-emerald-400" },
            { metric: "Taux d'ouverture", desc: "(uniqueOpens / totalDelivered) x 100 — webhook: opened (pixel GIF)", color: "text-blue-400" },
            { metric: "Taux de clic", desc: "(uniqueClicks / totalDelivered) x 100 — webhook: clicked (redirect 302)", color: "text-purple-400" },
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
