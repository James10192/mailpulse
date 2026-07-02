import { z } from "zod";
import type {
  CommunicationChannel,
  MessageContentType,
  MessageStatus,
  RecipientType,
  TemplateStatus,
} from "@/generated/prisma";

export const channelSchema = z.enum(["email", "whatsapp", "sms"]);
export const recipientTypeSchema = z.enum(["email", "phone"]);
export const contentTypeSchema = z.enum(["text", "template"]);
export const templateStatusSchema = z.enum(["draft", "approved", "pending_review", "rejected", "archived"]);

export const metadataSchema = z.record(z.string(), z.unknown()).optional();

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
  variables: z.record(z.string(), z.unknown()).optional(),
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
    variables: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export const createMessageSchema = z.object({
  channel: channelSchema,
  recipient: messageRecipientSchema,
  content: messageContentSchema,
  metadata: metadataSchema,
  idempotency_key: z.string().min(1).optional(),
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
