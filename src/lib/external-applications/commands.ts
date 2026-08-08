import { randomUUID } from "node:crypto";

import { decryptExternalApplicationValue, encryptExternalApplicationValue, hashExternalApplicationPayload } from "@/lib/external-applications/crypto";
import {
  resolveWhatsAppProvider,
  type BaileysProviderConfiguration,
  type ExternalApplicationContext,
  type MetaProviderConfiguration,
} from "@/lib/external-applications/application";
import { hasActiveExternalWhatsAppConversationWindow } from "@/lib/external-applications/conversation-window";
import { isProviderConfirmedOperationStatus, isProviderRejectedOperationStatus } from "@/lib/external-applications/message-status";
import { renderWhatsAppTextTemplate, requiresWhatsAppServiceWindow } from "@/lib/external-applications/whatsapp-transport-policy";
import { prisma } from "@/lib/prisma";
import { EvolutionApiError, isConfigured as isEvolutionConfigured, sendText } from "@/lib/whatsapp-baileys";

const LEASE_DURATION_MS = 10 * 60_000;
const META_GRAPH_API = "https://graph.facebook.com/v21.0";

export type ExternalCommand = {
  operationKey: string;
  idempotencyKey: string;
  recipient: string;
  content: { type: "text"; text: string } | { type: "template"; locale: string; parameters: string[] };
};

/**
 * `unknown` is not a soft failure: it means we cannot prove WhatsApp refused the
 * submission, so the operation must stay reconcilable instead of being rejected.
 */
type CommandSubmission =
  | { outcome: "accepted"; messageId: string | null }
  | { outcome: "rejected"; rejectionCode: string }
  | { outcome: "unknown" };

export async function dispatchExternalApplicationCommand(application: ExternalApplicationContext, command: ExternalCommand) {
  const provider = await resolveWhatsAppProvider(application);
  if (!provider) return { status: "unavailable" as const };
  // Checked before any operation row exists: a missing Evolution endpoint would
  // otherwise strand the command in SUBMISSION_UNKNOWN, where an idempotent
  // retry can never resubmit it once the configuration is repaired.
  if (provider.kind === "baileys" && !isEvolutionConfigured()) return { status: "unavailable" as const };

  const serializedPayload = JSON.stringify(command);
  const payloadHash = hashExternalApplicationPayload(serializedPayload);
  const operation = await findOrCreateOperation(application, provider.id, command.operationKey, command.idempotencyKey, serializedPayload, payloadHash);
  if (operation.payloadHash !== payloadHash) return { status: "conflict" as const, operationId: operation.id };
  // Checked before the window gate: a delivered message must never be answered
  // with a rejection because its 24h window has since closed.
  if (isProviderConfirmedOperationStatus(operation.status)) return { status: "accepted" as const, operationId: operation.id };
  if (isProviderRejectedOperationStatus(operation.status)) return { status: "rejected" as const, operationId: operation.id };
  if (operation.status === "SUBMISSION_UNKNOWN") return { status: "submission_unknown" as const, operationId: operation.id };

  if (requiresWhatsAppServiceWindow(provider.kind, command.content.type)) {
    const windowOpen = await hasOpenConversationWindow(application, provider.id, command.recipient);
    if (!windowOpen) {
      await rejectPendingOperation(operation.id);
      return { status: "rejected" as const, operationId: operation.id, rejectionCode: "whatsapp_service_window_closed" };
    }
  }

  const leaseToken = randomUUID();
  const now = new Date();
  const claimed = await prisma.externalTransportOperation.updateMany({
    where: {
      id: operation.id,
      OR: [{ status: "PENDING" }, { status: "PROCESSING", leaseExpiresAt: { lt: now } }],
    },
    data: { status: "PROCESSING", leaseToken, leaseAcquiredAt: now, leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS) },
  });
  if (claimed.count !== 1) return { status: "in_progress" as const, operationId: operation.id };

  const prepared = await prisma.externalTransportOperation.updateMany({
    where: { id: operation.id, status: "PROCESSING", leaseToken },
    data: { status: "SUBMISSION_UNKNOWN" },
  });
  if (prepared.count !== 1) return { status: "submission_unknown" as const, operationId: operation.id };

  try {
    const payload = parseCommandPayload(decryptExternalApplicationValue(operation.payloadCiphertext ?? ""));
    const submission = provider.kind === "meta"
      ? await submitMetaCommand(application, provider, payload, operation.id)
      : await submitBaileysCommand(application, provider, payload);
    if (submission.outcome === "rejected") {
      await finalizeOperation(operation.id, leaseToken, "REJECTED");
      return { status: "rejected" as const, operationId: operation.id, rejectionCode: submission.rejectionCode };
    }
    if (submission.outcome === "unknown") return { status: "submission_unknown" as const, operationId: operation.id };

    const accepted = await prisma.externalTransportOperation.updateMany({
      where: { id: operation.id, status: "SUBMISSION_UNKNOWN", leaseToken },
      data: { status: "ACCEPTED", acceptedAt: new Date(), providerMessageId: submission.messageId, leaseToken: null, leaseExpiresAt: null },
    });
    if (accepted.count === 1) return { status: "accepted" as const, operationId: operation.id };

    // A status webhook can confirm the submission while the provider response
    // is still in flight. That confirmation is stronger than our own write.
    const current = await prisma.externalTransportOperation.findUnique({
      where: { id: operation.id },
      select: { status: true },
    });
    return current && isProviderConfirmedOperationStatus(current.status)
      ? { status: "accepted" as const, operationId: operation.id }
      : { status: "submission_unknown" as const, operationId: operation.id };
  } catch (error) {
    if (error instanceof MissingTemplateConfigurationError) {
      await finalizeOperation(operation.id, leaseToken, "REJECTED");
      return { status: "rejected" as const, operationId: operation.id, rejectionCode: "template_not_configured" };
    }
    return { status: "submission_unknown" as const, operationId: operation.id };
  }
}

