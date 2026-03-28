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
  };
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${colors[method] ?? "bg-zinc-800 text-zinc-400"}`}>
      {method}
    </span>
  );
}

export default function ApiWebhooksPage() {
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
          Webhooks &amp; Tracking
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Webhook Resend avec verification Svix, systeme de tracking HMAC
          (pixel d&apos;ouverture, click redirect, desabonnement) et synchronisation
          Prisma vers Convex.
        </p>
      </div>

      {/* ─── RESEND WEBHOOK ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Webhook Resend</h2>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20">
            <EndpointBadge method="POST" />
            <code className="text-sm font-mono text-zinc-300">/api/webhooks/email</code>
            <span className="text-xs text-zinc-600 ml-auto hidden sm:block">Evenements Resend</span>
          </div>
        </div>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Resend envoie des notifications HTTP a <code className="text-zinc-200">/api/webhooks/email</code>
            pour chaque evenement email. Le handler se trouve dans{" "}
            <code className="text-zinc-200">src/app/api/webhooks/email/route.ts</code>.
          </p>
        </div>
      </div>

      {/* Svix verification */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Verification Svix</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Chaque requete webhook est signee par Svix. La verification utilise
            la cle <code className="text-zinc-200">RESEND_WEBHOOK_SECRET</code>.
            En dev (sans secret), la verification est desactivee.
          </p>
        </div>

        <CodeBlock title="En-tetes de signature Svix">{`svix-id: msg_2JxYq3K8ZP...         // ID unique du message
