import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

const enabledValue = process.env.ORANGE_SMS_ENABLED?.trim();
if (enabledValue && enabledValue !== "true" && enabledValue !== "false") {
  throw new Error("ORANGE_SMS_ENABLED doit être défini à true ou false.");
}

const smsEnabled = enabledValue === "true";

if (!smsEnabled) process.exit(0);

const senderConfirmed = process.env.ORANGE_SMS_SENDER_CONFIRMED?.trim();
if (senderConfirmed !== "true") {
  throw new Error("ORANGE_SMS_SENDER_CONFIRMED doit être défini à true lorsque ORANGE_SMS_ENABLED=true.");
}

const senderAddress = process.env.ORANGE_SMS_SENDER_ADDRESS?.trim() ?? "";

if (!/^\+225\d{10}$/.test(senderAddress) || senderAddress === "+2250000") {
  throw new Error(
    "ORANGE_SMS_SENDER_ADDRESS doit être un numéro ivoirien E.164 autorisé par Orange, sans valeur de démonstration.",
  );
}

const receiptConfirmation = process.env.ORANGE_SMS_DELIVERY_RECEIPTS_CONFIRMED?.trim();
if (receiptConfirmation !== "true") {
  throw new Error("ORANGE_SMS_DELIVERY_RECEIPTS_CONFIRMED doit être défini à true lorsque ORANGE_SMS_ENABLED=true.");
}

for (const name of ["ORANGE_SMS_CLIENT_ID", "ORANGE_SMS_CLIENT_SECRET", "ORANGE_SMS_OWNER_ORGANIZATION_ID"]) {
  if (!process.env[name]?.trim()) throw new Error(`${name} doit être défini lorsque ORANGE_SMS_ENABLED=true.`);
}

const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
if (cronSecret.length < 32) {
  throw new Error("CRON_SECRET doit contenir au moins 32 caractères lorsque ORANGE_SMS_ENABLED=true.");
}

const callbackUrl = process.env.ORANGE_SMS_DELIVERY_RECEIPT_CALLBACK_URL?.trim() ?? "";
const webhookToken = process.env.ORANGE_SMS_WEBHOOK_TOKEN?.trim() ?? "";
let callbackIsValid = false;

try {
  const url = new URL(callbackUrl);
  callbackIsValid = url.protocol === "https:"
    && !url.username
    && !url.password
    && !url.hash
    && url.pathname === "/api/webhooks/sms/orange"
    && url.searchParams.size === 1
    && url.searchParams.getAll("token").length === 1
    && url.searchParams.get("token") === webhookToken;
} catch {
  callbackIsValid = false;
}

if (!/^[A-Za-z0-9_-]{32,128}$/.test(webhookToken) || !callbackIsValid) {
  throw new Error(
    "Les accusés Orange exigent un jeton URL-safe de 32 à 128 caractères et une URL HTTPS exacte vers /api/webhooks/sms/orange?token=...",
  );
}
