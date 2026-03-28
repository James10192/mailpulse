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
          Webhooks
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Recevez les evenements email en temps reel dans votre application.
          MailPulse envoie des notifications HTTP a chaque ouverture, clic,
          rebond ou desabonnement.
        </p>
      </div>

      {/* Qu'est-ce qu'un webhook */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Qu&apos;est-ce qu&apos;un webhook ?</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Un webhook est une notification HTTP envoyee automatiquement par MailPulse
            vers une URL de votre choix lorsqu&apos;un evenement se produit. Au lieu de
            devoir interroger l&apos;API regulierement pour verifier les changements,
            votre application recoit les informations instantanement.
          </p>
          <p>
            Cas d&apos;utilisation courants :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Mettre a jour votre CRM quand un contact ouvre un email",
              "Declencher une action dans votre application quand un lien est clique",
              "Supprimer un contact de votre base quand il se desabonne",
              "Alerter votre equipe en cas de pic de rebonds",
              "Synchroniser les evenements avec votre outil d'analytics",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Configurer un webhook */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Configurer un webhook</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Pour creer un webhook, allez dans{" "}
            <span className="font-mono text-zinc-200">Parametres &gt; API &gt; Webhooks</span> :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Cliquez sur \"Ajouter un webhook\"",
              "Renseignez l'URL de votre endpoint (ex: https://votre-app.com/api/webhooks/mailpulse)",
              "Selectionnez les evenements que vous souhaitez recevoir",
              "Notez la cle de signature (webhook secret) pour verifier l'authenticite des requetes",
              "Cliquez sur \"Tester\" pour envoyer un evenement de test",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Evenements disponibles */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Evenements disponibles</h2>
        <div className="space-y-2">
          {[
            {
              event: "email.delivered",
              desc: "L'email a ete delivre avec succes au serveur de messagerie du destinataire",
              color: "text-emerald-400 bg-emerald-500/10",
            },
            {
              event: "email.opened",
              desc: "Le destinataire a ouvert l'email (detecte via le pixel de tracking)",
              color: "text-blue-400 bg-blue-500/10",
            },
            {
              event: "email.clicked",
              desc: "Le destinataire a clique sur un lien dans l'email",
              color: "text-purple-400 bg-purple-500/10",
            },
            {
              event: "email.bounced",
              desc: "L'email n'a pas pu etre delivre (hard bounce ou soft bounce)",
              color: "text-amber-400 bg-amber-500/10",
            },
            {
              event: "email.complained",
              desc: "Le destinataire a signale l'email comme spam",
              color: "text-red-400 bg-red-500/10",
            },
            {
              event: "contact.unsubscribed",
              desc: "Le contact s'est desabonne via le lien de desabonnement",
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

      {/* Format du payload */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Format du payload</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Chaque webhook est envoye via une requete HTTP POST avec un corps JSON.
            Voici la structure du payload :
          </p>
        </div>

        <CodeBlock title="Payload — email.delivered">{`{
  "event": "email.delivered",
  "timestamp": "2026-03-15T14:32:05.000Z",
  "data": {
    "contactId": "ct_abc123def456",
    "email": "marie@exemple.fr",
    "campaignId": "cmp_xyz789",
    "campaignName": "Newsletter Mars 2026",
    "messageId": "msg_qrs456"
  }
}`}</CodeBlock>

        <CodeBlock title="Payload — email.clicked">{`{
  "event": "email.clicked",
  "timestamp": "2026-03-15T14:35:12.000Z",
  "data": {
    "contactId": "ct_abc123def456",
    "email": "marie@exemple.fr",
    "campaignId": "cmp_xyz789",
    "campaignName": "Newsletter Mars 2026",
    "messageId": "msg_qrs456",
    "url": "https://votre-site.com/promo-mars",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "ip": "203.0.113.xxx"
  }
}`}</CodeBlock>

        <CodeBlock title="Payload — email.bounced">{`{
  "event": "email.bounced",
  "timestamp": "2026-03-15T14:32:18.000Z",
  "data": {
    "contactId": "ct_def456ghi789",
    "email": "invalide@faux-domaine.xx",
    "campaignId": "cmp_xyz789",
    "campaignName": "Newsletter Mars 2026",
    "messageId": "msg_tuv789",
    "bounceType": "hard",
    "bounceReason": "550 5.1.1 The email account does not exist"
  }
}`}</CodeBlock>
      </div>

      {/* Verification de signature */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Verification de signature (Svix)</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Chaque requete webhook est signee avec votre cle secrete via Svix.
            Il est essentiel de verifier cette signature pour s&apos;assurer que la
            requete provient bien de MailPulse et n&apos;a pas ete falsifiee.
          </p>
          <p>Les en-tetes de signature sont :</p>
        </div>

        <CodeBlock title="En-tetes de signature">{`svix-id: msg_2JxYq3K8ZP...
svix-timestamp: 1711543205
svix-signature: v1,g0hM9SsE+OLPnqGNKw...`}</CodeBlock>

        <CodeBlock title="Node.js — Verification avec Svix">{`import { Webhook } from "svix";

// Votre cle secrete webhook (depuis les parametres)
const webhookSecret = process.env.MAILPULSE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const body = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  const wh = new Webhook(webhookSecret);

  try {
    // Verifie la signature et parse le payload
    const event = wh.verify(body, headers);

    // Traiter l'evenement
    switch (event.event) {
      case "email.delivered":
        // Marquer comme delivre dans votre CRM
        break;
      case "email.opened":
        // Mettre a jour le score d'engagement
        break;
      case "email.clicked":
        // Logger le clic dans votre analytics
        break;
      case "email.bounced":
        // Desactiver le contact si hard bounce
        break;
      case "email.complained":
        // Supprimer le contact immediatement
        break;
      case "contact.unsubscribed":
        // Mettre a jour les preferences
        break;
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Signature webhook invalide:", err);
    return new Response("Signature invalide", { status: 401 });
  }
}`}</CodeBlock>

        <CodeBlock title="Python — Verification avec Svix">{`from svix.webhooks import Webhook, WebhookVerificationError
from flask import Flask, request, jsonify

app = Flask(__name__)
webhook_secret = os.environ["MAILPULSE_WEBHOOK_SECRET"]

@app.route("/api/webhooks/mailpulse", methods=["POST"])
def handle_webhook():
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    try:
        wh = Webhook(webhook_secret)
        event = wh.verify(request.data, headers)
    except WebhookVerificationError:
        return jsonify({"error": "Signature invalide"}), 401

    event_type = event["event"]

    if event_type == "email.bounced":
        # Desactiver le contact
        pass
    elif event_type == "email.complained":
        # Supprimer le contact
        pass

    return jsonify({"status": "ok"}), 200`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Important :</strong> Verifiez toujours la signature
          en production. Sans verification, n&apos;importe qui pourrait envoyer de faux evenements
          a votre endpoint et corrompre vos donnees.
        </InfoBox>
      </div>

      {/* Politique de retry */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Politique de retry</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Si votre endpoint ne repond pas avec un code HTTP 2xx, MailPulse reessaie
            automatiquement l&apos;envoi du webhook selon le calendrier suivant :
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <div className="font-mono text-xs text-zinc-400 leading-loose whitespace-pre">{`Tentative 1  : Immediatement
Tentative 2  : Apres 5 secondes
Tentative 3  : Apres 5 minutes
Tentative 4  : Apres 30 minutes
Tentative 5  : Apres 2 heures
Tentative 6  : Apres 5 heures
Tentative 7  : Apres 10 heures
Tentative 8  : Apres 24 heures (derniere tentative)

Total : 8 tentatives sur 24 heures`}</div>
        </div>

        <div className="prose-sm text-zinc-400 space-y-3 mt-4">
          <p>Regles importantes :</p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Votre endpoint doit repondre en moins de 15 secondes, sinon c'est considere comme un echec",
              "Renvoyez un code HTTP 200 des que la requete est recue, meme si le traitement n'est pas termine",
              "Traitez les evenements de maniere idempotente : le meme evenement peut arriver plusieurs fois",
              "Utilisez l'en-tete svix-id comme identifiant unique pour eviter les doublons",
              "Apres 8 echecs consecutifs, le webhook est desactive et vous recevez une notification",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Exemple complet */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Exemple complet de handler</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Voici un exemple complet de handler webhook avec verification de signature,
            traitement des evenements et gestion d&apos;erreurs :
          </p>
        </div>

        <CodeBlock title="Next.js App Router — route.ts">{`import { Webhook } from "svix";
import { headers } from "next/headers";

const webhookSecret = process.env.MAILPULSE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const headerPayload = await headers();

  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id") ?? "",
    "svix-timestamp": headerPayload.get("svix-timestamp") ?? "",
    "svix-signature": headerPayload.get("svix-signature") ?? "",
  };

  // Verifier la signature
  const wh = new Webhook(webhookSecret);
  let event: Record<string, unknown>;

  try {
    event = wh.verify(body, svixHeaders) as Record<string, unknown>;
  } catch {
    console.error("Webhook: signature invalide");
    return new Response("Signature invalide", { status: 401 });
  }

  const eventType = event.event as string;
  const data = event.data as Record<string, unknown>;

  console.log("Webhook recu:", eventType, data.email);

  // Traiter selon le type d'evenement
  try {
    switch (eventType) {
      case "email.delivered":
        await handleDelivered(data);
        break;

      case "email.opened":
        await handleOpened(data);
        break;

      case "email.clicked":
        await handleClicked(data);
        break;

      case "email.bounced":
        await handleBounced(data);
        break;

      case "email.complained":
        await handleComplaint(data);
        break;

      case "contact.unsubscribed":
        await handleUnsubscribed(data);
        break;

      default:
        console.log("Evenement inconnu:", eventType);
    }
  } catch (error) {
    // Logger l'erreur mais renvoyer 200 pour eviter les retries
    console.error("Erreur traitement webhook:", error);
  }

  // Toujours renvoyer 200 rapidement
  return new Response("OK", { status: 200 });
}

async function handleDelivered(data: Record<string, unknown>) {
  // Mettre a jour le statut de delivrabilite
}

async function handleOpened(data: Record<string, unknown>) {
  // Incrementer le compteur d'ouvertures
  // Mettre a jour le score d'engagement
}

async function handleClicked(data: Record<string, unknown>) {
  // Logger le clic et l'URL
  // Incrementer le score d'engagement
}

async function handleBounced(data: Record<string, unknown>) {
  // Si hard bounce : desactiver le contact
  // Si soft bounce : incrementer le compteur
}

async function handleComplaint(data: Record<string, unknown>) {
  // Supprimer le contact immediatement
  // Ajouter a la liste de suppression
}

async function handleUnsubscribed(data: Record<string, unknown>) {
  // Marquer le contact comme desabonne
  // Enregistrer dans le registre RGPD
}`}</CodeBlock>
      </div>

      {/* Debug */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Debugger vos webhooks</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            MailPulse fournit des outils pour vous aider a debugger vos webhooks :
          </p>
          <ul className="space-y-2 list-none pl-0">
            {[
              "Journal des webhooks — Consultez l'historique des envois dans Parametres > API > Webhooks > Logs",
              "Evenement de test — Envoyez un evenement de test a votre endpoint pour verifier la configuration",
              "Replay — Renvoyez un evenement echoue manuellement depuis les logs",
              "Payload visible — Chaque entree du journal montre le payload envoye et la reponse recue",
              "Alertes — Recevez un email si votre endpoint echoue 3 fois de suite",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">&#8226;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Navigation */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Vous maitrisez l&apos;API MailPulse !</p>
        <p className="text-zinc-300 font-medium">
          Retour a la{" "}
          <a href="/docs" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            page d&apos;accueil de la documentation
          </a>
        </p>
      </div>
    </div>
  );
}
