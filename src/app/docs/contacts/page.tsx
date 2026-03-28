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

export default function ContactsPage() {
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
          Contacts &amp; Listes
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Gerez vos contacts, organisez-les avec des tags et des listes,
          creez des segments dynamiques et suivez l&apos;engagement.
        </p>
      </div>

      {/* Contact model */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Modele Contact</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Chaque contact est lie a une organisation (multi-tenant).
            Voici les champs du modele Prisma :
          </p>
        </div>

        <CodeBlock title="schema.prisma — Contact">{`model Contact {
  id              String    @id @default(cuid())
  email           String                    // Adresse email (unique par org)
  firstName       String?                   // Prenom
  lastName        String?                   // Nom
  phone           String?                   // Telephone
  metadata        Json?                     // Champs personnalises (JSON libre)
  subscribed      Boolean   @default(true)  // Abonne (false = desabonne/bounce)
  bounceType      String?                   // "hard" ou "soft"
  engagementScore Int       @default(0)     // Score 0-100
  lastEngagedAt   DateTime?                 // Derniere interaction
  source          String?                   // Origine (formulaire, import, API)

  organizationId  String
  userId          String
  tags            ContactTag[]
  listMemberships ContactListMember[]

  @@unique([email, organizationId])
}`}</CodeBlock>
      </div>

      {/* Creating contacts */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Ajouter des contacts</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Deux methodes pour ajouter des contacts :
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Formulaire</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Depuis la page Contacts, cliquez sur &quot;Ajouter un contact&quot; et remplissez
              le formulaire. Les champs email, firstName, lastName, phone et tags sont
              valides via Zod cote serveur (Server Action).
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Import CSV</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Uploadez un fichier CSV via le bouton d&apos;import. Le fichier est
              stocke temporairement sur Cloudflare R2. MailPulse detecte les colonnes,
              deduplique par email et applique les tags.
            </p>
          </div>
        </div>

        <CodeBlock title="Format CSV attendu">{`email,firstName,lastName,phone,tags
marie@exemple.fr,Marie,Dupont,+225070000,"client,vip"
jean@exemple.fr,Jean,Martin,,prospect
sophie@exemple.fr,Sophie,Bernard,,newsletter`}</CodeBlock>
      </div>

      {/* Tags */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Tags</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les tags sont des etiquettes manuelles avec une couleur personnalisable.
            Chaque tag est stocke dans la table <code className="text-zinc-200">ContactTag</code> avec
            un champ <code className="text-zinc-200">color</code> (hex, defaut : #6B7280).
          </p>
        </div>

        <CodeBlock title="schema.prisma — ContactTag">{`model ContactTag {
  id        String  @id @default(cuid())
  name      String                    // Nom du tag (ex: "VIP")
  color     String  @default("#6B7280") // Couleur hex
  contactId String
  contact   Contact @relation(...)
}`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3 mt-4">
          <p>Exemples d&apos;utilisation :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "\"VIP\" — Vos meilleurs clients (couleur orange)",
              "\"Salon 2025\" — Contacts d'un evenement specifique",
              "\"Lead chaud\" — Prospects qualifies par l'equipe commerciale",
              "\"Newsletter\" — Abonnes au bulletin regulier",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Contact lists */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Listes de contacts</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les listes permettent de grouper des contacts pour cibler vos campagnes.
            Deux types existent :
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            {
              type: "manual",
              desc: "Liste statique : vous ajoutez/retirez des contacts manuellement. Ideal pour les listes ponctuelles (ex: \"Invites conference\").",
              badge: "bg-emerald-500/10 text-emerald-400",
            },
            {
              type: "dynamic",
              desc: "Liste dynamique : les contacts entrent/sortent automatiquement selon un filtre JSON (dynamicFilter). Equivalent a un segment sauvegarde.",
              badge: "bg-blue-500/10 text-blue-400",
            },
          ].map((item) => (
            <div
              key={item.type}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${item.badge}`}>
                {item.type}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segments */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Segments dynamiques</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les segments sont des groupes de contacts qui se mettent a jour automatiquement
            en fonction de criteres. Les contacts entrent et sortent du segment selon
            leur comportement et leurs proprietes.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {[
            { name: "Contacts actifs", rule: "lastEngagedAt < 30 jours" },
            { name: "Nouveaux abonnes", rule: "createdAt < 7 jours" },
            { name: "Inactifs", rule: "lastEngagedAt > 90 jours OU jamais engage" },
            { name: "Clients VIP engages", rule: "tag = \"VIP\" ET engagementScore > 70" },
          ].map((seg) => (
            <div
              key={seg.name}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                {seg.name}
              </span>
              <span className="text-sm text-zinc-400">{seg.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom fields */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Champs personnalises (metadata)</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Le champ <code className="text-zinc-200">metadata</code> est un JSON libre qui
            permet de stocker des proprietes personnalisees sans modifier le schema :
          </p>
        </div>

        <CodeBlock title="Exemple metadata">{`{
  "plan": "pro",
  "signup_source": "website",
  "company": "Acme Corp",
  "city": "Abidjan",
  "language": "fr"
}`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3 mt-3">
          <p>
            Ces champs peuvent etre utilises dans les segments dynamiques
            et comme variables de personnalisation dans vos emails.
          </p>
        </div>
      </div>

      {/* Engagement scoring */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Score d&apos;engagement</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Chaque contact a un <code className="text-zinc-200">engagementScore</code> de 0 a 100 :
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { range: "0 — 30", label: "Froid", color: "text-blue-400", desc: "Peu ou pas d'interaction" },
            { range: "31 — 70", label: "Tiede", color: "text-amber-400", desc: "Activite moderee" },
            { range: "71 — 100", label: "Chaud", color: "text-emerald-400", desc: "Tres engage" },
          ].map((item) => (
            <div key={item.range} className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 text-center">
              <div className={`text-lg font-mono font-bold ${item.color}`}>{item.range}</div>
              <div className="text-sm font-medium text-zinc-200 mt-1">{item.label}</div>
              <div className="text-xs text-zinc-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>

        <div className="prose-sm text-zinc-400 space-y-3 mt-4">
          <p>Le score est mis a jour par les webhooks Resend et le tracking :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Ouverture d'email (+5 points) — via pixel de tracking",
              "Clic sur un lien (+10 points) — via redirect 302",
              "Inactivite prolongee (-2 points par semaine)",
              "Hard bounce ou plainte — score remis a 0, contact desabonne",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Unsubscribe handling */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Desabonnements et rebonds</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            La suppression automatique des contacts invalides protege votre reputation
            d&apos;expediteur. Le traitement est gere par le webhook Resend :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "email.bounced (hard) — Contact marque subscribed=false, bounceType=\"hard\". Plus aucun email envoye.",
              "email.complained — Contact marque subscribed=false immediatement. Ne pourra plus etre re-abonne.",
              "Desabonnement via lien — Traite par /api/unsubscribe (POST one-click ou GET navigateur). Contact marque subscribed=false.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Conformite :</strong> Chaque email envoye contient
          un header <code className="font-mono text-zinc-200">List-Unsubscribe</code> (RFC 8058)
          pour le desabonnement en un clic directement depuis le client de messagerie.
          Le desabonnement est instantane (pas de delai de 48h).
        </InfoBox>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vos contacts sont organises !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/campaigns" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Maitriser les campagnes
          </a>
        </p>
      </div>
    </div>
  );
}