async function findOrCreateOperation(application: ExternalApplicationContext, providerAccountId: string, operationKey: string, idempotencyKey: string, payload: string, payloadHash: string) {
  const existing = await prisma.externalTransportOperation.findFirst({
    where: { organizationId: application.organizationId, applicationId: application.id, idempotencyKey },
  });
  if (existing) return existing;
  try {
    return await prisma.externalTransportOperation.create({
      data: {
        direction: "OUTBOUND",
        operationKey,
        idempotencyKey,
        payloadHash,
        payloadCiphertext: encryptExternalApplicationValue(payload),
        organizationId: application.organizationId,
        applicationId: application.id,
        providerAccountId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return prisma.externalTransportOperation.findFirstOrThrow({
      where: { organizationId: application.organizationId, applicationId: application.id, idempotencyKey },
    });
  }
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
  const body = await baileysMessageText(application, provider.id, command);
  if (!body.ok) return { outcome: "rejected", rejectionCode: body.rejectionCode };

  try {
    const result = await sendText(provider.instanceName, command.recipient, body.text);
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
async function baileysMessageText(application: ExternalApplicationContext, providerAccountId: string, command: ExternalCommand) {
  if (command.content.type === "text") return { ok: true as const, text: command.content.text };

  const body = await resolveProviderTemplateId(application, providerAccountId, command.operationKey, command.content.locale);
  const rendered = renderWhatsAppTextTemplate(body, command.content.parameters);
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
class MissingTemplateConfigurationError extends Error {}

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

function parseCommandPayload(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed) || typeof parsed.operationKey !== "string" || typeof parsed.recipient !== "string" || !isRecord(parsed.content)) {
    throw new Error("Invalid external application operation payload.");
  }
  if (parsed.content.type === "text" && typeof parsed.content.text === "string") return parsed as unknown as ExternalCommand;
  if (parsed.content.type === "template" && typeof parsed.content.locale === "string" && Array.isArray(parsed.content.parameters) && parsed.content.parameters.every((item) => typeof item === "string")) {
    return parsed as unknown as ExternalCommand;
  }
  throw new Error("Invalid external application operation payload.");
}

function isDeterministicRejection(statusCode: number) {
  return statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429;
}

function finalizeOperation(id: string, leaseToken: string, status: "REJECTED") {
  return prisma.externalTransportOperation.updateMany({
    where: { id, status: "SUBMISSION_UNKNOWN", leaseToken },
    data: { status, failedAt: new Date(), leaseToken: null, leaseExpiresAt: null },
  });
}

function rejectPendingOperation(id: string) {
  return prisma.externalTransportOperation.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", failedAt: new Date() },
  });
}

async function hasOpenConversationWindow(application: ExternalApplicationContext, providerAccountId: string, recipient: string) {
  try {
    return await hasActiveExternalWhatsAppConversationWindow({
      organizationId: application.organizationId,
      applicationId: application.id,
      providerAccountId,
      recipient,
    });
  } catch {
    // A failed lookup must never permit a free-form WhatsApp command.
    return false;
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
