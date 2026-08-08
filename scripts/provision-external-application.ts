import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

import { config as loadEnvironment } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { encryptExternalApplicationValue } from "../src/lib/external-applications/crypto.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { assertSafeCallbackUrl } from "../src/lib/external-applications/network.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { assertSingleActiveWhatsAppAccount, ensureInboundToken, inboundWebhookUrl, META_PROVIDER, upsertBaileysProviderAccount } from "./provision-whatsapp.ts";

const USAGE = `Provisionne une application externe MailPulse (idempotent).

Usage:
  node --experimental-strip-types scripts/provision-external-application.ts \\
    --org <slug-ou-id> --key <application-key> --name "<nom>" \\
    [--transport meta|baileys] \\
    [--waba <waba-id> --phone-number-id <phone-number-id>]        (transport meta) \\
    [--instance <nom-instance-evolution> [--sender <numero>]]      (transport baileys) \\
    [--forward-url <https-url>] [--forward-events ev1,ev2] \\
    [--template "operationKey=providerTemplateId@locale"]... \\
    [--rotate-command-credential] [--rotate-forward-secret] [--rotate-inbound-token]

Transport meta : canal officiel, templates approuvés obligatoires, fenêtre de service 24 h.
Transport baileys : WhatsApp Web via Evolution API, aucun template ni fenêtre 24 h, mais
  canal non officiel avec risque de blocage du numéro. L'URL et la clé Evolution sont
  globales (EVOLUTION_API_URL / EVOLUTION_API_KEY) : rien n'est stocké par compte. Le
  jeton du webhook entrant est généré ici et affiché une seule fois.

Secrets Meta (requis à la création du ProviderAccount ou avec --update-meta-credentials) :
  PROVISION_META_ACCESS_TOKEN, PROVISION_META_APP_SECRET, PROVISION_META_VERIFY_TOKEN

Les secrets générés (commande, callback, jeton entrant) ne sont affichés qu'une seule fois.`;

// Status callbacks carry a different payload shape than inbound messages, so a
// partner opts into them explicitly rather than receiving them by default.
const DEFAULT_FORWARD_EVENTS = ["whatsapp.inbound_message"];

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    key: { type: "string" },
    name: { type: "string" },
    transport: { type: "string", default: "meta" },
    waba: { type: "string" },
    "phone-number-id": { type: "string" },
    instance: { type: "string" },
    sender: { type: "string" },
    "forward-url": { type: "string" },
    "forward-events": { type: "string" },
    template: { type: "string", multiple: true },
    "rotate-command-credential": { type: "boolean", default: false },
    "rotate-forward-secret": { type: "boolean", default: false },
    "rotate-inbound-token": { type: "boolean", default: false },
    "update-meta-credentials": { type: "boolean", default: false },
    "reassign-provider-account": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help || !values.org || !values.key) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

