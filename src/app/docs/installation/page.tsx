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

export default function InstallationPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
          </span>
          Demarrage
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
          Installation
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Configurez MailPulse en local avec Node.js, PostgreSQL, Convex
          et toutes les variables d&apos;environnement necessaires.
        </p>
      </div>

      {/* Prerequisites */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Prerequisites</h2>
        <div className="space-y-2">
          {[
            { name: "Node.js 24+", desc: "Runtime JavaScript (LTS recommande)" },
            { name: "pnpm", desc: "Gestionnaire de paquets (npm install -g pnpm)" },
            { name: "PostgreSQL", desc: "Base de donnees (ou compte Neon pour le cloud)" },
            { name: "Git", desc: "Controle de version" },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0">
                {item.name}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Clone and install */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">1.</span> Cloner et installer
        </h2>
        <CodeBlock title="Terminal">{`git clone https://github.com/James10192/mailpulse.git
cd mailpulse
pnpm install`}</CodeBlock>
      </div>

      {/* Environment variables */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">2.</span> Variables d&apos;environnement
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Copiez le fichier d&apos;exemple et renseignez chaque variable :
          </p>
        </div>

        <CodeBlock title="Terminal">{`cp .env.example .env.local`}</CodeBlock>

        {/* Database section */}
        <div className="mt-6 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Database (PostgreSQL)</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-emerald-400 shrink-0 mt-0.5">DATABASE_URL</code>
              <span className="text-sm text-zinc-400">URL de connexion PostgreSQL. En local : <code className="text-zinc-300">postgresql://user:pass@localhost:5432/mailpulse</code>. Avec Neon : utilisez la connection string pooled.</span>
            </div>
          </div>
        </div>

        {/* Better Auth section */}
        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Better Auth</h3>
          <div className="space-y-2">
            {[
              { key: "BETTER_AUTH_URL", desc: "URL de base de l'app (http://localhost:3000 en dev)" },
              { key: "BETTER_AUTH_SECRET", desc: "Cle secrete (min 32 caracteres). Utilisez openssl rand -hex 32" },
              { key: "BETTER_AUTH_API_KEY", desc: "Cle API pour le plugin Dash (optionnel)" },
              { key: "NEXT_PUBLIC_BETTER_AUTH_URL", desc: "Meme valeur que BETTER_AUTH_URL (cote client)" },
            ].map((item) => (
              <div key={item.key} className="flex items-start gap-3">
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-emerald-400 shrink-0 mt-0.5">{item.key}</code>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OAuth section */}
        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">OAuth (optionnel)</h3>
          <div className="space-y-2">
            {[
              { key: "GOOGLE_CLIENT_ID", desc: "Client ID Google OAuth (console.cloud.google.com)" },
              { key: "GOOGLE_CLIENT_SECRET", desc: "Client Secret Google OAuth" },
              { key: "GITHUB_CLIENT_ID", desc: "Client ID GitHub OAuth (github.com/settings/developers)" },
              { key: "GITHUB_CLIENT_SECRET", desc: "Client Secret GitHub OAuth" },
            ].map((item) => (
              <div key={item.key} className="flex items-start gap-3">
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-emerald-400 shrink-0 mt-0.5">{item.key}</code>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Convex section */}
        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Convex</h3>
          <div className="flex items-start gap-3">
            <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-emerald-400 shrink-0 mt-0.5">NEXT_PUBLIC_CONVEX_URL</code>
            <span className="text-sm text-zinc-400">URL du deploiement Convex (ex: https://xxx.convex.cloud). Obtenue via <code className="text-zinc-300">npx convex dev</code>.</span>
          </div>
        </div>

        {/* Resend section */}
        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Resend (Email)</h3>
          <div className="space-y-2">
            {[
              { key: "RESEND_API_KEY", desc: "Cle API Resend (resend.com/api-keys)" },
              { key: "RESEND_FROM_EMAIL", desc: "Adresse d'expedition par defaut (ex: MailPulse <noreply@votredomaine.com>)" },
              { key: "RESEND_WEBHOOK_SECRET", desc: "Secret de signature Svix pour verifier les webhooks Resend" },
            ].map((item) => (
              <div key={item.key} className="flex items-start gap-3">
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-emerald-400 shrink-0 mt-0.5">{item.key}</code>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* R2 section */}
        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Cloudflare R2 (Storage)</h3>
          <div className="space-y-2">
            {[
              { key: "CLOUDFLARE_R2_ENDPOINT", desc: "Endpoint S3-compatible (https://ACCOUNT_ID.r2.cloudflarestorage.com)" },
              { key: "CLOUDFLARE_R2_ACCESS_KEY_ID", desc: "Access Key ID du token API R2" },
              { key: "CLOUDFLARE_R2_SECRET_ACCESS_KEY", desc: "Secret Access Key (affiche une seule fois a la creation)" },
              { key: "CLOUDFLARE_R2_BUCKET", desc: "Nom du bucket (mailpulse)" },
              { key: "CLOUDFLARE_R2_PUBLIC_URL", desc: "URL publique pour acceder aux fichiers (ex: https://assets.votredomaine.com)" },
            ].map((item) => (
              <div key={item.key} className="flex items-start gap-3">
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-emerald-400 shrink-0 mt-0.5">{item.key}</code>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracking section */}
        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Tracking</h3>
          <div className="space-y-2">
            {[
              { key: "TRACKING_SECRET", desc: "Secret HMAC pour signer les tokens de tracking (min 32 caracteres)" },
              { key: "NEXT_PUBLIC_APP_URL", desc: "URL publique de l'app (http://localhost:3000 en dev, https://app.mailpulse.io en prod)" },
            ].map((item) => (
              <div key={item.key} className="flex items-start gap-3">
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-emerald-400 shrink-0 mt-0.5">{item.key}</code>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Securite :</strong> Ne commitez jamais votre fichier{" "}
          <code className="font-mono text-zinc-200">.env.local</code>. Il est deja dans le{" "}
          <code className="font-mono text-zinc-200">.gitignore</code>.
          Generez vos secrets avec <code className="font-mono text-zinc-200">openssl rand -hex 32</code>.
        </InfoBox>
      </div>

      {/* Database setup */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">3.</span> Base de donnees
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Assurez-vous que votre PostgreSQL est accessible et que la <code className="text-zinc-200">DATABASE_URL</code> est correcte.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Lancez les migrations Prisma pour creer toutes les tables :
            </p>
          </div>
        </div>

        <CodeBlock title="Terminal">{`npx prisma migrate dev --name init

# Verifier avec Prisma Studio (optionnel)
npx prisma studio`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Prisma 7 :</strong> Le datasource URL est defini dans{" "}
          <code className="font-mono text-zinc-200">prisma.config.ts</code>, pas dans{" "}
          <code className="font-mono text-zinc-200">schema.prisma</code>.
          Le client est genere dans <code className="font-mono text-zinc-200">src/generated/prisma</code> et
          utilise le driver adapter <code className="font-mono text-zinc-200">@prisma/adapter-pg</code>.
        </InfoBox>
      </div>

      {/* Convex */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">4.</span> Serveur Convex
        </h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Convex gere les fonctionnalites temps reel (dashboard live, notifications,
            flux d&apos;activite). Lancez le serveur de dev dans un terminal separe :
          </p>
        </div>

        <CodeBlock title="Terminal">{`npx convex dev`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3 mt-3">
          <p>
            La premiere execution vous demandera de vous connecter et creera un projet Convex.
            L&apos;URL de deploiement sera automatiquement ajoutee a votre <code className="text-zinc-200">.env.local</code>.
          </p>
        </div>
      </div>

      {/* Start dev server */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">
          <span className="text-orange-400">5.</span> Demarrer le serveur
        </h2>

        <CodeBlock title="Terminal">{`pnpm dev`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            L&apos;application sera accessible sur{" "}
            <code className="text-zinc-200">http://localhost:3000</code>.
            Si le port 3000 est occupe, utilisez le port 8001.
          </p>
        </div>

        <CodeBlock title="Commandes utiles">{`pnpm dev              # Serveur de dev (Turbopack)
pnpm build            # Build de production
npx prisma studio     # Interface de gestion BDD
npx prisma migrate dev # Lancer les migrations
npx convex dev        # Serveur Convex (temps reel)
npx convex dashboard  # Ouvrir le dashboard Convex`}</CodeBlock>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">L&apos;environnement est pret !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/first-campaign" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            Envoyer votre premiere campagne
          </a>
        </p>
      </div>
    </div>
  );
}
