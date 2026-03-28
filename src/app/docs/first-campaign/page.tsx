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
          Envoyez votre premier email marketing en 5 etapes simples.
          De la creation a l&apos;analyse des resultats.
        </p>
      </div>

      {/* Etape 1 - Creer */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 1</span> — Creer une campagne
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Depuis le tableau de bord, cliquez sur le bouton{" "}
              <span className="text-zinc-200 font-medium">&quot;Nouvelle campagne&quot;</span> en
              haut a droite.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Donnez un nom interne a votre campagne (ex: &quot;Newsletter Janvier 2026&quot;).
              Ce nom n&apos;est visible que par votre equipe, pas par vos destinataires.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Choisissez le type de campagne :{" "}
              <span className="text-zinc-200 font-medium">Reguliere</span> pour un envoi simple,
              ou <span className="text-zinc-200 font-medium">A/B Test</span> pour tester
              differentes variantes.
            </p>
          </div>
        </div>
      </div>

      {/* Etape 2 - Destinataires */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 2</span> — Choisir les destinataires
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Selectionnez a qui envoyer votre campagne. Vous avez plusieurs options :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Tous les contacts — Envoi a l'ensemble de votre base",
              "Un segment — Groupe dynamique base sur le comportement (ex: \"Contacts actifs 30 jours\")",
              "Un ou plusieurs tags — Selection manuelle (ex: \"VIP\", \"Clients 2025\")",
              "Une liste importee — Contacts importes via CSV",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <InfoBox>
          <strong className="text-orange-400">Bonne pratique :</strong> Commencez par envoyer
          a un petit segment pour valider le contenu avant de l&apos;envoyer a toute votre base.
          MailPulse exclut automatiquement les contacts desabonnes et les adresses invalides.
        </InfoBox>
      </div>

      {/* Etape 3 - Contenu */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 3</span> — Rediger votre email
        </h2>
        <div className="prose-sm text-zinc-400 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200">Objet et pre-header</h3>
          <p>
            L&apos;objet est la premiere chose que vos destinataires voient. Il doit etre court
            (50 caracteres max), clair et inciter a l&apos;ouverture. Le pre-header est le texte
            de preview qui s&apos;affiche apres l&apos;objet dans la boite de reception.
          </p>

          <h3 className="text-sm font-semibold text-zinc-200">Construire le contenu</h3>
          <p>
            L&apos;editeur visuel de MailPulse vous permet de construire votre email sans
            aucune connaissance technique :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Glissez-deposez des blocs (texte, image, bouton, separateur, colonnes)",
              "Personnalisez les couleurs, polices et espacements",
              "Inserez des variables dynamiques (prenom, nom, entreprise)",
              "Choisissez parmi les templates pre-conçus ou partez de zero",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Variables de personnalisation">{`Bonjour {{prenom}},

Merci de faire partie de nos {{total_contacts}} abonnes !

Votre entreprise : {{entreprise}}
Date d'inscription : {{date_inscription}}`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Variables disponibles :</strong> Toutes les proprietes
          de vos contacts peuvent etre utilisees comme variables. Si une variable est vide pour un
          contact, la valeur par defaut que vous avez definie sera utilisee.
        </InfoBox>
      </div>

      {/* Etape 4 - Preview et test */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 4</span> — Previsualiser et tester
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Avant d&apos;envoyer votre campagne, prenez le temps de la verifier :
          </p>
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              <span className="text-zinc-200 font-medium">Apercu desktop et mobile :</span>{" "}
              Basculez entre les deux vues pour verifier le rendu sur differents appareils.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              <span className="text-zinc-200 font-medium">Envoi de test :</span>{" "}
              Cliquez sur &quot;Envoyer un test&quot; et renseignez votre adresse email.
              Vous recevrez l&apos;email exactement comme vos destinataires le verront.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              <span className="text-zinc-200 font-medium">Verification des liens :</span>{" "}
              MailPulse verifie automatiquement que tous les liens de votre email sont
              fonctionnels. Les liens casses sont signales en rouge.
            </p>
          </div>
        </div>
      </div>

      {/* Etape 5 - Envoyer */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">Etape 5</span> — Envoyer ou planifier
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Vous avez deux options pour l&apos;envoi :
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Envoi immediat</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cliquez sur &quot;Envoyer maintenant&quot;. Votre campagne sera envoyee a tous
              les destinataires selectionnes dans les minutes qui suivent. L&apos;envoi est
              progressif pour optimiser la delivrabilite.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Envoi planifie</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Choisissez une date et une heure d&apos;envoi. Idealement, planifiez vos
              campagnes entre 9h et 11h en semaine pour maximiser les taux d&apos;ouverture.
              Vous pouvez annuler ou modifier jusqu&apos;au moment de l&apos;envoi.
            </p>
          </div>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Fuseau horaire :</strong> L&apos;heure de planification
          utilise le fuseau horaire defini dans les parametres de votre organisation. Verifiez qu&apos;il
          correspond bien a la zone geographique de vos destinataires.
        </InfoBox>
      </div>

      {/* Statistiques */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Comprendre vos resultats</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Apres l&apos;envoi, le tableau de bord de la campagne se met a jour en temps reel.
            Voici les metriques cles a surveiller :
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            {
              metric: "Taux d'ouverture",
              desc: "Pourcentage de destinataires qui ont ouvert votre email. Un bon taux se situe entre 20% et 35%.",
              color: "text-emerald-400",
            },
            {
              metric: "Taux de clic (CTR)",
              desc: "Pourcentage de destinataires qui ont clique sur au moins un lien. Visez entre 2% et 5%.",
              color: "text-blue-400",
            },
            {
              metric: "Taux de rebond",
              desc: "Emails qui n'ont pas pu etre delivres. Au-dessus de 2%, nettoyez votre liste de contacts.",
              color: "text-amber-400",
            },
            {
              metric: "Desabonnements",
              desc: "Contacts qui se sont desabonnes suite a cette campagne. Normal si < 0.5% par envoi.",
              color: "text-red-400",
            },
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

        <CodeBlock title="Exemple de resultats">{`Campagne : Newsletter Janvier 2026
─────────────────────────────────
Envoyes      : 5 230
Delivres     : 5 198 (99.4%)
Ouverts      : 1 612 (31.0%)
Cliques      :   287 (5.5%)
Rebonds      :    32 (0.6%)
Desabonnes   :    12 (0.2%)`}</CodeBlock>
      </div>

      {/* Etape suivante */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Votre premiere campagne est envoyee !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/contacts" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Gerer vos contacts
          </a>
        </p>
      </div>
    </div>
  );
}