const transport = values.transport?.toLowerCase() ?? "meta";
if (transport !== "meta" && transport !== "baileys") {
  console.error(`--transport doit valoir "meta" ou "baileys" (reçu : ${values.transport}).`);
  process.exit(1);
}

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL doit être défini.");
if (!process.env.EXTERNAL_APPLICATION_KEK) throw new Error("EXTERNAL_APPLICATION_KEK doit être défini.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const revealedSecrets: string[] = [];

try {
  const organization = await resolveOrganization(values.org);
  console.log(`Organisation : ${organization.name} (${organization.id})`);

  const application = await upsertApplication(organization.id, values.key, values.name ?? values.key);
  console.log(`Application externe : key=${application.key} id=${application.id}`);

  await ensureCommandCredential(application.id, values["rotate-command-credential"] ?? false);

  let providerAccount: { id: string; senderId: string | null } | null = null;
  if (transport === "baileys") {
    const baileys = await upsertBaileysProviderAccount(prisma, {
      organizationId: organization.id,
      applicationId: application.id,
      instanceName: values.instance,
      sender: values.sender,
      allowReassign: values["reassign-provider-account"] ?? false,
    });
    providerAccount = baileys.account;
    console.log(baileys.log);

    const inbound = await ensureInboundToken(prisma, application.id, values["rotate-inbound-token"] ?? false);
    for (const line of inbound.logs) console.log(line);
    revealedSecrets.push(...inbound.revealed);
  } else {
    providerAccount = await upsertMetaProviderAccount(organization.id, application.id);
  }

  if (values["forward-url"]) {
    // Lowercased to match the stored event names: a casing mismatch would make
    // the endpoint match nothing while the run still reports success.
    const events = values["forward-events"]
      ? values["forward-events"].split(",").map((event) => event.trim().toLowerCase()).filter(Boolean)
      : DEFAULT_FORWARD_EVENTS;
    await upsertForwardEndpoint(organization.id, application.id, values["forward-url"], events, values["rotate-forward-secret"] ?? false);
  }

  for (const spec of values.template ?? []) {
    await upsertTemplateConfig(organization.id, application.id, spec);
  }

  printSummary(organization.id, application, providerAccount?.senderId ?? null);
} finally {
  // The generated secrets exist nowhere else in plaintext, so they are printed
  // even when a later step aborts the run.
  printRevealedSecrets();
  await prisma.$disconnect();
}

async function resolveOrganization(reference: string) {
  const organization = await prisma.organization.findFirst({
    where: { OR: [{ id: reference }, { slug: reference }] },
    select: { id: true, name: true, slug: true },
  });
  if (!organization) throw new Error(`Organisation introuvable : ${reference}`);
  return organization;
}

async function upsertApplication(organizationId: string, key: string, name: string) {
  return prisma.externalApplication.upsert({
    where: { organizationId_key: { organizationId, key } },
    update: { name, active: true },
    create: { organizationId, key, name, active: true },
    select: { id: true, key: true, organizationId: true },
  });
}

async function ensureCommandCredential(applicationId: string, rotate: boolean) {
  const now = new Date();
  const active = await prisma.externalApplicationCredential.findFirst({
    where: {
      applicationId,
      purpose: "COMMAND_INGRESS",
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { version: "desc" },
    select: { keyId: true, version: true },
  });

  if (active && !rotate) {
    console.log(`Credential COMMAND_INGRESS déjà actif : keyId=${active.keyId} (v${active.version}). Utiliser --rotate-command-credential pour en générer un nouveau.`);
    return;
  }

  const keyId = `ck_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  const latest = await prisma.externalApplicationCredential.findFirst({
    where: { applicationId, purpose: "COMMAND_INGRESS" },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  await prisma.externalApplicationCredential.create({
    data: {
      applicationId,
      purpose: "COMMAND_INGRESS",
      keyId,
      secretCiphertext: encryptExternalApplicationValue(secret),
      version: (latest?.version ?? 0) + 1,
    },
  });
  revealedSecrets.push(
    `Credential COMMAND_INGRESS ${active ? "(rotation, l'ancien reste actif jusqu'à révocation)" : "(nouveau)"} :`,
    `  MAILPULSE_COMMANDS_KEY_ID=${keyId}`,
    `  MAILPULSE_COMMANDS_SECRET=${secret}`,
  );
}

async function upsertMetaProviderAccount(organizationId: string, applicationId: string) {
  const waba = values.waba;
  const senderId = values["phone-number-id"];
  if (!waba && !senderId) return null;
  if (!waba || !senderId) throw new Error("--waba et --phone-number-id doivent être fournis ensemble.");

  const existing = await prisma.providerAccount.findUnique({
    where: {
      organizationId_channel_provider_externalAccountId: {
        organizationId,
        channel: "WHATSAPP",
        provider: META_PROVIDER,
        externalAccountId: waba,
      },
    },
    select: { id: true, applicationId: true },
  });

  // Silently re-parenting the account would break the previous application's
  // outbound path and reroute its parents' inbound messages to this one.
  if (existing?.applicationId && existing.applicationId !== applicationId && !values["reassign-provider-account"]) {
    throw new Error(
      `Le compte fournisseur ${existing.id} (WABA ${waba}) appartient déjà à l'application ${existing.applicationId}. Relancez avec --reassign-provider-account pour le transférer en connaissance de cause.`,
    );
  }

  await assertSingleActiveWhatsAppAccount(prisma, applicationId, existing?.id);

  const wantsCredentialUpdate = !existing || (values["update-meta-credentials"] ?? false);
  const credentialsCiphertext = wantsCredentialUpdate ? encryptExternalApplicationValue(JSON.stringify(readMetaCredentials())) : undefined;

  // A second active account carrying the same phone_number_id would make the
  // Meta webhook resolution ambiguous and fail closed for both applications.
  const conflicting = await prisma.providerAccount.findFirst({
    where: {
      channel: "WHATSAPP",
      provider: META_PROVIDER,
      senderId,
      active: true,
      ...(existing ? { id: { not: existing.id } } : {}),
    },
    select: { id: true, organizationId: true, applicationId: true },
  });
  if (conflicting) {
    throw new Error(
      `Le phone_number_id ${senderId} est déjà porté par le ProviderAccount ${conflicting.id} (org ${conflicting.organizationId}). La résolution du webhook Meta serait ambiguë : désactiver l'autre compte d'abord.`,
    );
  }

  const account = existing
    ? await prisma.providerAccount.update({
      where: { id: existing.id },
      data: {
        senderId,
        applicationId,
        active: true,
        ...(credentialsCiphertext ? { credentialsCiphertext } : {}),
      },
      select: { id: true, senderId: true },
    })
    : await prisma.providerAccount.create({
      data: {
        organizationId,
        applicationId,
        channel: "WHATSAPP",
        provider: META_PROVIDER,
        externalAccountId: waba,
        senderId,
        credentialsCiphertext,
        active: true,
      },
      select: { id: true, senderId: true },
    });

  console.log(`ProviderAccount Meta : id=${account.id} phone_number_id=${account.senderId}${wantsCredentialUpdate ? " (credentials mis à jour)" : ""}`);
  return account;
}

