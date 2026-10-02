/**
 * Pairing a WhatsApp number to one external application from the dashboard:
 * MailPulse creates the Evolution instance, shows its QR code, then records the
 * number as the application's sender. Pure helpers, no I/O.
 */

/** Prefix of the instances MailPulse creates for an application. */
const PAIRING_PREFIX = "mpa-";

/**
 * A fresh instance name that carries the application id, so a later request
 * naming an instance can only ever act on one created for that application.
 */
export function pairingInstanceName(applicationId: string, now = Date.now()) {
  return `${PAIRING_PREFIX}${applicationId}-${now.toString(36)}`;
}

/** True only for an instance MailPulse created for this very application. */
export function isPairingInstanceOf(instanceName: string, applicationId: string) {
  const prefix = `${PAIRING_PREFIX}${applicationId}-`;
  return instanceName.startsWith(prefix) && /^[a-z0-9]+$/.test(instanceName.slice(prefix.length));
}

/**
 * The application an instance was created for, when MailPulse created it.
 * A number moved to another application keeps its instance name, so callers
 * that act on "an instance we created" check that this application belongs to
 * the same organization rather than requiring it to be the current one.
 */
export function pairingApplicationOf(instanceName: string): string | null {
  const match = /^mpa-([a-z0-9]+)-([a-z0-9]+)$/.exec(instanceName);
  return match ? match[1] : null;
}

/**
 * The connected number as Evolution reports it on the instance: `owner` (1.x)
 * or `ownerJid` (2.x), a JID like "2250701020304@s.whatsapp.net", or `number`.
 */
export function ownerNumberOf(instance: { owner?: unknown; ownerJid?: unknown; number?: unknown }): string | null {
  for (const raw of [instance.ownerJid, instance.owner, instance.number]) {
    if (typeof raw !== "string") continue;
    const digits = raw.split("@")[0].split(":")[0].replace(/\D/g, "");
    if (digits.length >= 6 && digits.length <= 20) return digits;
  }
  return null;
}

/**
 * Where Evolution must post this application's events. Evolution only reaches a
 * public HTTPS address; anything else returns null and the caller says so.
 */
export function inboundWebhookUrl(applicationId: string, env: { NEXT_PUBLIC_APP_URL?: string; VERCEL_PROJECT_PRODUCTION_URL?: string }) {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim();
  const base = configured || (env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}` : "");
  if (!base.startsWith("https://")) return null;
  return `${base.replace(/\/+$/, "")}/api/webhooks/whatsapp/baileys/${applicationId}`;
}
