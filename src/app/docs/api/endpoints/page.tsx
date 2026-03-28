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
    ACTION: "bg-orange-500/10 text-orange-400",
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
          MailPulse utilise des Server Actions (Next.js) pour les mutations
          et des Route Handlers pour les API publiques (tracking, upload, webhooks).
        </p>
      </div>

      {/* Architecture note */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Architecture</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les operations CRUD (contacts, campagnes, etc.) sont implementees
            comme des <strong className="text-zinc-200">Server Actions</strong> (fichiers{" "}
            <code className="text-zinc-200">actions.ts</code> avec <code className="text-zinc-200">&quot;use server&quot;</code>).
            Elles sont appelees depuis les composants React via{" "}
            <code className="text-zinc-200">useActionState</code> ou directement.
          </p>
          <p>
            Les <strong className="text-zinc-200">Route Handlers</strong> (fichiers{" "}
            <code className="text-zinc-200">route.ts</code>) sont reserves aux endpoints
            publics qui doivent etre accessibles sans le framework React.
          </p>
        </div>
      </div>

      {/* ─── CONTACTS ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Contacts</h2>
        <div className="prose-sm text-zinc-400 space-y-1 mb-4">
          <p>
            Fichier : <code className="text-zinc-200">src/app/(dashboard)/dashboard/contacts/actions.ts</code>
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {[
            { method: "ACTION", path: "createContact(formData)", desc: "Creer un contact (email, firstName, lastName, phone, tags)" },
            { method: "ACTION", path: "deleteContact(id)", desc: "Supprimer un contact par ID" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="createContact — Validation Zod">{`const createContactSchema = z.object({
  email: z.string().email("Email invalide"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
});

// Appele via useActionState dans le formulaire
// Synchronise automatiquement vers Convex apres creation`}</CodeBlock>
      </div>

      {/* ─── CAMPAIGNS ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Campagnes</h2>
        <div className="prose-sm text-zinc-400 space-y-1 mb-4">
          <p>
            Fichier : <code className="text-zinc-200">src/app/(dashboard)/dashboard/campaigns/actions.ts</code>
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {[
            { method: "ACTION", path: "createCampaign(formData)", desc: "Creer une campagne (name, type, subject...)" },
            { method: "ACTION", path: "deleteCampaign(id)", desc: "Supprimer une campagne (DRAFT uniquement)" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── AUTOMATIONS ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Automations</h2>
        <div className="prose-sm text-zinc-400 space-y-1 mb-4">
          <p>
            Fichier : <code className="text-zinc-200">src/app/(dashboard)/dashboard/automations/actions.ts</code>
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {[
            { method: "ACTION", path: "createAutomation(formData)", desc: "Creer une automation (name, trigger)" },
            { method: "ACTION", path: "deleteAutomation(id)", desc: "Supprimer une automation" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SNIPPETS ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Snippets</h2>
        <div className="prose-sm text-zinc-400 space-y-1 mb-4">
          <p>
            Fichier : <code className="text-zinc-200">src/app/(dashboard)/dashboard/snippets/actions.ts</code>
          </p>
          <p className="text-xs text-zinc-500">
            Les snippets sont stockes comme des EmailTemplate avec category = &quot;snippet&quot;.
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {[
            { method: "ACTION", path: "createSnippetAndRedirect(formData)", desc: "Creer un snippet et rediriger vers l'editeur" },
            { method: "ACTION", path: "updateSnippet(id, data)", desc: "Mettre a jour nom, description ou contenu HTML" },
            { method: "ACTION", path: "deleteSnippet(id)", desc: "Supprimer un snippet" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SENDERS ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Senders</h2>
        <div className="prose-sm text-zinc-400 space-y-1 mb-4">
          <p>
            Fichier : <code className="text-zinc-200">src/app/(dashboard)/dashboard/senders/actions.ts</code>
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {[
            { method: "ACTION", path: "createSender(formData)", desc: "Creer un expediteur" },
            { method: "ACTION", path: "deleteSender(id)", desc: "Supprimer un expediteur" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── CAPTURE PAGES ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Capture Pages</h2>
        <div className="prose-sm text-zinc-400 space-y-1 mb-4">
          <p>
            Fichier : <code className="text-zinc-200">src/app/(dashboard)/dashboard/capture-pages/actions.ts</code>
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {[
            { method: "ACTION", path: "createCapturePage(formData)", desc: "Creer une page de capture" },
            { method: "ACTION", path: "deleteCapturePage(id)", desc: "Supprimer une page de capture" },
            { method: "ACTION", path: "toggleCapturePagePublished(id, published)", desc: "Publier / depublier une page" },
            { method: "ACTION", path: "updateCapturePageFields(id, data)", desc: "Mettre a jour les champs d'une page" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── OTHER SERVER ACTIONS ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Autres Server Actions</h2>
        <div className="space-y-2 mb-6">
          {[
            { method: "ACTION", path: "tags/actions.ts", desc: "CRUD des tags de contact" },
            { method: "ACTION", path: "segments/actions.ts", desc: "CRUD des segments dynamiques" },
            { method: "ACTION", path: "domains/actions.ts", desc: "Gestion des domaines d'envoi (SendingDomain)" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <EndpointBadge method={ep.method} />
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>

        <InfoBox>
          <strong className="text-orange-400">Pattern commun :</strong> Chaque Server Action verifie
          l&apos;authentification via <code className="font-mono text-zinc-200">getCurrentUserAndOrg()</code>,
          valide les donnees avec Zod, execute la mutation Prisma, puis appelle{" "}
          <code className="font-mono text-zinc-200">revalidatePath()</code> pour rafraichir le cache.
        </InfoBox>
      </div>

      {/* ─── UPLOAD ROUTE ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Upload (Route Handler)</h2>
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20">
            <EndpointBadge method="POST" />
            <code className="text-sm font-mono text-zinc-300">/api/upload</code>
            <span className="text-xs text-zinc-600 ml-auto hidden sm:block">Upload fichier vers Cloudflare R2</span>
          </div>
        </div>

        <CodeBlock title="Requete — multipart/form-data">{`POST /api/upload
Content-Type: multipart/form-data

Body:
  file: <fichier binaire>

Reponse (200) :
{
  "url": "https://assets.votredomaine.com/uploads/1711543200-image.png",
  "key": "uploads/1711543200-image.png"
}`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Le fichier est uploade directement vers Cloudflare R2 via le SDK{" "}
            <code className="text-zinc-200">@aws-sdk/client-s3</code>. La cle d&apos;objet
            est prefixee avec un timestamp pour eviter les collisions.
          </p>
        </div>
      </div>

      {/* ─── ACTION RETURN TYPE ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Type de retour (ActionState)</h2>

        <CodeBlock title="types/action-state.ts">{`export type ActionState = {
  success?: boolean;
  error?: string;
};

// Utilisation dans un composant React :
const [state, formAction, isPending] = useActionState(
  createContact,
  { success: false }
);

// Affichage :
{state.error && <p className="text-red-400">{state.error}</p>}
{state.success && <p className="text-emerald-400">Contact cree !</p>}`}</CodeBlock>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous connaissez les endpoints !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/api/webhooks" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Webhooks &amp; Tracking
          </a>
        </p>
      </div>
    </div>
  );
}
