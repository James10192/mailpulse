import { z } from "zod";

/**
 * Keys of contact metadata that only the server may write. `channel_opt_in`
 * holds the per-channel consent read by canReceiveChannel, including STOP
 * replies: a dashboard edit must never overwrite it.
 */
export const SERVER_MANAGED_METADATA_KEYS = ["channel_opt_in"] as const;

export const CONTACT_METADATA_MAX_KEYS = 100;

export const contactMetadataInputSchema = z
  .record(z.string().min(1).max(100), z.json())
  .refine((value) => Object.keys(value).length <= CONTACT_METADATA_MAX_KEYS, "Trop de champs personnalisés.");

export type ContactMetadataInput = z.infer<typeof contactMetadataInputSchema>;

function isServerManagedKey(key: string): boolean {
  return SERVER_MANAGED_METADATA_KEYS.some((reserved) => reserved === key);
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
}

/**
 * The submitted metadata replaces the editable fields; server-managed keys are
 * always taken from what is stored, whatever the client sent.
 */
export function mergeContactMetadata(stored: unknown, submitted: ContactMetadataInput): ContactMetadataInput {
  const merged: ContactMetadataInput = {};
  for (const [key, value] of Object.entries(submitted)) {
    if (!isServerManagedKey(key)) merged[key] = value;
  }
  const current = readRecord(stored);
  for (const key of SERVER_MANAGED_METADATA_KEYS) {
    const parsed = z.json().safeParse(current[key]);
    if (key in current && parsed.success) merged[key] = parsed.data;
  }
  return merged;
}
