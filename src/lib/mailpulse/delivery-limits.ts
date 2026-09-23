import type { CommunicationChannel } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { checkEmailLimit, type PlanTier } from "@/lib/plans";
import { API_RATE_LIMITS, API_RATE_WINDOW_MS } from "./api-rate-limits";

/**
 * Verification codes leave from the same WhatsApp number as API messages, so
 * they count against the same rate: a burst of either puts that number at risk.
 */
async function countApiSends(organizationId: string, channel: CommunicationChannel, since: Date) {
  const [messages, verifications] = await Promise.all([
    prisma.communicationMessage.count({
      where: { organizationId, channel, origin: "API", createdAt: { gte: since } },
    }),
    channel === "WHATSAPP"
      ? prisma.phoneVerification.count({ where: { organizationId, createdAt: { gte: since } } })
      : Promise.resolve(0),
  ]);
  return messages + verifications;
}

export async function enforceApiMessageLimits(params: {
  organizationId: string;
  plan: PlanTier;
  channel: CommunicationChannel;
}) {
  if (params.channel === "EMAIL") {
    const quota = await checkEmailLimit(params.organizationId, params.plan);
    if (!quota.allowed) return { allowed: false as const, reason: "quota" as const, retryAfter: 60 };
  }

  const since = new Date(Date.now() - API_RATE_WINDOW_MS);
  const sentInWindow = await countApiSends(params.organizationId, params.channel, since);
  if (sentInWindow >= API_RATE_LIMITS[params.channel]) {
    return { allowed: false as const, reason: "rate_limit" as const, retryAfter: 60 };
  }

  return { allowed: true as const };
}
