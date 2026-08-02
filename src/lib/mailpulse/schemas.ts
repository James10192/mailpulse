import { z } from "zod";
import type {
  CommunicationChannel,
  MessageContentType,
  MessageStatus,
  RecipientType,
  TemplateStatus,
} from "@/generated/prisma";
import { MAX_SMS_CHARACTERS } from "@/lib/sms";

export const channelSchema = z.enum(["email", "whatsapp", "sms"]);
export const recipientTypeSchema = z.enum(["email", "phone"]);
export const contentTypeSchema = z.enum(["text", "template"]);
export const templateStatusSchema = z.enum(["draft", "approved", "pending_review", "rejected", "archived"]);

const MAX_METADATA_KEYS = 25;
const MAX_VARIABLE_KEYS = 50;
const MAX_METADATA_BYTES = 16_384;
const MAX_VARIABLE_BYTES = 12_288;

function boundedJsonRecord(maxKeys: number, maxBytes: number) {
  return z.record(z.string().min(1).max(64), z.unknown()).superRefine((value, ctx) => {
    if (Object.keys(value).length > maxKeys) {
      ctx.addIssue({
        code: "too_big",
        maximum: maxKeys,
        origin: "object",
        inclusive: true,
        message: `Maximum ${maxKeys} propriÃ©tÃ©s.`,
      });
    }
    if (new TextEncoder().encode(JSON.stringify(value)).length > maxBytes) {
      ctx.addIssue({
        code: "too_big",
        maximum: maxBytes,
        origin: "object",
        inclusive: true,
        message: `Charge utile limitÃ©e Ã  ${maxBytes} octets.`,
      });
    }
  });
}

export const metadataSchema = boundedJsonRecord(MAX_METADATA_KEYS, MAX_METADATA_BYTES).optional();
export const variablesSchema = boundedJsonRecord(MAX_VARIABLE_KEYS, MAX_VARIABLE_BYTES).optional();

export const upsertContactSchema = z.object({
  external_id: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  language: z.string().min(2).optional(),
  preferred_channel: channelSchema.optional(),
  subscribed: z.boolean().optional(),
  metadata: metadataSchema,
}).refine((value: { email?: string; phone?: string; external_id?: string }) => value.email || value.phone || value.external_id, {
  message: "Provide at least email, phone, or external_id.",
});

export const updateContactPreferencesSchema = z.object({
  subscribed: z.boolean().optional(),
  channel_opt_in: z.record(channelSchema, z.boolean()).optional(),
  preferred_channel: channelSchema.optional(),
  language: z.string().min(2).optional(),
  metadata: metadataSchema,
});

export const createTemplateSchema = z.object({
  template_key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  channel: channelSchema,
  locale: z.string().min(2).default("fr"),
  content_type: contentTypeSchema.default("template"),
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: variablesSchema,
  provider_template_id: z.string().optional(),
  status: templateStatusSchema.default("draft"),
  metadata: metadataSchema,
});

export const updateTemplateSchema = createTemplateSchema.partial().omit({
  template_key: true,
  channel: true,
  locale: true,
});

export const messageRecipientSchema = z.object({
  type: recipientTypeSchema,
  value: z.string().min(3),
});

export const messageContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("template"),
    template_key: z.string().min(1),
    locale: z.string().min(2).default("fr"),
    variables: variablesSchema,
  }),
]);

export const createMessageSchema = z.object({
  channel: channelSchema,
  recipient: messageRecipientSchema,
  content: messageContentSchema,
  metadata: metadataSchema,
  idempotency_key: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  const expectedRecipient = value.channel === "email" ? "email" : "phone";
  if (value.recipient.type !== expectedRecipient) {
    ctx.addIssue({
      code: "custom",
      path: ["recipient", "type"],
      message: `Le canal ${value.channel} nécessite un destinataire ${expectedRecipient}.`,
    });
  }

  if (value.channel === "sms" && value.content.type !== "text") {
    ctx.addIssue({
      code: "custom",
      path: ["content", "type"],
      message: "Les SMS ne prennent en charge que le texte.",
    });
  }

  if (value.channel === "sms" && value.content.type === "text" && value.content.text.length > MAX_SMS_CHARACTERS) {
    ctx.addIssue({
      code: "too_big",
      maximum: MAX_SMS_CHARACTERS,
      inclusive: true,
      origin: "string",
      path: ["content", "text"],
      message: `Un SMS est limité à ${MAX_SMS_CHARACTERS} caractères.`,
    });
  }
});

export const createWebhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
});

export function toChannel(value: z.infer<typeof channelSchema>): CommunicationChannel {
  return value.toUpperCase() as CommunicationChannel;
}

export function fromChannel(value: CommunicationChannel) {
  return value.toLowerCase();
}

export function toRecipientType(value: z.infer<typeof recipientTypeSchema>): RecipientType {
  return value.toUpperCase() as RecipientType;
}

export function fromRecipientType(value: RecipientType) {
  return value.toLowerCase();
}

export function toContentType(value: z.infer<typeof contentTypeSchema>): MessageContentType {
  return value.toUpperCase() as MessageContentType;
}

export function fromContentType(value: MessageContentType) {
  return value.toLowerCase();
}

export function toTemplateStatus(value: z.infer<typeof templateStatusSchema>): TemplateStatus {
  return value.toUpperCase() as TemplateStatus;
}

export function fromTemplateStatus(value: TemplateStatus) {
  return value.toLowerCase();
}

export function fromMessageStatus(value: MessageStatus) {
  return value.toLowerCase();
}

export function validationError(error: z.ZodError) {
  return Response.json(
    { error: "Validation failed", field_errors: error.flatten().fieldErrors },
    { status: 422 }
  );
}
