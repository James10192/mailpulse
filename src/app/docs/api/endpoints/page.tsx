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

function EndpointBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-400",
    POST: "bg-blue-500/10 text-blue-400",
    PUT: "bg-amber-500/10 text-amber-400",
    PATCH: "bg-purple-500/10 text-purple-400",
    DELETE: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${colors[method] ?? "bg-zinc-800 text-zinc-400"}`}>
      {method}
    </span>
  );
}

export default function ApiEndpointsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
          </span>
          API Reference
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
          Endpoints
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Reference complete de tous les endpoints de l&apos;API MailPulse.
          Gerez vos contacts, campagnes, listes et templates par programmation.
        </p>
      </div>

      {/* Base URL */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">URL de base</h2>
        <CodeBlock title="Base URL">{`https://api.mailpulse.io/v1`}</CodeBlock>
        <div className="prose-sm text-zinc-400">
          <p>
            Tous les endpoints ci-dessous sont relatifs a cette URL de base.
            Toutes les requetes et reponses utilisent le format JSON.
          </p>
        </div>
      </div>

      {/* ─── CONTACTS API ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Contacts</h2>
        <div className="space-y-2 mb-6">
          {[
            { method: "GET", path: "/contacts", desc: "Lister tous les contacts (pagine)" },
            { method: "GET", path: "/contacts/:id", desc: "Recuperer un contact par ID" },
            { method: "POST", path: "/contacts", desc: "Creer un nouveau contact" },
            { method: "PUT", path: "/contacts/:id", desc: "Mettre a jour un contact" },
            { method: "DELETE", path: "/contacts/:id", desc: "Supprimer un contact" },
            { method: "POST", path: "/contacts/import", desc: "Importer des contacts (CSV ou JSON)" },
          ].map((ep) => (
            <div
              key={ep.method + ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="curl — Lister les contacts">{`curl -X GET "https://api.mailpulse.io/v1/contacts?page=1&limit=50" \\
  -H "Authorization: Bearer mp_live_xxxxx"`}</CodeBlock>

        <CodeBlock title="curl — Creer un contact">{`curl -X POST "https://api.mailpulse.io/v1/contacts" \\
  -H "Authorization: Bearer mp_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "marie@exemple.fr",
    "firstName": "Marie",
    "lastName": "Dupont",
    "company": "Acme Corp",
    "tags": ["client", "vip"],
    "properties": {
      "plan": "pro",
      "signup_source": "website"
    }
  }'`}</CodeBlock>

        <CodeBlock title="Node.js — Creer un contact">{`const response = await fetch("https://api.mailpulse.io/v1/contacts", {
  method: "POST",
  headers: {
    "Authorization": "Bearer mp_live_xxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "marie@exemple.fr",
    firstName: "Marie",
    lastName: "Dupont",
    tags: ["client", "vip"],
  }),
});

const contact = await response.json();
console.log(contact.id); // "ct_abc123def456"`}</CodeBlock>

        <CodeBlock title="Python — Creer un contact">{`import requests

response = requests.post(
    "https://api.mailpulse.io/v1/contacts",
    headers={
        "Authorization": "Bearer mp_live_xxxxx",
        "Content-Type": "application/json",
    },
    json={
        "email": "marie@exemple.fr",
        "firstName": "Marie",
        "lastName": "Dupont",
        "tags": ["client", "vip"],
    },
)

contact = response.json()
print(contact["id"])  # "ct_abc123def456"`}</CodeBlock>

        <CodeBlock title="Reponse type">{`{
  "id": "ct_abc123def456",
  "email": "marie@exemple.fr",
  "firstName": "Marie",
  "lastName": "Dupont",
  "company": "Acme Corp",
  "tags": ["client", "vip"],
  "properties": {
    "plan": "pro",
    "signup_source": "website"
  },
  "engagementScore": 0,
  "status": "active",
  "createdAt": "2026-03-15T10:30:00Z",
  "updatedAt": "2026-03-15T10:30:00Z"
}`}</CodeBlock>
      </div>

      {/* ─── CAMPAIGNS API ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Campagnes</h2>
        <div className="space-y-2 mb-6">
          {[
            { method: "GET", path: "/campaigns", desc: "Lister toutes les campagnes" },
            { method: "GET", path: "/campaigns/:id", desc: "Recuperer une campagne par ID" },
            { method: "POST", path: "/campaigns", desc: "Creer une nouvelle campagne" },
            { method: "PUT", path: "/campaigns/:id", desc: "Mettre a jour une campagne (brouillon)" },
            { method: "POST", path: "/campaigns/:id/send", desc: "Envoyer une campagne" },
            { method: "POST", path: "/campaigns/:id/schedule", desc: "Planifier une campagne" },
            { method: "GET", path: "/campaigns/:id/stats", desc: "Statistiques d'une campagne" },
            { method: "DELETE", path: "/campaigns/:id", desc: "Supprimer une campagne (brouillon)" },
          ].map((ep) => (
            <div
              key={ep.method + ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="curl — Creer et envoyer une campagne">{`# 1. Creer la campagne
curl -X POST "https://api.mailpulse.io/v1/campaigns" \\
  -H "Authorization: Bearer mp_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Newsletter Mars 2026",
    "subject": "Les nouveautes de mars",
    "preheader": "Decouvrez nos dernieres fonctionnalites",
    "from": {
      "name": "Equipe MailPulse",
      "email": "newsletter@votre-domaine.com"
    },
    "templateId": "tpl_xxx",
    "recipients": {
      "segmentId": "seg_actifs_30j"
    }
  }'

# Reponse : { "id": "cmp_abc123", "status": "draft" }

# 2. Envoyer la campagne
curl -X POST "https://api.mailpulse.io/v1/campaigns/cmp_abc123/send" \\
  -H "Authorization: Bearer mp_live_xxxxx"`}</CodeBlock>

        <CodeBlock title="curl — Statistiques d'une campagne">{`curl -X GET "https://api.mailpulse.io/v1/campaigns/cmp_abc123/stats" \\
  -H "Authorization: Bearer mp_live_xxxxx"

# Reponse :
{
  "campaignId": "cmp_abc123",
  "sent": 5230,
  "delivered": 5198,
  "opened": 1612,
  "clicked": 287,
  "bounced": 32,
  "complained": 3,
  "unsubscribed": 12,
  "rates": {
    "delivery": 99.4,
    "open": 31.0,
    "click": 5.5,
    "bounce": 0.6,
    "complaint": 0.06,
    "unsubscribe": 0.23
  }
}`}</CodeBlock>
      </div>

      {/* ─── LISTS API ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Listes et segments</h2>
        <div className="space-y-2 mb-6">
          {[
            { method: "GET", path: "/lists", desc: "Lister toutes les listes" },
            { method: "POST", path: "/lists", desc: "Creer une liste" },
            { method: "POST", path: "/lists/:id/contacts", desc: "Ajouter des contacts a une liste" },
            { method: "DELETE", path: "/lists/:id/contacts/:contactId", desc: "Retirer un contact d'une liste" },
            { method: "GET", path: "/segments", desc: "Lister tous les segments" },
            { method: "GET", path: "/segments/:id/contacts", desc: "Contacts d'un segment" },
          ].map((ep) => (
            <div
              key={ep.method + ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="curl — Creer une liste">{`curl -X POST "https://api.mailpulse.io/v1/lists" \\
  -H "Authorization: Bearer mp_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Clients 2026",
    "description": "Tous les clients ayant achete en 2026"
  }'`}</CodeBlock>
      </div>

      {/* ─── TEMPLATES API ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Templates</h2>
        <div className="space-y-2 mb-6">
          {[
            { method: "GET", path: "/templates", desc: "Lister tous les templates" },
            { method: "GET", path: "/templates/:id", desc: "Recuperer un template" },
            { method: "POST", path: "/templates", desc: "Creer un template" },
            { method: "PUT", path: "/templates/:id", desc: "Mettre a jour un template" },
            { method: "DELETE", path: "/templates/:id", desc: "Supprimer un template" },
            { method: "POST", path: "/templates/:id/preview", desc: "Generer un apercu HTML" },
          ].map((ep) => (
            <div
              key={ep.method + ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="curl — Creer un template">{`curl -X POST "https://api.mailpulse.io/v1/templates" \\
  -H "Authorization: Bearer mp_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Newsletter standard",
    "subject": "{{sujet}}",
    "html": "<html><body><h1>Bonjour {{prenom}}</h1><p>{{contenu}}</p></body></html>",
    "variables": ["sujet", "prenom", "contenu"]
  }'`}</CodeBlock>
      </div>

      {/* Pagination */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Pagination</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Tous les endpoints qui retournent des listes sont pagines. Utilisez
            les parametres <span className="font-mono text-zinc-200">page</span> et{" "}
            <span className="font-mono text-zinc-200">limit</span> pour naviguer :
          </p>
        </div>

        <CodeBlock title="Parametres de pagination">{`GET /v1/contacts?page=2&limit=50

# Reponse :
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 1247,
    "totalPages": 25,
    "hasMore": true
  }
}`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Limite :</strong> La valeur maximale
          pour <span className="font-mono">limit</span> est 100 elements par page.
          La valeur par defaut est 25.
        </InfoBox>
      </div>

      {/* Codes d'erreur */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Codes d&apos;erreur</h2>
        <div className="space-y-2">
          {[
            { code: "200", desc: "Succes", color: "text-emerald-400 bg-emerald-500/10" },
            { code: "201", desc: "Ressource creee avec succes", color: "text-emerald-400 bg-emerald-500/10" },
            { code: "400", desc: "Requete invalide (parametres manquants ou incorrects)", color: "text-amber-400 bg-amber-500/10" },
            { code: "401", desc: "Non authentifie (cle API manquante ou invalide)", color: "text-red-400 bg-red-500/10" },
            { code: "403", desc: "Acces refuse (permissions insuffisantes)", color: "text-red-400 bg-red-500/10" },
            { code: "404", desc: "Ressource non trouvee", color: "text-red-400 bg-red-500/10" },
            { code: "409", desc: "Conflit (ex: email deja existant)", color: "text-amber-400 bg-amber-500/10" },
            { code: "422", desc: "Entite non traitable (validation echouee)", color: "text-amber-400 bg-amber-500/10" },
            { code: "429", desc: "Limite de debit atteinte", color: "text-red-400 bg-red-500/10" },
            { code: "500", desc: "Erreur interne du serveur", color: "text-red-400 bg-red-500/10" },
          ].map((item) => (
            <div
              key={item.code}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${item.color}`}>
                {item.code}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Etape suivante */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous connaissez les endpoints !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/api/webhooks" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Configurer les webhooks
          </a>
        </p>
      </div>
    </div>
  );
}
