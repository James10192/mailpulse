import {
  type BaileysProviderConfiguration,
  type ExternalApplicationContext,
  type ExternalWhatsAppProvider,
  type MetaProviderConfiguration,
} from "@/lib/external-applications/application";
import type { ExternalCommand } from "@/lib/external-applications/command-types";
import { renderWhatsAppTextTemplate } from "@/lib/external-applications/whatsapp-transport-policy";
import { isDocumentMimeType } from "@/lib/external-applications/whatsapp-document";
import { isDeterministicRejection } from "@/lib/http-status";
import { prisma } from "@/lib/prisma";
import { EvolutionApiError, sendDocument, sendText } from "@/lib/whatsapp-baileys";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

/**
 * `unknown` is not a soft failure: it means we cannot prove WhatsApp refused the
 * submission, so the operation must stay reconcilable instead of being rejected.
 */
export type CommandSubmission =
  | { outcome: "accepted"; messageId: string | null }
  | { outcome: "rejected"; rejectionCode: string }
  | { outcome: "unknown" };

export function submitCommandToProvider(
  application: ExternalApplicationContext,
  provider: ExternalWhatsAppProvider,
  command: ExternalCommand,
  operationId: string,
): Promise<CommandSubmission> {
  return provider.kind === "meta"
    ? submitMetaCommand(application, provider, command, operationId)
    : submitBaileysCommand(application, provider, command);
}

async function submitMetaCommand(
  application: ExternalApplicationContext,
  provider: MetaProviderConfiguration,
  command: ExternalCommand,
  operationId: string,
): Promise<CommandSubmission> {
  const body = await metaRequestBody(application, provider.id, command, operationId);
  const response = await fetch(`${META_GRAPH_API}/${provider.senderId}/messages`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", authorization: `Bearer ${provider.accessToken}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    return isDeterministicRejection(response.status)
      ? { outcome: "rejected", rejectionCode: "provider_rejected" }
      : { outcome: "unknown" };
  }
  const parsed: unknown = await response.json();
  const messageId = isRecord(parsed) && Array.isArray(parsed.messages) && isRecord(parsed.messages[0]) && typeof parsed.messages[0].id === "string"
    ? parsed.messages[0].id
    : null;
  return { outcome: "accepted", messageId };
}

async function submitBaileysCommand(
  application: ExternalApplicationContext,
  provider: BaileysProviderConfiguration,
  command: ExternalCommand,
): Promise<CommandSubmission> {
  try {
    let result;
    if (command.content.type === "document") {
      // The real name and type travel with the file: the recipient's phone
      // decides how to open it from them.
      const { url, filename, mimeType, caption } = command.content;
      result = await sendDocument(provider.instanceName, command.recipient, { url, filename, mimeType, caption });
    } else {
      const body = await baileysMessageText(application, provider.id, command.operationKey, command.content);
      if (!body.ok) return { outcome: "rejected", rejectionCode: body.rejectionCode };
      result = await sendText(provider.instanceName, command.recipient, body.text);
    }
    // Evolution echoes the Baileys message key, whose id is the only handle a
    // later delivery webhook can be reconciled against.
    const messageId = typeof result.key?.id === "string" && result.key.id ? result.key.id : null;
    return { outcome: "accepted", messageId };
  } catch (error) {
    // A refusal Evolution will repeat identically is settled now: leaving an
    // unreachable number reconcilable would strand one operation per wrong
    // number for good.
    if (error instanceof EvolutionApiError && error.deterministic) {
      return {
        outcome: "rejected",
        rejectionCode: error.recipientUnreachable ? "whatsapp_recipient_unreachable" : "provider_rejected",
      };
    }
    return { outcome: "unknown" };
  }
}

/**
 * WhatsApp Web knows no approved template, so a template command is flattened
 * into the text the recipient will read before it ever leaves the process.
 */
