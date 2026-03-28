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
          Securisez vos appels API avec des cles d&apos;API. Gerez vos cles,
          comprenez les limites de debit et protegez vos identifiants.
        </p>
      </div>

      {/* Gestion des cles */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Gestion des cles API</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les cles API vous permettent d&apos;acceder a l&apos;API MailPulse depuis
            vos applications, scripts ou outils tiers. Chaque cle est liee a votre
            organisation.
          </p>
          <p>Pour creer une cle API :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Allez dans Parametres > API > Cles d'API",
              "Cliquez sur \"Generer une nouvelle cle\"",
              "Donnez un nom descriptif a votre cle (ex: \"Integration CRM\", \"Script import\")",
              "Choisissez les permissions : lecture seule ou lecture/ecriture",
              "Copiez la cle immediatement — elle ne sera plus affichee ensuite",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Important :</strong> La cle API n&apos;est affichee
          qu&apos;une seule fois lors de sa creation. Si vous la perdez, vous devrez en generer
          une nouvelle. Vous pouvez avoir jusqu&apos;a 10 cles actives par organisation.
        </InfoBox>
      </div>

      {/* Format d'authentification */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">En-tete d&apos;authentification</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Toutes les requetes API doivent inclure votre cle API dans l&apos;en-tete
            HTTP <span className="font-mono text-zinc-200">Authorization</span> au
            format Bearer :
          </p>
        </div>

        <CodeBlock title="Format de l'en-tete">{`Authorization: Bearer mp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</CodeBlock>

        <div className="prose-sm text-zinc-400 space-y-3">
          <p>Les cles API suivent la convention de nommage suivante :</p>
        </div>

        <div className="mt-4 space-y-2">
          {[
            {
              prefix: "mp_live_",
              desc: "Cle de production — acces complet a vos donnees reelles",
              color: "text-emerald-400 bg-emerald-500/10",
            },
            {
              prefix: "mp_test_",
              desc: "Cle de test — environnement isole, aucun email reel n'est envoye",
              color: "text-amber-400 bg-amber-500/10",
            },
          ].map((item) => (
            <div
              key={item.prefix}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${item.color}`}>
                {item.prefix}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <CodeBlock title="Exemple avec curl">{`curl -X GET https://api.mailpulse.io/v1/contacts \\
  -H "Authorization: Bearer mp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json"`}</CodeBlock>

        <CodeBlock title="Exemple avec Node.js">{`const response = await fetch("https://api.mailpulse.io/v1/contacts", {
  headers: {
    "Authorization": "Bearer mp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "Content-Type": "application/json",
  },
});

const data = await response.json();`}</CodeBlock>

        <CodeBlock title="Exemple avec Python">{`import requests

response = requests.get(
    "https://api.mailpulse.io/v1/contacts",
    headers={
        "Authorization": "Bearer mp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "Content-Type": "application/json",
    },
)

data = response.json()`}</CodeBlock>
      </div>

      {/* Limites de debit */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Limites de debit</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            L&apos;API MailPulse applique des limites de debit (rate limits) pour garantir
            la stabilite du service. Les limites varient selon votre plan :
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 overflow-hidden">
          <div className="grid grid-cols-3 gap-px bg-zinc-800/30">
            <div className="p-3 bg-zinc-900/50 text-xs font-mono text-zinc-500 font-semibold">Plan</div>
            <div className="p-3 bg-zinc-900/50 text-xs font-mono text-zinc-500 font-semibold">Requetes / min</div>
            <div className="p-3 bg-zinc-900/50 text-xs font-mono text-zinc-500 font-semibold">Requetes / jour</div>
            {[
              { plan: "Gratuit", rpm: "60", rpd: "1 000" },
              { plan: "Pro", rpm: "300", rpd: "50 000" },
              { plan: "Enterprise", rpm: "1 000", rpd: "Illimite" },
            ].map((row) => (
              <>
                <div key={`${row.plan}-plan`} className="p-3 bg-zinc-900/30 text-sm text-zinc-300 font-medium">{row.plan}</div>
                <div key={`${row.plan}-rpm`} className="p-3 bg-zinc-900/30 text-sm font-mono text-zinc-400">{row.rpm}</div>
                <div key={`${row.plan}-rpd`} className="p-3 bg-zinc-900/30 text-sm font-mono text-zinc-400">{row.rpd}</div>
              </>
            ))}
          </div>
        </div>

        <div className="prose-sm text-zinc-400 space-y-3 mt-4">
          <p>
            Lorsque vous atteignez la limite, l&apos;API renvoie une erreur{" "}
            <span className="font-mono text-zinc-200">429 Too Many Requests</span>.
            Les en-tetes de reponse contiennent les informations suivantes :
          </p>
        </div>

        <CodeBlock title="En-tetes de rate limit">{`X-RateLimit-Limit: 300         # Limite par minute
X-RateLimit-Remaining: 247     # Requetes restantes
X-RateLimit-Reset: 1711543200  # Timestamp de reinitialisation (Unix)
Retry-After: 23                # Secondes avant de pouvoir reessayer`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Conseil :</strong> Implementez un mecanisme de
          retry avec backoff exponentiel dans vos integrations. Attendez le delai indique dans
          l&apos;en-tete <span className="font-mono">Retry-After</span> avant de reessayer.
        </InfoBox>
      </div>

      {/* Securite */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Bonnes pratiques de securite</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <ul className="space-y-2 list-none pl-0">
            {[
              "Ne partagez jamais vos cles API — Traitez-les comme des mots de passe. Ne les commitez pas dans votre code source.",
              "Utilisez des variables d'environnement — Stockez vos cles dans des fichiers .env ou dans le gestionnaire de secrets de votre plateforme d'hebergement.",
              "Cle de test pour le developpement — Utilisez toujours une cle mp_test_ pendant le developpement pour eviter d'affecter vos donnees de production.",
              "Permissions minimales — Creez des cles en lecture seule quand l'ecriture n'est pas necessaire.",
              "Rotation reguliere — Regenerez vos cles tous les 90 jours. Desactivez immediatement toute cle compromise.",
              "Surveillez l'usage — Consultez les logs d'utilisation API dans Parametres > API > Logs pour detecter toute activite suspecte.",
              "HTTPS uniquement — L'API MailPulse n'accepte que les connexions HTTPS. Les requetes HTTP sont rejetees.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Exemple - Variable d'environnement">{`# .env.local (NE PAS commiter ce fichier)
MAILPULSE_API_KEY=mp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Utilisation dans votre code
const apiKey = process.env.MAILPULSE_API_KEY;`}</CodeBlock>
      </div>

      {/* Erreurs d'authentification */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Erreurs d&apos;authentification</h2>
        <div className="space-y-2">
          {[
            {
              code: "401",
              title: "Unauthorized",
              desc: "Cle API manquante ou invalide. Verifiez l'en-tete Authorization.",
            },
            {
              code: "403",
              title: "Forbidden",
              desc: "La cle API n'a pas les permissions necessaires pour cette action.",
            },
            {
              code: "429",
              title: "Too Many Requests",
              desc: "Limite de debit atteinte. Attendez avant de reessayer.",
            },
          ].map((item) => (
            <div
              key={item.code}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0 mt-0.5">
                {item.code}
              </span>
              <div>
                <span className="text-sm text-zinc-200 font-medium">{item.title}</span>
                <span className="text-sm text-zinc-400 block mt-0.5">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <CodeBlock title="Reponse d'erreur type">{`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Cle API invalide ou expiree.",
    "status": 401
  }
}`}</CodeBlock>
      </div>

      {/* Etape suivante */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">L&apos;authentification est en place !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/api/endpoints" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Decouvrir les endpoints
          </a>
        </p>
      </div>
    </div>
  );
}
