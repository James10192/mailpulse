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
          Types de campagnes, editeur TipTap, variables de personnalisation,
          snippets reutilisables, A/B testing et planification.
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

      {/* 3-step wizard */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Assistant de creation (3 etapes)</h2>
        <div className="space-y-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">1. Configuration</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Nom interne, type (REGULAR/AB_TEST/AUTOMATED), objet, pre-header (previewText),
              expediteur (fromName + fromEmail) et reply-to. Pour un A/B test : second objet (subjectB)
              et pourcentage de split (abTestSplit).
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">2. Contenu (editeur TipTap)</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Redigez avec l&apos;editeur riche. Ajoutez des images
              (upload R2), inserez des variables et des snippets. Le HTML genere est stocke dans
              htmlContent. Un contenu texte brut (textContent) est aussi genere.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">3. Destinataires & envoi</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Selectionnez une liste (contactListId) ou tous les contacts abonnes.
              Envoi immediat ou planification (scheduledAt). L&apos;envoi cree un
              CampaignRecipient par contact avec variant &quot;A&quot; (ou &quot;B&quot; pour A/B test).
            </p>
          </div>
        </div>
      </div>

      {/* Email editor */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Editeur email (TipTap)</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            L&apos;editeur est base sur TipTap avec des extensions personnalisees :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Formatage riche : gras, italique, souligne, barre, surligne",
              "Titres : H1, H2, H3 avec styles personnalises",
              "Couleurs de texte et de fond",
              "Images : upload direct vers Cloudflare R2 via /api/upload",
              "Liens avec ouverture dans un nouvel onglet",
              "Listes a puces et listes numerotees",
              "Variables de personnalisation via menu @",
              "Snippets : insertion de blocs reutilisables",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
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
            Vous pouvez annuler ou modifier une campagne planifiee tant que l&apos;envoi
            n&apos;a pas commence (statut SCHEDULED).
          </p>
        </div>
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
