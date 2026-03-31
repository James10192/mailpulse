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

export default function CampaignsPage() {
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
          Campagnes
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Split-panel, editeur TipTap riche, creation simplifiee, analytics
          temps reel, variables de personnalisation, snippets et planification.
        </p>
      </div>

      {/* Campaign types */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Types de campagnes</h2>
        <div className="space-y-3">
          {[
            {
              type: "REGULAR",
              desc: "Envoi classique : un email, un groupe de destinataires, un envoi. Ideal pour les newsletters, annonces et promotions.",
              badge: "bg-emerald-500/10 text-emerald-400",
            },
            {
              type: "AB_TEST",
              desc: "Testez deux objets differents (subject vs subjectB) sur un echantillon (abTestSplit %). La variante gagnante (abTestWinner) est envoyee au reste.",
              badge: "bg-blue-500/10 text-blue-400",
            },
            {
              type: "AUTOMATED",
              desc: "Declenchee par un evenement (voir section Automations). Se configure une fois et fonctionne en continu.",
              badge: "bg-purple-500/10 text-purple-400",
            },
          ].map((item) => (
            <div
              key={item.type}
              className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${item.badge}`}>
                  {item.type}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign statuses */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Statuts de campagne</h2>
        <CodeBlock title="Enum CampaignStatus">{`DRAFT       → Brouillon en cours d'edition
SCHEDULED   → Planifiee pour un envoi futur (scheduledAt)
SENDING     → Envoi en cours
SENT        → Envoi termine (completedAt)
PAUSED      → Envoi mis en pause
CANCELLED   → Campagne annulee`}</CodeBlock>
      </div>

      {/* Split-panel layout */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Vue split-panel</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            La liste des campagnes adopte un layout split-panel : une liste a gauche
            et un panneau de detail a droite qui s&apos;affiche au clic sur une campagne.
          </p>
        </div>

        <div className="space-y-2">
          {[
            { element: "Expediteur", desc: "Nom et adresse email de l'expediteur configure" },
            { element: "Objet & pre-header", desc: "Subject et previewText de la campagne" },
            { element: "Planification", desc: "Date d'envoi prevue ou statut d'envoi actuel" },
            { element: "Statistiques", desc: "Taux d'ouverture et taux de clic affiches en temps reel" },
            { element: "Apercu HTML", desc: "Iframe de previsualisation du contenu email" },
            { element: "Actions", desc: "Boutons Modifier, Envoyer, Annuler, Replanifier selon le statut" },
          ].map((item) => (
            <div
              key={item.element}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                {item.element}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Structure du panneau de detail">{`<SplitPanel>
  <CampaignList />        ← Liste scrollable a gauche
  <CampaignDetail>        ← Panneau droit au clic
    <SenderInfo />        ← fromName + fromEmail
    <SubjectPreview />    ← subject + previewText
    <ScheduleInfo />      ← scheduledAt ou statut
    <AnalyticsStats />    ← Taux d'ouverture / Taux de clic
    <HtmlPreviewIframe /> ← Apercu du contenu
    <ActionButtons />     ← Modifier / Envoyer / Annuler
  </CampaignDetail>
</SplitPanel>`}</CodeBlock>
      </div>

      {/* Simplified creation */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Creation simplifiee</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            La creation de campagne est desormais simplifiee : un formulaire avec
            uniquement le <strong className="text-zinc-200">nom de la campagne</strong>.
            A la validation, la campagne est creee en statut DRAFT et l&apos;utilisateur
            est redirige directement vers la page editeur.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">1. Nom de la campagne</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Saisissez un nom interne pour identifier la campagne (ex: &quot;Newsletter Mars 2026&quot;).
              C&apos;est le seul champ requis pour demarrer.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">2. Redirection vers l&apos;editeur</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Apres creation, redirection automatique vers{" "}
              <code className="text-zinc-200">/dashboard/campaigns/[id]/edit</code>.
              C&apos;est la que vous redigez le contenu, definissez l&apos;objet, le pre-header et configurez
              tous les parametres de la campagne.
            </p>
          </div>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Avant :</strong> un assistant en 3 etapes
          (Configuration → Contenu → Destinataires). <br />
          <strong className="text-orange-400">Maintenant :</strong> formulaire nom uniquement →
          editeur complet. Plus rapide, moins de friction.
        </InfoBox>
      </div>

      {/* Rich editor (TipTap) */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Editeur riche (TipTap)</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            L&apos;editeur de campagne est accessible a{" "}
            <code className="text-zinc-200">/dashboard/campaigns/[id]/edit</code>.
            Il utilise TipTap avec le meme jeu d&apos;extensions que l&apos;editeur de snippets :
          </p>
        </div>
        <ul className="space-y-2 list-none pl-0 text-zinc-400 text-sm">
          {[
            "Formatage riche : gras, italique, souligne, barre, surligne",
            "Titres : H1, H2, H3 avec styles personnalises",
            "Couleurs de texte et de fond",
            "Tableaux : insertion, redimensionnement, fusion de cellules",
            "Images : upload direct vers Cloudflare R2 avec redimensionnement (resize handles)",
            "Liens avec ouverture dans un nouvel onglet",
            "Listes a puces et listes numerotees",
            "Variables de personnalisation via menu @",
            "Snippets : insertion de blocs reutilisables depuis la bibliotheque",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-orange-500 mt-1">&#8226;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <InfoBox>
          <strong className="text-orange-400">Centrage des images :</strong> Les classes Tailwind
          appliquees dans TipTap (ex: <code className="text-zinc-200">mx-auto</code>,{" "}
          <code className="text-zinc-200">block</code>) sont automatiquement converties en styles
          inline (<code className="text-zinc-200">margin: 0 auto; display: block</code>) pour
          garantir la compatibilite avec les clients email (Outlook, Gmail, Apple Mail).
        </InfoBox>
      </div>

      {/* Autosave */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Sauvegarde automatique</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            L&apos;editeur de campagne sauvegarde automatiquement toutes les{" "}
            <strong className="text-zinc-200">2 secondes</strong> avec un mecanisme de
            debounce et dirty-check. Les champs sauvegardes :
          </p>
        </div>

        <div className="space-y-2">
          {[
            { field: "name", desc: "Nom interne de la campagne" },
            { field: "subject", desc: "Objet de l'email" },
            { field: "previewText", desc: "Pre-header affiche dans la boite de reception" },
            { field: "htmlContent", desc: "Contenu HTML genere par l'editeur TipTap" },
          ].map((item) => (
            <div
              key={item.field}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                {item.field}
              </code>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Mecanisme d'autosave">{`// Debounce de 2 secondes + dirty-check
const debouncedSave = useDebouncedCallback(async () => {
  if (!isDirty) return;         // ← Ne sauvegarde que si modifie
  await saveCampaign({
    name, subject, previewText, htmlContent
  });
  setIsDirty(false);
}, 2000);

// Declenche a chaque modification
useEffect(() => {
  setIsDirty(true);
  debouncedSave();
}, [name, subject, previewText, htmlContent]);`}</CodeBlock>
      </div>

      {/* Template variables */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Variables de personnalisation</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Inserez des variables dynamiques dans vos emails avec la syntaxe{" "}
            <code className="text-zinc-200">{`{{ variable }}`}</code>. Elles sont remplacees
            par les donnees du contact au moment de l&apos;envoi.
          </p>
        </div>

        <div className="space-y-2">
          {[
            { variable: "{{ email }}", desc: "Adresse email du destinataire" },
            { variable: "{{ name }}", desc: "Nom complet (firstName + lastName)" },
            { variable: "{{ firstName }}", desc: "Prenom du contact" },
            { variable: "{{ lastName }}", desc: "Nom du contact" },
            { variable: "{{ tags }}", desc: "Liste des tags du contact" },
            { variable: "{{ currentTime }}", desc: "Date et heure actuelles" },
            { variable: "{{ unsubscribeUrl }}", desc: "Lien de desabonnement signe (HMAC)" },
            { variable: "{{ viewOnlineUrl }}", desc: "Lien pour voir l'email dans le navigateur" },
          ].map((item) => (
            <div
              key={item.variable}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0">
                {item.variable}
              </code>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Exemple dans l'editeur">{`Bonjour {{ firstName }},

Merci de faire partie de nos abonnes !

Si vous ne souhaitez plus recevoir nos emails :
{{ unsubscribeUrl }}`}</CodeBlock>
      </div>

      {/* A/B testing */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">A/B Testing</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Le A/B testing permet de comparer deux objets d&apos;email (subject vs subjectB)
            pour optimiser le taux d&apos;ouverture. Le modele stocke :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "subject — Objet de la variante A",
              "subjectB — Objet de la variante B",
              "abTestSplit — Pourcentage de l'audience pour le test (defaut : 50%)",
              "abTestWinner — Variante gagnante (\"A\" ou \"B\") apres evaluation",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Fonctionnement du A/B test">{`1. Creer une campagne type AB_TEST
2. Definir subject (variante A) et subjectB (variante B)
3. Definir abTestSplit (ex: 20% = 10% par variante)
4. Envoyer — chaque destinataire recoit variant "A" ou "B"
5. Apres la duree du test, la variante avec le meilleur
   taux d'ouverture est envoyee aux destinataires restants
6. abTestWinner est mis a jour ("A" ou "B")`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Conseil :</strong> Pour un test statistiquement fiable,
          utilisez un echantillon d&apos;au moins 1 000 contacts par variante.
        </InfoBox>
      </div>

      {/* Snippets */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Snippets</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les snippets sont des blocs de contenu HTML reutilisables. Ils sont stockes
            comme des <code className="text-zinc-200">EmailTemplate</code> avec la categorie{" "}
            <code className="text-zinc-200">&quot;snippet&quot;</code>.
          </p>
          <p>
            Les snippets sont <strong className="text-zinc-200">composables</strong> : vous pouvez
            inserer un snippet dans un autre snippet. Dans l&apos;editeur TipTap,
            utilisez le menu d&apos;insertion pour choisir un snippet existant.
          </p>
          <p>Cas d&apos;utilisation courants :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Header avec logo et navigation",
              "Footer avec liens legaux et desabonnement",
              "Bloc de temoignage client",
              "Banniere promotionnelle",
              "Signature d'equipe",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Send page with toggle pills */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Page d&apos;envoi (toggle pills)</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Depuis la liste des campagnes, cliquez sur <span className="text-zinc-200 font-medium">&quot;Envoyer&quot;</span>
            pour acceder a la page d&apos;envoi (<code className="text-zinc-200">/dashboard/campaigns/[id]/send</code>).
            Les selections utilisent des <strong className="text-zinc-200">toggle pills</strong> au
            lieu de dropdowns pour une experience plus fluide.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { step: "Expediteur", desc: "Selectionnez un expediteur (EmailSender) via toggle pills. Chaque pill affiche le nom et l'adresse email." },
            { step: "Audience", desc: "3 modes via toggle pills : Tous les abonnes / Par segment / Par tag. Chaque mode affiche les options correspondantes." },
            { step: "Verification", desc: "Apercu du sujet, pre-header et contenu HTML. Nombre total de destinataires affiche." },
            { step: "Envoi", desc: "Confirmez l'envoi. La campagne passe en statut SENDING et les emails sont envoyes via Resend." },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                {item.step}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Modes d'audience (toggle pills)">{`┌─────────────────┐ ┌──────────────┐ ┌────────────┐
│ Tous les abonnés │ │ Par segment  │ │  Par tag   │
└─────────────────┘ └──────────────┘ └────────────┘
       ↓                    ↓               ↓
  Tous les contacts    ContactList      Tag filter
  avec status          selectionnee     (un ou plusieurs
  SUBSCRIBED                            tags)`}</CodeBlock>
      </div>

      {/* Campaign analytics */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Analytics de campagne</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les statistiques sont collectees en temps reel via les webhooks Resend.
            Chaque evenement (envoi, livraison, ouverture, clic, rebond, desabonnement)
            met a jour les compteurs de la campagne.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { metric: "Envoyes", desc: "Nombre total d'emails envoyes", color: "text-zinc-300" },
            { metric: "Delivres", desc: "Emails arrives en boite de reception", color: "text-emerald-400" },
            { metric: "Taux d'ouverture", desc: "Pourcentage d'emails ouverts", color: "text-blue-400" },
            { metric: "Taux de clic", desc: "Pourcentage de clics sur les liens", color: "text-orange-400" },
            { metric: "Rebonds", desc: "Emails non delivres (hard + soft bounce)", color: "text-red-400" },
            { metric: "Desabonnes", desc: "Contacts desabonnes via cette campagne", color: "text-yellow-400" },
          ].map((item) => (
            <div
              key={item.metric}
              className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 text-center"
            >
              <div className={`text-sm font-mono font-bold ${item.color} mb-1`}>
                {item.metric}
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <CodeBlock title="Webhooks Resend → Analytics">{`// /api/webhooks/email — Evenements traites :
email.sent        → sentCount++
email.delivered   → deliveredCount++
email.opened      → openedCount++   → Taux d'ouverture (%)
email.clicked     → clickedCount++  → Taux de clic (%)
email.bounced     → bouncedCount++
email.unsubscribed → unsubscribedCount++

// Calcul des taux
Taux d'ouverture = (openedCount / deliveredCount) × 100
Taux de clic     = (clickedCount / deliveredCount) × 100`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Temps reel :</strong> Les stats sont visibles dans le
          panneau de detail (split-panel) et se mettent a jour au fur et a mesure que les
          webhooks Resend arrivent. Le taux d&apos;ouverture peut etre sous-estime a cause
          du blocage de pixels par Apple Mail et Gmail.
        </InfoBox>
      </div>

      {/* Cancel / Reschedule */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Annulation & replanification</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les campagnes en statut <code className="text-zinc-200">SCHEDULED</code> ou{" "}
            <code className="text-zinc-200">SENDING</code> peuvent etre annulees ou
            replanifiees depuis le panneau de detail ou la page de la campagne.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-red-400 mb-2">Annuler</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              La campagne repasse en statut <code className="text-zinc-200">DRAFT</code>.
              Les emails deja envoyes ne sont pas affectes, mais les envois restants sont
              stoppes. Vous pouvez ensuite modifier le contenu et relancer l&apos;envoi.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-blue-400 mb-2">Replanifier</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Modifiez la date <code className="text-zinc-200">scheduledAt</code> pour
              repousser ou avancer l&apos;envoi. La campagne reste en statut{" "}
              <code className="text-zinc-200">SCHEDULED</code> avec la nouvelle date.
            </p>
          </div>
        </div>

        <CodeBlock title="Flux d'annulation">{`SCHEDULED ──[Annuler]──→ DRAFT   (envoi annule)
SENDING   ──[Annuler]──→ DRAFT   (envois restants stoppes)
SCHEDULED ──[Replanifier]──→ SCHEDULED (nouveau scheduledAt)`}</CodeBlock>
      </div>

      {/* Scheduling */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Planification</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les campagnes planifiees sont stockees avec un champ{" "}
            <code className="text-zinc-200">scheduledAt</code> (DateTime) et le statut{" "}
            <code className="text-zinc-200">SCHEDULED</code>. A la date prevue, le systeme
            passe la campagne en <code className="text-zinc-200">SENDING</code>.
          </p>
          <p>
            Vous pouvez annuler ou replanifier une campagne planifiee a tout moment
            tant que l&apos;envoi n&apos;est pas termine (statuts SCHEDULED ou SENDING).
          </p>
        </div>
      </div>

      {/* Image centering */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Compatibilite email (inline styles)</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les clients email (Outlook, Gmail, Yahoo) ne supportent pas les classes CSS.
            Les classes Tailwind utilisees dans l&apos;editeur TipTap sont automatiquement
            converties en styles inline avant l&apos;envoi.
          </p>
        </div>

        <CodeBlock title="Conversion Tailwind → inline styles">{`// Dans l'editeur TipTap (classes Tailwind)
<img class="mx-auto block max-w-full" src="..." />
<div class="text-center p-4">...</div>

// Apres conversion (inline styles pour email)
<img style="margin: 0 auto; display: block; max-width: 100%;" src="..." />
<div style="text-align: center; padding: 16px;">...</div>`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Pourquoi ?</strong> Outlook ignore les balises{" "}
          <code className="text-zinc-200">&lt;style&gt;</code> et les classes CSS.
          Seuls les styles inline sont fiables sur tous les clients email.
          La conversion est transparente : vous editez avec Tailwind, le HTML envoye
          utilise des styles inline.
        </InfoBox>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous maitrisez les campagnes !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/automations" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Configurer des automations
          </a>
        </p>
      </div>
    </div>
  );
}
