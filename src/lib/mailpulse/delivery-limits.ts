import type { CommunicationChannel } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { checkEmailLimit, type PlanTier } from "@/lib/plans";

const API_RATE_WINDOW_MS = 60_000;
const API_RATE_LIMITS: Record<CommunicationChannel, number> = {
  EMAIL: 60,
  SMS: 30,
  WHATSAPP: 30,
};

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
  const sentInWindow = await prisma.communicationMessage.count({
    where: {
      organizationId: params.organizationId,
      channel: params.channel,
      origin: "API",
      createdAt: { gte: since },
    },
  });
  if (sentInWindow >= API_RATE_LIMITS[params.channel]) {
    return { allowed: false as const, reason: "rate_limit" as const, retryAfter: 60 };
  }

  return { allowed: true as const };
}
