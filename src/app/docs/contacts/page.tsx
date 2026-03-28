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
          Gerez vos contacts, creez des segments intelligents et gardez une base
          de donnees propre et conforme au RGPD.
        </p>
      </div>

      {/* Ajouter manuellement */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Ajouter des contacts manuellement</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Depuis la page <span className="font-mono text-zinc-200">Contacts</span>, cliquez
            sur <span className="text-zinc-200 font-medium">&quot;Ajouter un contact&quot;</span> et
            renseignez les informations suivantes :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Email (obligatoire) — L'adresse email du contact",
              "Prenom et Nom — Pour la personnalisation de vos campagnes",
              "Entreprise — Utile pour le B2B et la segmentation",
              "Tags — Etiquettes pour organiser vos contacts (ex: \"VIP\", \"Prospect\")",
              "Proprietes personnalisees — Champs libres pour toute information supplementaire",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Import CSV */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Importer via CSV</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Pour importer en masse, preparez un fichier CSV avec vos contacts.
            MailPulse detecte automatiquement les colonnes et vous permet de les
            faire correspondre aux champs de contact.
          </p>
        </div>

        <CodeBlock title="Format CSV attendu">{`email,prenom,nom,entreprise,tags
marie@exemple.fr,Marie,Dupont,Acme Corp,"client,vip"
jean@exemple.fr,Jean,Martin,StartupXYZ,"prospect"
sophie@exemple.fr,Sophie,Bernard,,"newsletter"`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3 mt-4">
          <p>Lors de l&apos;import, MailPulse effectue automatiquement :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Validation des adresses email (format et syntaxe)",
              "Suppression des doublons (basee sur l'email)",
              "Detection des adresses invalides ou jetables",
              "Application des tags specifies dans le fichier",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Limite :</strong> Vous pouvez importer jusqu&apos;a
          100 000 contacts par fichier CSV. Pour des volumes plus importants, decoupez votre
          fichier ou utilisez l&apos;API.
        </InfoBox>
      </div>

      {/* Tags */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Tags</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les tags sont des etiquettes que vous attribuez manuellement a vos contacts pour
            les organiser. Contrairement aux segments, les tags ne changent pas automatiquement.
          </p>
          <p>Exemples d&apos;utilisation :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "\"VIP\" — Vos meilleurs clients",
              "\"Salon 2025\" — Contacts rencontres lors d'un evenement",
              "\"Beta testeur\" — Contacts participant a un programme beta",
              "\"Lead chaud\" — Prospects qualifies par votre equipe commerciale",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Segments */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Segments dynamiques</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les segments sont des groupes de contacts qui se mettent a jour automatiquement
            en fonction de criteres que vous definissez. Les contacts entrent et sortent du
            segment selon leur comportement.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {[
            {
              name: "Contacts actifs",
              rule: "A ouvert un email dans les 30 derniers jours",
            },
            {
              name: "Nouveaux abonnes",
              rule: "Date d'inscription < 7 jours",
            },
            {
              name: "Inactifs",
              rule: "N'a pas ouvert d'email depuis 90 jours",
            },
            {
              name: "Clients premium",
              rule: "Tag = \"VIP\" ET a clique dans les 14 derniers jours",
            },
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

        <CodeBlock title="Operateurs de segmentation">{`Conditions disponibles :
─────────────────────
email         contient / ne contient pas
tag           est / n'est pas
date_ajout    avant / apres / entre
ouvertures    > / < / = (nombre)
clics         > / < / = (nombre)
derniere_activite  il y a moins de / plus de (jours)
propriete     egal a / different de / contient

Combinaisons :
─────────────
ET  — Toutes les conditions doivent etre remplies
OU  — Au moins une condition doit etre remplie`}</CodeBlock>
      </div>

      {/* Scoring */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Score d&apos;engagement</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Chaque contact recoit un score d&apos;engagement de 0 a 100, calcule automatiquement
            par MailPulse en fonction de son activite :
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
          <p>Le score est influence par :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Ouvertures d'emails (+5 points par ouverture)",
              "Clics sur les liens (+10 points par clic)",
              "Frequence d'activite (bonus pour activite reguliere)",
              "Inactivite prolongee (-2 points par semaine sans interaction)",
              "Desabonnement ou plainte (score remis a 0)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Desabonnements et rebonds */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Desabonnements et rebonds</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            MailPulse gere automatiquement les desabonnements et les rebonds pour
            proteger votre reputation d&apos;expediteur :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Desabonnement — Le contact est immediatement exclu des futurs envois. Un lien de desabonnement est obligatoire dans chaque email.",
              "Rebond leger (soft bounce) — Probleme temporaire (boite pleine). MailPulse reessaie automatiquement pendant 72h.",
              "Rebond dur (hard bounce) — Adresse invalide. Le contact est desactive automatiquement et ne recevra plus d'emails.",
              "Plainte spam — Le contact est supprime instantanement et ne pourra plus etre re-ajoute.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Important :</strong> Surveillez votre taux de rebond.
          Un taux superieur a 2% peut affecter votre reputation d&apos;expediteur et reduire votre
          delivrabilite. Nettoyez regulierement votre base en supprimant les contacts inactifs.
        </InfoBox>
      </div>

      {/* RGPD */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Conformite RGPD</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            MailPulse integre les outils necessaires pour respecter le Reglement General
            sur la Protection des Donnees (RGPD) :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Consentement — Enregistrement de la date, de la source et du type de consentement pour chaque contact",
              "Droit d'acces — Export des donnees d'un contact en un clic (format JSON)",
              "Droit a l'oubli — Suppression definitive de toutes les donnees d'un contact",
              "Portabilite — Export complet de votre base de contacts au format CSV",
              "Lien de desabonnement — Obligatoire dans chaque email, en un clic (List-Unsubscribe RFC 8058)",
              "Double opt-in — Option disponible pour exiger une confirmation par email avant ajout",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Registre de consentement">{`Contact : marie@exemple.fr
─────────────────────────
Consentement : OUI
Date         : 2026-01-15 14:32:00 UTC
Source       : Formulaire site web
Type         : Opt-in explicite
IP           : 192.168.1.xxx
Page         : https://exemple.fr/newsletter`}</CodeBlock>
      </div>

      {/* Etape suivante */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vos contacts sont organises !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/campaigns" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Maitriser les campagnes
          </a>
        </p>
      </div>
    </div>
  );
}
