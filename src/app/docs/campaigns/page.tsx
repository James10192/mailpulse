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
          Maitrisez les differents types de campagnes, l&apos;editeur d&apos;email,
          les tests A/B et les bonnes pratiques de delivrabilite.
        </p>
      </div>

      {/* Types de campagnes */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Types de campagnes</h2>
        <div className="space-y-3">
          {[
            {
              type: "Reguliere",
              desc: "L'envoi classique : un email, un groupe de destinataires, un envoi. Ideal pour les newsletters, annonces produit et promotions.",
              badge: "bg-emerald-500/10 text-emerald-400",
            },
            {
              type: "A/B Test",
              desc: "Testez deux variantes (objet, contenu ou heure d'envoi) sur un echantillon, puis envoyez automatiquement la version gagnante au reste de votre audience.",
              badge: "bg-blue-500/10 text-blue-400",
            },
            {
              type: "Automatisee",
              desc: "Declenchee par un evenement (nouvel abonne, tag ajoute, anniversaire). Se configure une fois et fonctionne en continu. Voir la section Automations pour plus de details.",
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

      {/* Editeur et templates */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Editeur d&apos;email et templates</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            L&apos;editeur visuel de MailPulse fonctionne par glisser-deposer. Aucune
            connaissance en HTML n&apos;est necessaire. Vous pouvez :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Partir d'un template pre-concu (newsletter, promotion, annonce, transactionnel)",
              "Creer un design a partir de zero avec les blocs disponibles",
              "Sauvegarder vos propres templates pour les reutiliser",
              "Importer un template HTML personnalise si vous preferez coder",
              "Ajouter votre logo, images et boutons d'appel a l'action",
              "Previsualiser en temps reel sur desktop et mobile",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Blocs disponibles">{`Contenu
├── Texte          — Paragraphes, titres, listes
├── Image          — JPG, PNG, GIF (max 2 Mo)
├── Bouton         — Appel a l'action avec lien
├── Separateur     — Ligne horizontale
└── Code HTML      — Bloc HTML libre

Structure
├── Colonnes       — 1, 2, 3 ou 4 colonnes
├── Espaceur       — Espace vertical configurable
└── Conteneur      — Bloc avec fond et bordures

Social
├── Icones sociales — Facebook, X, LinkedIn, Instagram
└── Partager        — Boutons de partage de l'email`}</CodeBlock>
      </div>

      {/* A/B Testing */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Tests A/B</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les tests A/B vous permettent d&apos;optimiser vos campagnes en comparant
            deux variantes aupres d&apos;un echantillon de votre audience.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              title: "Objet",
              desc: "Testez deux objets differents pour voir lequel genere le meilleur taux d'ouverture.",
            },
            {
              title: "Contenu",
              desc: "Comparez deux versions de votre email (mise en page, images, texte, CTA).",
            },
            {
              title: "Heure d'envoi",
              desc: "Envoyez la meme campagne a deux heures differentes pour trouver le creneau optimal.",
            },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
              <div className="text-sm font-mono font-semibold text-orange-400 mb-2">{item.title}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <CodeBlock title="Configuration A/B Test">{`Variante A : "Decouvrez nos nouveautes de janvier"
Variante B : "5 produits que vous allez adorer ce mois-ci"

Echantillon      : 20% de l'audience (10% par variante)
Critere gagnant  : Taux d'ouverture
Duree du test    : 4 heures
Action apres test: Envoi automatique de la variante gagnante

Resultats :
  Variante A — 28.3% d'ouverture
  Variante B — 34.7% d'ouverture  ← Gagnante

La variante B est envoyee aux 80% restants.`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Conseil :</strong> Pour un test A/B fiable,
          votre echantillon doit contenir au moins 1 000 contacts par variante. En dessous,
          les resultats peuvent ne pas etre statistiquement significatifs.
        </InfoBox>
      </div>

      {/* Planification */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Planification et envoi</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Une fois votre campagne prete, vous pouvez l&apos;envoyer immediatement ou
            la planifier pour une date ulterieure.
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Envoi immediat — La campagne part dans les minutes qui suivent",
              "Envoi planifie — Choisissez la date et l'heure exactes",
              "Envoi intelligent — MailPulse determine le meilleur moment pour chaque contact selon son historique d'activite",
              "Limitation de debit — L'envoi est echelonne pour proteger votre reputation d'expediteur",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Analytics de campagne */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Analytics de campagne</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Apres l&apos;envoi, chaque campagne dispose de son propre tableau de bord
            avec des metriques en temps reel :
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { metric: "Taux d'ouverture", desc: "Pourcentage d'emails ouverts. Benchmark : 20-35%", method: "Pixel de tracking 1x1" },
            { metric: "Taux de clic (CTR)", desc: "Pourcentage de clics sur les liens. Benchmark : 2-5%", method: "Liens wrapes avec redirect 302" },
            { metric: "Taux de rebond", desc: "Emails non delivres. Objectif : < 2%", method: "Webhooks du fournisseur" },
            { metric: "Taux de plainte", desc: "Signalements spam. Objectif : < 0.1%", method: "Boucle de retroaction (FBL)" },
            { metric: "Carte de clics", desc: "Visualisation des liens les plus cliques dans l'email", method: "Heatmap interactive" },
            { metric: "Activite horaire", desc: "Graphique des ouvertures et clics par heure", method: "Timeline en temps reel" },
          ].map((item) => (
            <div
              key={item.metric}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5 min-w-[140px]">
                {item.metric}
              </span>
              <div>
                <span className="text-sm text-zinc-400">{item.desc}</span>
                <span className="text-xs text-zinc-600 block mt-0.5">{item.method}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivrabilite */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Bonnes pratiques de delivrabilite</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            La delivrabilite est la capacite de vos emails a atteindre la boite de reception
            (et non le dossier spam). Voici les regles essentielles :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Authentifiez votre domaine — Configurez SPF, DKIM et DMARC (voir la page Installation)",
              "Gardez une liste propre — Supprimez les contacts inactifs et les rebonds regulierement",
              "Respectez le rythme — N'envoyez pas trop d'emails d'un coup si vous debutez. Augmentez progressivement le volume",
              "Evitez les mots spam — \"Gratuit\", \"Urgent\", \"Offre exclusive\" en exces declenchent les filtres",
              "Ratio texte/image — Ne faites pas un email compose uniquement d'images. Incluez du texte",
              "Lien de desabonnement visible — Obligatoire et c'est aussi un signal positif pour les filtres anti-spam",
              "Testez avant d'envoyer — Utilisez toujours l'envoi de test pour verifier le rendu et les liens",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Warm-up :</strong> Si vous utilisez un nouveau
          domaine d&apos;envoi, commencez par de petits volumes (100-500 emails/jour) et augmentez
          progressivement sur 2-4 semaines. Cela permet de construire votre reputation aupres
          des fournisseurs de messagerie.
        </InfoBox>
      </div>

      {/* Etape suivante */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous maitrisez les campagnes !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/automations" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Configurer des automations
          </a>
        </p>
      </div>
    </div>
  );
}