svix-timestamp: 1711543205          // Timestamp Unix
svix-signature: v1,g0hM9SsE+OLP... // Signature HMAC`}</CodeBlock>

        <CodeBlock title="Verification dans le handler">{`import { Webhook } from "svix";

const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);

// Verifier la signature
wh.verify(body, {
  "svix-id": svixId,
  "svix-timestamp": timestamp,
  "svix-signature": signature,
});
// Si invalide → Response 400 "Invalid signature"`}</CodeBlock>
      </div>

      {/* Event types */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Types d&apos;evenements traites</h2>
        <div className="space-y-2">
          {[
            {
              event: "email.delivered",
              desc: "Email livre. Cree un EmailEvent DELIVERED, met a jour CampaignRecipient.deliveredAt.",
              color: "text-emerald-400 bg-emerald-500/10",
            },
            {
              event: "email.bounced",
              desc: "Email rebondi. Cree un EmailEvent BOUNCED_HARD, desabonne le contact (subscribed=false, bounceType=\"hard\").",
              color: "text-amber-400 bg-amber-500/10",
            },
            {
              event: "email.complained",
              desc: "Signalement spam. Cree un EmailEvent COMPLAINED, desabonne le contact immediatement.",
              color: "text-red-400 bg-red-500/10",
            },
          ].map((item) => (
            <div
              key={item.event}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${item.color}`}>
                {item.event}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Prisma → Convex sync */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Sync Prisma vers Convex</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            Apres chaque mise a jour Prisma, le webhook synchronise les statistiques
            vers Convex pour le dashboard temps reel :
          </p>
        </div>

        <CodeBlock title="Sync dans processEvent()">{`// Mapping Resend → Convex
const convexEventMap = {
  "email.delivered": "delivered",
  "email.bounced":   "bounced",
  "email.complained": "complained",
};

// Apres mise a jour Prisma :
await convexServer.mutation(api.dashboard.updateStats, {
  organizationId: contact.organizationId,
  event: convexEvent, // "delivered" | "bounced" | "complained"
});

// Puis mise a jour des analytics de campagne :
await updateCampaignAnalytics(campaignId);
// → prisma.campaignAnalytics.upsert() recalcule tous les taux`}</CodeBlock>
      </div>

      {/* ─── TRACKING SYSTEM ─── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Systeme de tracking</h2>
        <div className="prose-sm text-zinc-400 space-y-3 mb-4">
          <p>
            MailPulse utilise des tokens HMAC-SHA256 signes pour securiser le tracking.
            Le code se trouve dans <code className="text-zinc-200">src/lib/tracking.ts</code>.
          </p>
        </div>

        <CodeBlock title="Token structure">{`// Generation du token :
const payload = \`\${recipientId}:\${campaignId}\`;
const hmac = createHmac("sha256", TRACKING_SECRET)
  .update(payload)
  .digest("hex")
  .slice(0, 16);
const token = Buffer.from(\`\${payload}:\${hmac}\`).toString("base64url");

// Verification du token :
// Decode base64url → split ":" → verifier HMAC
// Retourne { recipientId, campaignId } ou null si invalide`}</CodeBlock>
      </div>

      {/* Open tracking */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Open tracking (pixel)</h2>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20">
            <EndpointBadge method="GET" />
            <code className="text-sm font-mono text-zinc-300">/api/track/open?t=&#123;token&#125;</code>
            <span className="text-xs text-zinc-600 ml-auto hidden sm:block">Pixel 1x1 GIF transparent</span>
          </div>
        </div>

        <div className="prose-sm text-zinc-400 space-y-3">
          <p>Fonctionnement :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Un pixel 1x1 GIF transparent est injecte avant </body> dans chaque email",
              "Quand le destinataire ouvre l'email, le client de messagerie charge le pixel",
              "Le serveur verifie le token HMAC, enregistre l'ouverture et retourne le GIF",
              "Headers no-cache pour eviter la mise en cache du pixel",
              "Limitation : Apple Mail Privacy Protection pre-charge les images → faux positifs",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Injection du pixel (lib/tracking.ts)">{`function injectTrackingPixel(html: string, trackingUrl: string): string {
  const pixel = \`<img src="\${trackingUrl}" width="1" height="1"
    alt="" style="display:none;border:0;" />\`;

  if (html.includes("</body>")) {
    return html.replace("</body>", \`\${pixel}</body>\`);
  }
  return html + pixel;
}`}</CodeBlock>
      </div>

      {/* Click tracking */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Click tracking (redirect)</h2>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20">
            <EndpointBadge method="GET" />
            <code className="text-sm font-mono text-zinc-300">/api/track/click?url=&#123;encodedUrl&#125;&amp;t=&#123;token&#125;</code>
            <span className="text-xs text-zinc-600 ml-auto hidden sm:block">Redirect 302</span>
          </div>
        </div>

        <div className="prose-sm text-zinc-400 space-y-3">
          <p>Fonctionnement :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Les liens dans l'email sont wrapes avec l'URL de tracking",
              "Au clic, le serveur verifie le token, enregistre le clic et redirige (302) vers l'URL originale",
              "Les liens mailto: et les liens de desabonnement ne sont jamais wrapes",
              "Redirect 302 (pas 301) pour eviter la mise en cache par le navigateur",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <CodeBlock title="Wrapping des liens (lib/tracking.ts)">{`function wrapLinksForTracking(html, trackingBaseUrl, token) {
  const hrefRegex = /href="(https?:\\/\\/[^"]+)"/gi;

  return html.replace(hrefRegex, (match, originalUrl) => {
    // Ne pas wrapper les liens unsubscribe ou mailto
    if (originalUrl.includes("unsubscribe") ||
        originalUrl.startsWith("mailto:")) {
      return \`href="\${originalUrl}"\`;
    }

    const trackedUrl = \`\${trackingBaseUrl}?url=\${
      encodeURIComponent(originalUrl)
    }&t=\${token}\`;
    return \`href="\${trackedUrl}"\`;
  });
}`}</CodeBlock>
      </div>

      {/* Unsubscribe */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Desabonnement</h2>
        <div className="space-y-2 mb-4">
          {[
            { method: "POST", path: "/api/unsubscribe?t={token}", desc: "One-click unsubscribe (RFC 8058, depuis le client de messagerie)" },
            { method: "GET", path: "/api/unsubscribe?t={token}", desc: "Desabonnement via navigateur (lien dans le footer de l'email)" },
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

        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Les deux methodes utilisent le meme token HMAC. Le token est genere
            avec <code className="text-zinc-200">generateUnsubscribeUrl()</code> qui utilise
            le contactId (pas le recipientId) :
          </p>
        </div>

        <CodeBlock title="Generation de l'URL de desabonnement">{`function generateUnsubscribeUrl(baseUrl, contactId, campaignId) {
  const payload = \`\${contactId}:\${campaignId}\`;
  const hmac = createHmac("sha256", TRACKING_SECRET)
    .update(payload).digest("hex").slice(0, 16);
  const token = Buffer.from(\`\${payload}:\${hmac}\`)
    .toString("base64url");
  return \`\${baseUrl}/api/unsubscribe?t=\${token}\`;
}

// Headers ajoutes a chaque email :
// List-Unsubscribe: <https://app.mailpulse.io/api/unsubscribe?t=xxx>
// List-Unsubscribe-Post: List-Unsubscribe=One-Click`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">RFC 8058 :</strong> Le header{" "}
          <code className="font-mono text-zinc-200">List-Unsubscribe-Post</code> permet
          aux clients de messagerie (Gmail, Yahoo, Apple Mail) d&apos;afficher un bouton
          &quot;Se desabonner&quot; directement dans l&apos;interface. Le desabonnement est
          instantane — pas de delai de 48h.
        </InfoBox>
      </div>

      {/* Complete flow */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Flux complet d&apos;un email</h2>

        <CodeBlock title="De l'envoi a l'analytics">{`1. ENVOI
   Campaign SENDING → pour chaque contact :
   ├── Generer token HMAC (recipientId:campaignId)
   ├── Injecter pixel tracking (1x1 GIF)
   ├── Wrapper les liens (redirect 302)
   ├── Ajouter headers List-Unsubscribe
   └── Envoyer via Resend API (tags: recipient_id, campaign_id)

2. WEBHOOKS RESEND → /api/webhooks/email
   ├── email.delivered → Prisma EmailEvent + Convex sync
   ├── email.bounced → Contact.subscribed = false
   └── email.complained → Contact.subscribed = false

3. TRACKING → /api/track/*
   ├── /api/track/open?t=xxx → Enregistrer ouverture
   └── /api/track/click?url=xxx&t=xxx → Enregistrer clic + redirect

4. DESABONNEMENT → /api/unsubscribe?t=xxx
   └── Contact.subscribed = false

5. ANALYTICS
   └── CampaignAnalytics.upsert() → recalcul de tous les taux`}</CodeBlock>
      </div>

      {/* EmailEvent types */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Types d&apos;EmailEvent</h2>
        <div className="space-y-2">
          {[
            { type: "SENT", desc: "Email envoye a Resend", color: "text-zinc-400 bg-zinc-800/50" },
            { type: "DELIVERED", desc: "Email livre au serveur du destinataire", color: "text-emerald-400 bg-emerald-500/10" },
            { type: "OPENED", desc: "Email ouvert (pixel charge)", color: "text-blue-400 bg-blue-500/10" },
            { type: "CLICKED", desc: "Lien clique (redirect 302)", color: "text-purple-400 bg-purple-500/10" },
            { type: "BOUNCED_SOFT", desc: "Rebond temporaire (boite pleine)", color: "text-amber-400 bg-amber-500/10" },
            { type: "BOUNCED_HARD", desc: "Rebond definitif (adresse invalide)", color: "text-amber-400 bg-amber-500/10" },
            { type: "COMPLAINED", desc: "Signalement spam", color: "text-red-400 bg-red-500/10" },
            { type: "UNSUBSCRIBED", desc: "Desabonnement via lien", color: "text-red-400 bg-red-500/10" },
          ].map((item) => (
            <div
              key={item.type}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20"
            >
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${item.color}`}>
                {item.type}
              </span>
              <span className="text-sm text-zinc-400">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous maitrisez l&apos;API MailPulse !</p>
        <p className="text-zinc-300 font-medium">
          Retour a la{" "}
          <a href="/docs" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors cursor-pointer">
            page d&apos;accueil de la documentation
          </a>
        </p>
      </div>
    </div>
  );
}
