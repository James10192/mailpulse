import { z } from "zod";

import type { ExternalCommand, ExternalCommandContent } from "./command-types";
import { parseDocumentContent } from "./whatsapp-document";

const PHONE = /^\+[1-9]\d{6,14}$/;
const KEY = z.string().trim().min(1).max(128);

const contentSchema = z.discriminatedUnion("type", [
  // 4096 is the WhatsApp text body limit. A tighter bound here would reject
  // legitimate long replies with an opaque 400.
  z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(4096) }).strict(),
  z.object({ type: z.literal("template"), locale: z.string().trim().min(2).max(20), parameters: z.array(z.string().trim().min(1).max(512)).max(10).default([]) }).strict(),
  z.object({
    type: z.literal("document"),
    url: z.string(),
    filename: z.string(),
    mimeType: z.string().optional(),
    mime_type: z.string().optional(),
    caption: z.string().nullable().optional(),
  }).strict(),
]);

/** The shape every client already sends. */
const snakeCaseSchema = z.object({
  operation_key: KEY,
  channel: z.literal("whatsapp"),
  recipient: z.object({ type: z.literal("phone"), value: z.string().regex(PHONE) }).strict(),
  content: contentSchema,
  metadata: z.object({ idempotency_key: KEY }).strict(),
}).strict();

/** The flatter shape of the published contract, accepted alongside. */
const camelCaseSchema = z.object({
  operationKey: KEY,
  idempotencyKey: KEY,
  channel: z.literal("whatsapp").optional(),
  recipient: z.string().regex(PHONE),
  content: contentSchema,
}).strict();

/** Returns null for anything that is not a well-formed command: the caller answers 400. */
export function parseExternalCommandRequest(body: unknown): ExternalCommand | null {
  const snake = snakeCaseSchema.safeParse(body);
  if (snake.success) {
    return buildCommand(snake.data.operation_key, snake.data.metadata.idempotency_key, snake.data.recipient.value, snake.data.content);
  }
  const camel = camelCaseSchema.safeParse(body);
  if (camel.success) {
    return buildCommand(camel.data.operationKey, camel.data.idempotencyKey, camel.data.recipient, camel.data.content);
  }
  return null;
}

function buildCommand(operationKey: string, idempotencyKey: string, recipient: string, input: z.infer<typeof contentSchema>): ExternalCommand | null {
  const content = normalizeContent(input);
  return content ? { operationKey, idempotencyKey, recipient, content } : null;
}

function normalizeContent(input: z.infer<typeof contentSchema>): ExternalCommandContent | null {
  if (input.type === "text") return { type: "text", text: input.text };
  if (input.type === "template") return { type: "template", locale: input.locale, parameters: input.parameters };
  const mimeType = input.mimeType ?? input.mime_type;
  if (!mimeType) return null;
  return parseDocumentContent({ url: input.url, filename: input.filename, mimeType, caption: input.caption });
}