async function baileysMessageText(
  application: ExternalApplicationContext,
  providerAccountId: string,
  operationKey: string,
  content: Exclude<ExternalCommand["content"], { type: "document" }>,
) {
  if (content.type === "text") return { ok: true as const, text: content.text };

  const body = await resolveProviderTemplateId(application, providerAccountId, operationKey, content.locale);
  const rendered = renderWhatsAppTextTemplate(body, content.parameters);
  return rendered.ok ? { ok: true as const, text: rendered.text } : { ok: false as const, rejectionCode: rendered.rejectionCode };
}

/**
 * `biz_opaque_callback_data` is echoed back on every status webhook. Carrying
 * the operation id there is what lets a status reconcile a submission whose
 * response we never saw.
 */
async function metaRequestBody(application: ExternalApplicationContext, providerAccountId: string, command: ExternalCommand, operationId: string) {
  const to = command.recipient.replace(/^\+/, "");
  if (command.content.type === "text") {
    return { messaging_product: "whatsapp", to, type: "text", biz_opaque_callback_data: operationId, text: { body: command.content.text } };
  }
  if (command.content.type === "document") {
    const { url, filename, caption } = command.content;
    return {
      messaging_product: "whatsapp",
      to,
      type: "document",
      biz_opaque_callback_data: operationId,
      document: { link: url, filename, ...(caption ? { caption } : {}) },
    };
  }
  const providerTemplateId = await resolveProviderTemplateId(application, providerAccountId, command.operationKey, command.content.locale);
  const parameters = command.content.parameters.map((text) => ({ type: "text", text }));
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    biz_opaque_callback_data: operationId,
    template: {
      name: providerTemplateId,
      language: { code: command.content.locale },
      ...(parameters.length > 0 ? { components: [{ type: "body", parameters }] } : {}),
    },
  };
}

/**
 * Nothing left the process, so this is settled, not uncertain. Classifying it
 * as an unknown submission would park a purely local misconfiguration in the
 * manual reconciliation queue, where retrying can never resolve it.
 */
export class MissingTemplateConfigurationError extends Error {}

/**
 * A provider-scoped row wins over the application default so a rail can stage
 * its own wording without disturbing the account still serving traffic.
 */
async function resolveProviderTemplateId(application: ExternalApplicationContext, providerAccountId: string, operationKey: string, locale: string) {
  let template = await prisma.applicationTemplateConfig.findFirst({
    where: {
      applicationId: application.id,
      operationKey,
      locale,
      active: true,
      providerAccountId,
    },
    select: { providerTemplateId: true },
  });
  if (!template) {
    template = await prisma.applicationTemplateConfig.findFirst({
      where: {
        applicationId: application.id,
        operationKey,
        locale,
        active: true,
        providerAccountId: null,
      },
      select: { providerTemplateId: true },
    });
  }
  if (!template) throw new MissingTemplateConfigurationError();
  return template.providerTemplateId;
}

export function parseCommandPayload(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed) || typeof parsed.operationKey !== "string" || typeof parsed.recipient !== "string" || !isRecord(parsed.content)) {
    throw new Error("Invalid external application operation payload.");
  }
  if (parsed.content.type === "text" && typeof parsed.content.text === "string") return parsed as unknown as ExternalCommand;
  if (parsed.content.type === "template" && typeof parsed.content.locale === "string" && Array.isArray(parsed.content.parameters) && parsed.content.parameters.every((item) => typeof item === "string")) {
    return parsed as unknown as ExternalCommand;
  }
  if (
    parsed.content.type === "document"
    && typeof parsed.content.url === "string"
    && typeof parsed.content.filename === "string"
    && typeof parsed.content.mimeType === "string"
    && isDocumentMimeType(parsed.content.mimeType)
    && (parsed.content.caption === undefined || typeof parsed.content.caption === "string")
  ) {
    return parsed as unknown as ExternalCommand;
  }
  throw new Error("Invalid external application operation payload.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
