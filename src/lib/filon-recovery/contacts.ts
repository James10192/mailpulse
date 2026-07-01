import { prisma } from "@/lib/prisma";
import type { FilonRecoveryPayload } from "./schemas";

function splitClientName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

export async function getOrganizationOwnerId(organizationId: string) {
  const member = await prisma.member.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  return member?.userId ?? null;
}

export async function createOrUpdateFilonContact(params: {
  organizationId: string;
  userId: string;
  payload: FilonRecoveryPayload;
}) {
  const email = params.payload.clientEmail.toLowerCase().trim();
  const names = splitClientName(params.payload.clientName);
  const metadata = {
    source: "filon",
    filonOpportunityId: params.payload.opportunityId,
    opportunityTitle: params.payload.opportunityTitle,
  };

  return prisma.contact.upsert({
    where: {
      email_organizationId: {
        email,
        organizationId: params.organizationId,
      },
    },
    update: {
      firstName: names.firstName,
      lastName: names.lastName,
      phone: params.payload.clientPhone || undefined,
      source: "filon",
      metadata,
    },
    create: {
      email,
      firstName: names.firstName,
      lastName: names.lastName,
      phone: params.payload.clientPhone || null,
      source: "filon",
      metadata,
      organizationId: params.organizationId,
      userId: params.userId,
    },
  });
}
