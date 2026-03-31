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
            Trois methodes pour ajouter des contacts :
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
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
              parse cote client avec PapaParse. MailPulse detecte automatiquement
              les colonnes, deduplique par email et cree les contacts en masse.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Pages de capture</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Formulaires publics qui ajoutent automatiquement les abonnes.
              Creez une page de capture depuis le dashboard, personnalisez les champs
              et partagez le lien. Les nouveaux contacts sont ajoutes a la liste choisie.
            </p>
          </div>
        </div>

        <CodeBlock title="Format CSV attendu">{`email,firstName,lastName,phone,tags
marie@exemple.fr,Marie,Dupont,+225070000,"client,vip"
jean@exemple.fr,Jean,Martin,,prospect
sophie@exemple.fr,Sophie,Bernard,,newsletter`}</CodeBlock>
      </div>

      {/* CSV Import — 3-step flow */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Import CSV — Flux en 3 etapes</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            L&apos;import CSV suit un flux guide en trois etapes. Le parsing est entierement
            cote client via <code className="text-zinc-200">PapaParse</code> pour un retour instantane,
            meme sur de gros fichiers.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {[
            {
              step: "1",
              title: "Upload du fichier",
              desc: "Glissez-deposez ou selectionnez un fichier .csv. PapaParse analyse le fichier localement (pas d'upload serveur a cette etape). Un apercu des 5 premieres lignes s'affiche immediatement.",
            },
            {
              step: "2",
              title: "Mapping des colonnes",
              desc: "MailPulse detecte automatiquement les colonnes (email, firstName, lastName, phone, tags) par correspondance de nom. Vous pouvez corriger manuellement le mapping via des dropdowns. Les colonnes non mappees sont ignorees.",
            },
            {
              step: "3",
              title: "Resultat de l'import",
              desc: "Les contacts sont crees en masse via prisma.contact.createMany({ skipDuplicates: true }). Un resume affiche le nombre de contacts crees, ignores (doublons) et en erreur.",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
              <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-orange-500/10 text-orange-400 font-mono font-bold text-sm shrink-0">
                {item.step}
              </span>
              <div>
                <div className="text-sm font-mono font-semibold text-zinc-200 mb-1">{item.title}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <CodeBlock title="Server Action — Import en masse">{`// actions/contacts.ts
const result = await prisma.contact.createMany({
  data: parsedContacts.map((c) => ({
    email: c.email,
    firstName: c.firstName ?? null,
    lastName: c.lastName ?? null,
    phone: c.phone ?? null,
    subscribed: true,
    source: "csv_import",
    organizationId,
    userId,
  })),
  skipDuplicates: true, // Ignore les emails deja existants
});
// result.count = nombre de contacts crees`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Auto-detection :</strong> Le mapping automatique
          reconnait les variantes courantes : <code className="font-mono text-zinc-200">prenom</code>,{" "}
          <code className="font-mono text-zinc-200">first_name</code>,{" "}
          <code className="font-mono text-zinc-200">firstName</code>,{" "}
          <code className="font-mono text-zinc-200">Prenom</code> sont tous mappes vers{" "}
          <code className="font-mono text-zinc-200">firstName</code>.
        </InfoBox>
      </div>

      {/* Tags multi-select */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Tags — Multi-select avec autocomplete</h2>
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

        <div className="prose-sm text-zinc-400 space-y-3 mt-4 mb-4">
          <p>
            Le selecteur de tags fonctionne avec des <strong className="text-zinc-200">pills cliquables</strong> et
            un champ de recherche avec autocomplete. Ce n&apos;est pas un champ texte libre :
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            {
              feature: "Autocomplete",
              desc: "Tapez pour filtrer les tags existants de l'organisation. Les resultats s'affichent dans un dropdown en temps reel.",
            },
            {
              feature: "Pills cliquables",
              desc: "Les tags assignes s'affichent comme des pills colorees. Cliquez sur la croix pour retirer un tag du contact.",
            },
            {
              feature: "Creation inline",
              desc: "Si le tag n'existe pas, un bouton \"Creer [nom]\" apparait dans le dropdown. Choisissez une couleur et validez sans quitter la fiche contact.",
            },
            {
              feature: "Recherche",
              desc: "La recherche est insensible a la casse et filtre sur le debut du nom du tag. Les tags deja assignes sont exclus des suggestions.",
            },
          ].map((item) => (
            <div
              key={item.feature}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                {item.feature}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

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

      {/* Custom fields */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Champs personnalises</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les champs personnalises sont geres depuis la page{" "}
            <code className="text-zinc-200">/dashboard/fields</code>. Chaque champ est
            defini par un nom machine, un label, un type et une option obligatoire/optionnel.
            Les valeurs sont stockees dans le champ <code className="text-zinc-200">metadata</code> (JSON)
            de chaque contact. CRUD complet disponible.
          </p>
        </div>

        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            <strong className="text-zinc-200">7 types de champs</strong> sont disponibles :
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { type: "text", desc: "Champ texte libre (ex: company, city)" },
            { type: "number", desc: "Valeur numerique (ex: age, revenue)" },
            { type: "email", desc: "Adresse email secondaire" },
            { type: "url", desc: "URL (ex: site web, profil LinkedIn)" },
            { type: "date", desc: "Date (ex: anniversaire, date d'inscription)" },
            { type: "select", desc: "Choix parmi des options predefinies (ex: plan, secteur)" },
            { type: "boolean", desc: "Vrai/faux (ex: client_premium, opt_in_sms)" },
          ].map((item) => (
            <div
              key={item.type}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                {item.type}
              </code>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Exemple metadata">{`{
  "plan": "pro",
  "signup_source": "website",
  "company": "Acme Corp",
  "city": "Abidjan",
  "language": "fr"
}`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3 mt-3 mb-4">
          <p>
            <strong className="text-zinc-200">Syntaxe de variable :</strong> Utilisez la notation{" "}
            <code className="text-zinc-200">{`{{nom_du_champ}}`}</code> pour inserer dynamiquement
            la valeur d&apos;un champ dans vos emails. MailPulse remplace automatiquement
            les variables au moment de l&apos;envoi.
          </p>
        </div>

        <CodeBlock title="Variables dans les emails">{`Bonjour {{firstName}},

Votre plan actuel : {{plan}}
Ville : {{city}}

// Les champs non renseignes sont remplaces par une chaine vide.
// Utilisez une valeur par defaut : {{city|Abidjan}}`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3 mt-3">
          <p>
            Ces champs peuvent etre utilises dans les segments dynamiques,
            comme variables de personnalisation dans vos emails et dans les
            formulaires de pages de capture.
          </p>
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

      {/* Smart Segmentation */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Segmentation intelligente</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Les segments sont des groupes de contacts qui se mettent a jour automatiquement
            en fonction de criteres. Les filtres sont stockes en JSON et resolus dynamiquement
            a chaque consultation. La page detail d&apos;un segment affiche la liste des contacts
            resolus en temps reel.
          </p>
        </div>

        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            <strong className="text-zinc-200">Filtres dynamiques disponibles :</strong>
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { filter: "subscribed", desc: "Filtrer par statut d'abonnement (true/false)" },
            { filter: "tags", desc: "Contient un ou plusieurs tags specifiques (operateur AND ou OR)" },
            { filter: "engagementMin", desc: "Score d'engagement minimum (0-100)" },
            { filter: "createdAfter", desc: "Date de creation apres une date donnee (ISO 8601)" },
          ].map((item) => (
            <div
              key={item.filter}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                {item.filter}
              </code>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Exemple — Filtre JSON d'un segment">{`// Segment "Clients VIP actifs"
{
  "subscribed": true,
  "tags": ["VIP"],
  "engagementMin": 70,
  "createdAfter": "2025-01-01T00:00:00Z"
}

// Resolution : Prisma WHERE clause generee dynamiquement
const contacts = await prisma.contact.findMany({
  where: {
    organizationId,
    subscribed: filter.subscribed,
    tags: { some: { name: { in: filter.tags } } },
    engagementScore: { gte: filter.engagementMin },
    createdAt: { gte: new Date(filter.createdAfter) },
  },
});`}</CodeBlock>

        <div className="mt-4 space-y-3">
          <div className="prose-sm text-zinc-400">
            <p><strong className="text-zinc-200">Exemples de segments preconfigures :</strong></p>
          </div>
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

        <InfoBox>
          <strong className="text-orange-400">Page detail segment :</strong> Cliquez sur un segment
          pour voir la liste des contacts resolus. Le nombre de contacts est recalcule a chaque
          visite — les contacts entrent et sortent du segment automatiquement selon leurs proprietes.
        </InfoBox>
      </div>

      {/* Advanced filters */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Filtres avances</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            La page contacts propose des filtres avances pour retrouver rapidement
            vos contacts. Tous les filtres sont combinables et appliques en temps reel.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              filter: "Recherche",
              desc: "Recherche par email, prenom ou nom. Insensible a la casse, resultat en temps reel au fur et a mesure de la saisie.",
              icon: "search",
            },
            {
              filter: "Statut d'abonnement",
              desc: "Filtrez par abonnes, desabonnes ou tous. Dropdown avec trois options.",
              icon: "filter",
            },
            {
              filter: "Tags",
              desc: "Filtrez par tag via un dropdown multi-select. Affichez uniquement les contacts qui ont un ou plusieurs tags selectionnes.",
              icon: "tag",
            },
            {
              filter: "Tri",
              desc: "Triez par date de creation (recent/ancien), nom (A-Z/Z-A) ou score d'engagement (haut/bas).",
              icon: "sort",
            },
          ].map((item) => (
            <div key={item.filter} className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
              <div className="text-sm font-mono font-semibold text-orange-400 mb-1">{item.filter}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <CodeBlock title="Exemple — Parametres URL des filtres">{`// Les filtres sont refletes dans l'URL pour le partage et le bookmark
/dashboard/contacts?search=marie&subscribed=true&tag=VIP&sort=engagement_desc

// Cote serveur, les filtres sont appliques via Prisma WHERE
const contacts = await prisma.contact.findMany({
  where: {
    organizationId,
    OR: [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ],
    subscribed: subscribedFilter ?? undefined,
    tags: tagFilter ? { some: { name: tagFilter } } : undefined,
  },
  orderBy: sortMap[sort],
});`}</CodeBlock>
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

      {/* Contact detail page */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Page detail contact</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Cliquez sur un contact pour acceder a sa fiche detaillee
            (<code className="text-zinc-200">/dashboard/contacts/[id]</code>). Cette page
            regroupe toutes les informations et actions sur un contact.
          </p>
        </div>

        {/* Header with toggle */}
        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 mb-3">
          <div className="text-sm font-mono font-semibold text-orange-400 mb-1">En-tete</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Affiche le nom complet, l&apos;email, le score d&apos;engagement et la source du contact.
            Un toggle <code className="text-zinc-200">Abonne / Desabonne</code> permet de changer
            le statut d&apos;abonnement instantanement (Server Action).
          </p>
        </div>

        {/* 6 stat cards */}
        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 mb-3">
          <div className="text-sm font-mono font-semibold text-orange-400 mb-2">6 cartes statistiques</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              "Emails envoyes",
              "Emails delivres",
              "Ouvertures",
              "Clics",
              "Taux d'ouverture",
              "Taux de clic",
            ].map((stat) => (
              <div key={stat} className="px-3 py-2 rounded-lg bg-zinc-800/30 text-xs text-zinc-300 font-mono text-center">
                {stat}
              </div>
            ))}
          </div>
        </div>

        {/* AreaChart */}
        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 mb-3">
          <div className="text-sm font-mono font-semibold text-orange-400 mb-1">Graphique de performance</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Un <code className="text-zinc-200">AreaChart</code> (Recharts) affiche l&apos;evolution
            des ouvertures et clics sur les 30 derniers jours. Les deux series (opens, clicks) sont
            empilees avec des couleurs distinctes.
          </p>
        </div>

        {/* Edit mode */}
        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 mb-3">
          <div className="text-sm font-mono font-semibold text-orange-400 mb-1">Mode edition</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Cliquez sur &quot;Modifier&quot; pour passer en mode edition inline. Champs editables :
            nom, prenom, telephone et tous les champs personnalises (custom fields) definis
            pour l&apos;organisation. La sauvegarde est validee via Zod et executee par Server Action.
          </p>
        </div>

        {/* Tags with autocomplete */}
        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 mb-3">
          <div className="text-sm font-mono font-semibold text-orange-400 mb-1">Tags avec recherche et autocomplete</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Selecteur de tags avec pills cliquables et champ de recherche. Les tags existants
            de l&apos;organisation sont suggeres. Creez un nouveau tag inline si necessaire
            (voir section Tags ci-dessus).
          </p>
        </div>

        {/* Active automations */}
        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 mb-3">
          <div className="text-sm font-mono font-semibold text-orange-400 mb-1">Automations actives</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Liste des automations actuellement actives pour ce contact. Chaque automation affiche
            son nom, son statut (en cours, en pause, terminee) et un bouton pour declencher
            manuellement l&apos;etape suivante ou relancer l&apos;automation.
          </p>
        </div>

        {/* Activity timeline */}
        <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
          <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Timeline d&apos;activite</div>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            Historique chronologique complet de toutes les interactions du contact.
            Un dropdown permet de filtrer par type d&apos;evenement. <strong className="text-zinc-200">13 types d&apos;evenements</strong> sont traces :
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {[
              "email.sent",
              "email.delivered",
              "email.opened",
              "email.clicked",
              "email.bounced",
              "email.complained",
              "contact.created",
              "contact.updated",
              "contact.subscribed",
              "contact.unsubscribed",
              "tag.added",
              "tag.removed",
              "automation.triggered",
            ].map((event) => (
              <code
                key={event}
                className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800/50 text-zinc-400 text-center"
              >
                {event}
              </code>
            ))}
          </div>
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
