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
          Creez des sequences d&apos;emails automatiques qui se declenchent
          selon le comportement de vos contacts. Configurez une fois,
          laissez MailPulse faire le reste.
        </p>
      </div>

      {/* Qu'est-ce qu'une automation */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Qu&apos;est-ce qu&apos;une automation ?</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Une automation est une sequence d&apos;emails envoyes automatiquement lorsqu&apos;un
            contact effectue une action specifique. Contrairement aux campagnes classiques
            (envoi ponctuel), une automation fonctionne en continu : chaque contact la
            parcourt a son propre rythme.
          </p>
          <p>
            Exemple concret : un nouvel abonne s&apos;inscrit a votre newsletter. Automatiquement,
            il recoit un email de bienvenue, puis un email de presentation 3 jours plus tard,
            puis une offre speciale au bout d&apos;une semaine.
          </p>
        </div>
      </div>

      {/* Types de declencheurs */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Types de declencheurs</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Le declencheur est l&apos;evenement qui fait entrer un contact dans l&apos;automation.
            MailPulse propose les declencheurs suivants :
          </p>
        </div>

        <div className="space-y-2">
          {[
            {
              trigger: "Nouvel abonne",
              desc: "Se declenche quand un contact est ajoute a votre base (formulaire, import, API)",
              badge: "bg-emerald-500/10 text-emerald-400",
            },
            {
              trigger: "Tag ajoute",
              desc: "Se declenche quand un tag specifique est attribue a un contact",
              badge: "bg-blue-500/10 text-blue-400",
            },
            {
              trigger: "Lien clique",
              desc: "Se declenche quand un contact clique sur un lien precis dans un email",
              badge: "bg-purple-500/10 text-purple-400",
            },
            {
              trigger: "Date personnalisee",
              desc: "Se declenche a une date liee au contact (anniversaire, date d'inscription, renouvellement)",
              badge: "bg-amber-500/10 text-amber-400",
            },
            {
              trigger: "Segment rejoint",
              desc: "Se declenche quand un contact entre dans un segment dynamique",
              badge: "bg-pink-500/10 text-pink-400",
            },
            {
              trigger: "Email ouvert",
              desc: "Se declenche quand un contact ouvre un email specifique d'une campagne",
              badge: "bg-cyan-500/10 text-cyan-400",
            },
          ].map((item) => (
            <div
              key={item.trigger}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${item.badge}`}>
                {item.trigger}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Serie de bienvenue */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Exemple : Serie de bienvenue</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            La serie de bienvenue est l&apos;automation la plus courante et la plus efficace.
            Voici un exemple en 4 emails :
          </p>
        </div>

        <CodeBlock title="Workflow - Serie de bienvenue">{`Declencheur : Nouvel abonne
│
├── [Immediatement]
│   Email 1 : "Bienvenue chez [Entreprise] !"
│   → Presentation, lien vers les ressources cles
│
├── [Attendre 2 jours]
│   Email 2 : "Decouvrez nos fonctionnalites preferees"
│   → Tutoriel ou guide de demarrage
│
├── [Attendre 4 jours]
│   Email 3 : "Ce que nos clients en pensent"
│   → Temoignages et cas d'usage
│
└── [Attendre 7 jours]
    Email 4 : "Offre speciale pour bien demarrer"
    → Reduction ou avantage exclusif pour les nouveaux`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Taux d&apos;ouverture moyen :</strong> Les emails
          de bienvenue ont un taux d&apos;ouverture de 50 a 60%, soit deux fois plus qu&apos;une
          newsletter classique. Profitez de cet engagement pour faire une premiere impression forte.
        </InfoBox>
      </div>

      {/* Re-engagement */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Campagne de re-engagement</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Reactiver les contacts inactifs est essentiel pour maintenir une base saine.
            Voici un exemple de sequence de re-engagement :
          </p>
        </div>

        <CodeBlock title="Workflow - Re-engagement">{`Declencheur : Le contact rejoint le segment "Inactif 60 jours"
│
├── [Immediatement]
│   Email 1 : "Vous nous manquez !"
│   → Rappel de la valeur de votre service
│
├── [Attendre 5 jours]
│   Condition : A ouvert l'email 1 ?
│   │
│   ├── OUI → Email 2a : "Ravi de vous revoir"
│   │         → Contenu exclusif ou nouveautes
│   │
│   └── NON → Email 2b : "Derniere chance"
│             → Offre speciale ou sondage
│
└── [Attendre 10 jours]
    Condition : Toujours inactif ?
    │
    ├── OUI → Supprimer le contact
    │         (protege votre delivrabilite)
    │
    └── NON → Ajouter tag "Re-engage"
              (le contact reprend le cycle normal)`}</CodeBlock>
      </div>

      {/* Conditions */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Workflows conditionnels (Si/Alors)</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les conditions vous permettent de creer des parcours personnalises au sein
            d&apos;une meme automation. Chaque contact suit un chemin different selon
            son comportement.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
            <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Conditions disponibles</h3>
            <div className="space-y-2">
              {[
                { condition: "A ouvert l'email", desc: "Verifie si le contact a ouvert l'email precedent" },
                { condition: "A clique un lien", desc: "Verifie si le contact a clique sur un lien specifique" },
                { condition: "A un tag", desc: "Verifie si le contact possede un tag donne" },
                { condition: "Score d'engagement", desc: "Verifie si le score est superieur ou inferieur a un seuil" },
                { condition: "Propriete du contact", desc: "Verifie la valeur d'un champ (ex: pays, entreprise)" },
              ].map((item) => (
                <div key={item.condition} className="flex items-start gap-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                    {item.condition}
                  </span>
                  <span className="text-sm text-zinc-400">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Actions disponibles</h3>
          <div className="space-y-2">
            {[
              { action: "Envoyer un email", desc: "Envoie un email specifique de votre bibliotheque" },
              { action: "Attendre", desc: "Pause de X heures, jours ou semaines avant l'etape suivante" },
              { action: "Ajouter un tag", desc: "Attribue un tag au contact" },
              { action: "Retirer un tag", desc: "Supprime un tag du contact" },
              { action: "Mettre a jour un champ", desc: "Modifie une propriete du contact" },
              { action: "Webhook", desc: "Envoie une notification a une URL externe (votre CRM, Slack...)" },
            ].map((item) => (
              <div key={item.action} className="flex items-start gap-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 shrink-0 mt-0.5">
                  {item.action}
                </span>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bonnes pratiques */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Bonnes pratiques</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <ul className="space-y-2 list-none pl-0">
            {[
              "Commencez simple — Une serie de bienvenue en 3 emails suffit pour debuter. Complexifiez progressivement.",
              "Espacez vos emails — Laissez au moins 2 jours entre chaque email pour ne pas submerger vos contacts.",
              "Personnalisez — Utilisez le prenom et les donnees du contact pour rendre chaque email unique.",
              "Testez vos automations — Creez un contact test et parcourez l'automation pour verifier chaque etape.",
              "Surveillez les metriques — Verifiez regulierement les taux d'ouverture et de clic de chaque email de la sequence.",
              "Definissez une sortie — Prevoyez toujours une condition de sortie pour eviter les boucles infinies.",
              "Un contact, une automation a la fois — Evitez qu'un contact recoive des emails de plusieurs automations simultanement.",
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
        <p className="text-zinc-400 text-sm mb-2">Vos automations sont en place !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/analytics" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Comprendre vos analytics
          </a>
        </p>
      </div>
    </div>
  );
}