function readMetaCredentials() {
  const accessToken = process.env.PROVISION_META_ACCESS_TOKEN;
  const appSecret = process.env.PROVISION_META_APP_SECRET;
  const verifyToken = process.env.PROVISION_META_VERIFY_TOKEN;
  if (!accessToken || !appSecret || !verifyToken) {
    throw new Error("PROVISION_META_ACCESS_TOKEN, PROVISION_META_APP_SECRET et PROVISION_META_VERIFY_TOKEN doivent être définis pour enregistrer les credentials Meta.");
  }
  return { accessToken, appSecret, verifyToken };
}

async function upsertForwardEndpoint(organizationId: string, applicationId: string, url: string, events: string[], rotateSecret: boolean) {
  await assertSafeCallbackUrl(url);

  const existing = await prisma.applicationForwardEndpoint.findUnique({
    where: { applicationId_url: { applicationId, url } },
    select: { id: true, keyId: true },
  });

  if (existing && !rotateSecret) {
    await prisma.applicationForwardEndpoint.update({
      where: { id: existing.id },
      data: { events, active: true },
    });
    console.log(`Forward endpoint déjà enregistré : keyId=${existing.keyId} events=${events.join(",")}. Utiliser --rotate-forward-secret pour régénérer le secret.`);
    return;
  }

  const keyId = `fk_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  if (existing) {
    await prisma.applicationForwardEndpoint.update({
      where: { id: existing.id },
      data: { keyId, secretCiphertext: encryptExternalApplicationValue(secret), events, active: true },
    });
  } else {
    await prisma.applicationForwardEndpoint.create({
      data: {
        organizationId,
        applicationId,
        url,
        keyId,
        secretCiphertext: encryptExternalApplicationValue(secret),
        events,
        active: true,
      },
    });
  }
  revealedSecrets.push(
    `Forward endpoint ${existing ? "(secret régénéré)" : "(nouveau)"} — à configurer côté application partenaire :`,
    `  URL=${url}`,
    `  MAILPULSE_CALLBACK_KEY_ID=${keyId}`,
    `  MAILPULSE_CALLBACK_SECRET=${secret}`,
  );
}

async function upsertTemplateConfig(organizationId: string, applicationId: string, spec: string) {
  const match = /^([^=]+)=([^@]+)@(.+)$/.exec(spec.trim());
  if (!match) throw new Error(`Spécification de template invalide : "${spec}". Format attendu : operationKey=providerTemplateId@locale`);
  const [, operationKey, providerTemplateId, locale] = match;

  const existing = await prisma.applicationTemplateConfig.findFirst({
    where: { applicationId, operationKey, locale, providerAccountId: null },
    select: { id: true },
  });
  if (existing) {
    await prisma.applicationTemplateConfig.update({
      where: { id: existing.id },
      data: { providerTemplateId, active: true },
    });
  } else {
    await prisma.applicationTemplateConfig.create({
      data: { organizationId, applicationId, operationKey, locale, providerTemplateId, active: true },
    });
  }
  console.log(`Template : ${operationKey} (${locale}) → ${providerTemplateId}`);
}

function printSummary(organizationId: string, application: { id: string; key: string }, senderId: string | null) {
  console.log("\n===== Récapitulatif =====");
  console.log(`Transport : ${transport === "baileys" ? "Baileys (Evolution API, non officiel)" : "Meta Cloud API (officiel)"}`);
  console.log(`x-external-organization-id : ${organizationId}`);
  console.log(`Commands : POST /api/v1/external-applications/${application.key}/commands`);
  if (transport === "baileys") {
    console.log(`Webhook Baileys (URL à coller dans Evolution) : ${inboundWebhookUrl(application.id)}?token=<jeton>`);
    console.log("Rappel : pas de template à faire approuver ni de fenêtre 24 h, mais canal non officiel — le numéro peut être bloqué par WhatsApp.");
    if (senderId) console.log(`Numéro connecté : ${senderId}`);
  } else {
    console.log(`Webhook Meta (URL à déclarer chez Meta) : /api/webhooks/whatsapp/meta/${application.id}`);
    if (senderId) console.log(`phone_number_id : ${senderId}`);
  }
}

function printRevealedSecrets() {
  if (revealedSecrets.length === 0) return;
  console.log("\n===== Secrets (affichés une seule fois, stockés chiffrés) =====");
  for (const line of revealedSecrets) console.log(line);
  revealedSecrets.length = 0;
}
