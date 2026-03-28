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

export default function ApiAuthPage() {
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
          Authentification
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Better Auth avec Prisma adapter, OAuth Google/GitHub,
          sessions cookie et protection des routes via proxy.ts.
        </p>
      </div>

      {/* Better Auth setup */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Configuration Better Auth</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            MailPulse utilise <strong className="text-zinc-200">Better Auth v1.5+</strong> avec
            le Prisma adapter. La configuration se trouve dans{" "}
            <code className="text-zinc-200">src/lib/auth.ts</code> :
          </p>
        </div>

        <CodeBlock title="src/lib/auth.ts">{`import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { organization } from "better-auth/plugins";
import { prisma } from "./prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24,      // Renouvele apres 1 jour
  },
});`}</CodeBlock>
      </div>

      {/* OAuth providers */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">OAuth (Google & GitHub)</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Deux fournisseurs OAuth sont configures. Pour les activer, renseignez
            les variables d&apos;environnement correspondantes :
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">Google OAuth</div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-2">
              Creez un projet sur <code className="text-zinc-200">console.cloud.google.com</code>,
              activez l&apos;API Google+ et configurez les identifiants OAuth 2.0.
              Redirect URI : <code className="text-zinc-200">{`{BETTER_AUTH_URL}/api/auth/callback/google`}</code>
            </p>
            <div className="text-xs font-mono text-zinc-500">GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET</div>
          </div>
          <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
            <div className="text-sm font-mono font-semibold text-orange-400 mb-2">GitHub OAuth</div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-2">
              Allez dans <code className="text-zinc-200">github.com/settings/developers</code>,
              creez une OAuth App.
              Redirect URI : <code className="text-zinc-200">{`{BETTER_AUTH_URL}/api/auth/callback/github`}</code>
            </p>
            <div className="text-xs font-mono text-zinc-500">GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET</div>
          </div>
        </div>
      </div>

      {/* Session handling */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Sessions (cookie-based)</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Better Auth utilise des sessions basees sur des cookies HTTP :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Cookie de session : better-auth.session_token (HTTP) ou __Secure-better-auth.session_token (HTTPS)",
              "Le refresh token est un cookie httpOnly (jamais dans le body JSON)",
              "Duree de session : 7 jours, renouvele apres 1 jour d'activite",
              "Les sessions sont stockees dans la table session (Prisma)",
              "Chaque session stocke activeOrganizationId pour le multi-tenant",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Important :</strong> Le refresh token est toujours
          un cookie httpOnly. Il n&apos;est jamais renvoye dans le corps de la reponse JSON.
          Cela empeche le vol de token via XSS.
        </InfoBox>
      </div>

      {/* Organization plugin */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Plugin Organization (multi-tenant)</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Le plugin <code className="text-zinc-200">organization</code> de Better Auth
            permet le multi-tenant. Chaque utilisateur peut creer et appartenir a
            plusieurs organisations. Les donnees (contacts, campagnes, templates)
            sont isolees par <code className="text-zinc-200">organizationId</code>.
          </p>
        </div>

        <CodeBlock title="Tables liees aux organisations">{`Organization   — Nom, slug, logo, metadata
Member         — Relation User ↔ Organization (role: "owner", "admin", "member")
Invitation     — Invitations par email (status: "pending", "accepted")

// Toutes les tables metier ont une FK organizationId :
Contact, Campaign, ContactList, EmailTemplate,
SendingDomain, Automation`}</CodeBlock>
      </div>

      {/* proxy.ts */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">proxy.ts (auth middleware)</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Le fichier <code className="text-zinc-200">src/proxy.ts</code> intercepte chaque requete
            pour verifier l&apos;authentification. Next.js 16 utilise{" "}
            <code className="text-zinc-200">proxy.ts</code> (au lieu de middleware.ts).
          </p>
        </div>

        <CodeBlock title="src/proxy.ts">{`// Routes publiques (pas besoin d'auth) :
const publicPrefixes = [
  "/login",
  "/register",
  "/docs",
  "/api/auth",
  "/api/webhooks",
  "/api/track",
  "/api/unsubscribe",
  "/api/upload",
];

// Verification du cookie de session :
const sessionCookie =
  request.cookies.get("__Secure-better-auth.session_token") ??
  request.cookies.get("better-auth.session_token");

// Si pas de cookie → redirect vers /login?callbackUrl={pathname}`}</CodeBlock>
      </div>

      {/* API endpoints */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Route API : /api/auth/[...all]</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Le catch-all route handler deleguant a Better Auth se trouve dans{" "}
            <code className="text-zinc-200">src/app/api/auth/[...all]/route.ts</code>.
            Il expose tous les endpoints d&apos;authentification :
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { method: "POST", path: "/api/auth/sign-up/email", desc: "Inscription par email/password" },
            { method: "POST", path: "/api/auth/sign-in/email", desc: "Connexion par email/password" },
            { method: "POST", path: "/api/auth/sign-in/social", desc: "Connexion OAuth (Google, GitHub)" },
            { method: "POST", path: "/api/auth/sign-out", desc: "Deconnexion (supprime la session)" },
            { method: "GET", path: "/api/auth/session", desc: "Recuperer la session courante" },
            { method: "POST", path: "/api/auth/organization/create", desc: "Creer une organisation" },
            { method: "POST", path: "/api/auth/organization/set-active", desc: "Changer d'organisation active" },
          ].map((ep) => (
            <div
              key={ep.method + ep.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  ep.method === "GET"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {ep.method}
              </span>
              <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
              <span className="text-xs text-zinc-600 ml-auto hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Client usage */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Utilisation cote client</h2>

        <CodeBlock title="src/lib/auth-client.ts">{`import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [organizationClient()],
});

// Usage dans un composant React :
const { signIn, signUp, signOut } = authClient;

// Inscription
await signUp.email({ email, password, name });

// Connexion email
await signIn.email({ email, password });

// Connexion Google
await signIn.social({ provider: "google" });

// Deconnexion
await signOut();`}</CodeBlock>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">L&apos;authentification est en place !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/api/endpoints" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Decouvrir les endpoints
          </a>
        </p>
      </div>
    </div>
  );
}
