/**
 * The name shown next to an API key. It is the only way to tell two keys apart
 * once created (the secret is shown once), so it is required and kept readable.
 */
export const API_KEY_NAME_MAX_LENGTH = 60;

export type ApiKeyNameResult = { ok: true; name: string } | { ok: false; error: string };

export function normalizeApiKeyName(raw: unknown): ApiKeyNameResult {
  const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!name) return { ok: false, error: "Donnez un nom à la clé, par exemple l'application qui l'utilisera." };
  if (name.length > API_KEY_NAME_MAX_LENGTH) {
    return { ok: false, error: `Le nom ne peut pas dépasser ${API_KEY_NAME_MAX_LENGTH} caractères.` };
  }
  return { ok: true, name };
}
