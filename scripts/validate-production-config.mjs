import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

const key = process.env.EXTERNAL_APPLICATION_KEK?.trim();
if (!key) {
  throw new Error("EXTERNAL_APPLICATION_KEK doit être défini pour chiffrer les identifiants des applications externes.");
}

if (Buffer.from(key, "base64").length !== 32) {
  throw new Error("EXTERNAL_APPLICATION_KEK doit être une clé Base64 de 32 octets.");
}

if (!process.env.CRON_SECRET?.trim()) {
  throw new Error("CRON_SECRET doit être défini pour protéger les routes cron.");
}

console.log("Configuration de production : OK");
