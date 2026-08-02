export const EXTERNAL_WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function externalWhatsAppWindowExpiresAt(receivedAt = new Date()) {
  return new Date(receivedAt.getTime() + EXTERNAL_WHATSAPP_WINDOW_MS);
}

export function isExternalWhatsAppWindowOpen(expiresAt: Date | null | undefined, now = new Date()) {
  return expiresAt !== null && expiresAt !== undefined && expiresAt.getTime() > now.getTime();
}
