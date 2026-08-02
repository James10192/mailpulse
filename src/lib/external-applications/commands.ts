import { randomUUID } from "node:crypto";

import { decryptExternalApplicationValue, encryptExternalApplicationValue, hashExternalApplicationPayload } from "@/lib/external-applications/crypto";
import { resolveMetaProviderAccount, type ExternalApplicationContext, type MetaProviderConfiguration } from "@/lib/external-applications/application";
import { hasActiveExternalWhatsAppConversationWindow } from "@/lib/external-applications/conversation-window";
import { prisma } from "@/lib/prisma";

const LEASE_DURATION_MS = 10 * 60_000;
const META_GRAPH_API = "https://graph.facebook.com/v21.0";

export type ExternalCommand = {
  operationKey: string;
  idempotencyKey: string;
  recipient: string;
  content: { type: "text"; text: string } | { type: "template"; locale: string; parameters: string[] };
};

export async function dispatchExternalApplicationCommand(application: ExternalApplicationContext, command: ExternalCommand) {
  const provider = await resolveMetaProviderAccount(application);
  if (!provider) return { status: "unavailable" as const };

  const serializedPayload = JSON.stringify(command);
  const payloadHash = hashExternalApplicationPayload(serializedPayload);
  const operation = await findOrCreateOperation(application, provider.id, command.operationKey, command.idempotencyKey, serializedPayload, payloadHash);
  if (operation.payloadHash !== payloadHash) return { status: "conflict" as const, operationId: operation.id };
  if (operation.status === "ACCEPTED") return { status: "accepted" as const, operationId: operation.id };
  if (operation.status === "REJECTED") return { status: "rejected" as const, operationId: operation.id };
  if (operation.status === "SUBMISSION_UNKNOWN") return { status: "submission_unknown" as const, operationId: operation.id };

  if (command.content.type === "text") {
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
    const result = await submitMetaCommand(application, provider, payload);
    if (!result.ok) {
      if (isDeterministicRejection(result.statusCode)) {
        await finalizeOperation(operation.id, leaseToken, "REJECTED");
        return { status: "rejected" as const, operationId: operation.id };
      }
      return { status: "submission_unknown" as const, operationId: operation.id };
    }
    const accepted = await prisma.externalTransportOperation.updateMany({
      where: { id: operation.id, status: "SUBMISSION_UNKNOWN", leaseToken },
      data: { status: "ACCEPTED", acceptedAt: new Date(), providerMessageId: result.messageId, leaseToken: null, leaseExpiresAt: null },
    });
    return accepted.count === 1
      ? { status: "accepted" as const, operationId: operation.id }
      : { status: "submission_unknown" as const, operationId: operation.id };
  } catch {
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

async function submitMetaCommand(application: ExternalApplicationContext, provider: MetaProviderConfiguration, command: ExternalCommand) {
  const body = await metaRequestBody(application, provider.id, command);
  const response = await fetch(`${META_GRAPH_API}/${provider.senderId}/messages`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", authorization: `Bearer ${provider.accessToken}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return { ok: false as const, statusCode: response.status };
  const parsed: unknown = await response.json();
  const messageId = isRecord(parsed) && Array.isArray(parsed.messages) && isRecord(parsed.messages[0]) && typeof parsed.messages[0].id === "string"
    ? parsed.messages[0].id
    : null;
  return { ok: true as const, messageId };
}

async function metaRequestBody(application: ExternalApplicationContext, providerAccountId: string, command: ExternalCommand) {
  const to = command.recipient.replace(/^\+/, "");
  if (command.content.type === "text") {
    return { messaging_product: "whatsapp", to, type: "text", text: { body: command.content.text } };
  }
  let template = await prisma.applicationTemplateConfig.findFirst({
    where: {
      applicationId: application.id,
      operationKey: command.operationKey,
      locale: command.content.locale,
      active: true,
      providerAccountId,
    },
    select: { providerTemplateId: true },
  });
  if (!template) {
    template = await prisma.applicationTemplateConfig.findFirst({
      where: {
        applicationId: application.id,
        operationKey: command.operationKey,
        locale: command.content.locale,
        active: true,
        providerAccountId: null,
      },
      select: { providerTemplateId: true },
    });
  }
  if (!template) throw new Error("No active external application template configuration.");
  const parameters = command.content.parameters.map((text) => ({ type: "text", text }));
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template.providerTemplateId,
      language: { code: command.content.locale },
      ...(parameters.length > 0 ? { components: [{ type: "body", parameters }] } : {}),
    },
  };
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
