import { redirect } from "next/navigation";

import { canManageOrganization } from "@/lib/access/roles";
import { APPLICATION_WHATSAPP_ACCOUNTS, chooseWhatsAppSender, senderAccountLabel } from "@/lib/messaging/whatsapp-sender";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SENDER_WARMUP_MS } from "@/lib/verifications/policy";
import { isConfigured } from "@/lib/whatsapp-baileys";
import { NumbersClient, type ApplicationNumbers } from "./numbers-client";

export default async function WhatsAppNumbersPage() {
  const { user, org, memberRole, isPlatformAdmin } = await getCurrentUserAndOrg();
  if (!user) redirect("/login");
  if (!org) redirect("/dashboard");

  const planAllows = canAccessFeature(org.plan as PlanTier, "whatsapp");
  const canManage = planAllows && canManageOrganization({ memberRole, isPlatformAdmin });

  const { organization, view } = await loadNumbers(org.id);

  return (
    <NumbersClient
      applications={view}
      organizationNumber={{
        enabled: organization?.whatsappEnabled ?? false,
        connected: organization?.whatsappMode === "META" || organization?.evoInstanceStatus === "open",
        mode: organization?.whatsappMode ?? "BAILEYS",
      }}
      canManage={canManage}
      planAllows={planAllows}
      pairingAvailable={isConfigured()}
    />
  );
}

/** Outside the component: the warm-up window is measured against the clock. */
async function loadNumbers(organizationId: string) {
  const [organization, applications] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whatsappEnabled: true, whatsappMode: true, whatsappPhone: true, evoInstanceStatus: true },
    }),
    prisma.externalApplication.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        key: true,
        name: true,
        providerAccounts: {
          where: APPLICATION_WHATSAPP_ACCOUNTS.where,
          orderBy: { createdAt: "asc" },
          select: { ...APPLICATION_WHATSAPP_ACCOUNTS.select, createdAt: true },
        },
      },
    }),
  ]);

  const now = Date.now();
  const view: ApplicationNumbers[] = applications.map((application) => {
    const speaking = chooseWhatsAppSender(application.providerAccounts);
    return {
      id: application.id,
      key: application.key,
      name: application.name,
      // Several active numbers and none chosen: nothing leaves until one is.
      blocked: speaking.kind === "unavailable",
      numbers: application.providerAccounts.map((account) => {
        const warmupEnds = account.pairedAt ? account.pairedAt.getTime() + SENDER_WARMUP_MS : null;
        return {
          id: account.id,
          // Masked unless named: every member sees this page.
          label: senderAccountLabel(account),
          named: Boolean(account.label),
          transport: account.provider === "META_WHATSAPP" ? "META" : "BAILEYS",
          active: account.active,
          speaking: speaking.kind === "account" && speaking.account.id === account.id,
          warmupUntil: warmupEnds && warmupEnds > now ? new Date(warmupEnds).toISOString() : null,
        };
      }),
    };
  });

  return { organization, view };
}
