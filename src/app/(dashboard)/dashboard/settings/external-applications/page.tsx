import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SettingsPageFrame } from "../settings-page-frame";
import { ExternalApplicationsClient } from "./external-applications-client";
import type { ApplicationView } from "./types";

export default async function ExternalApplicationsPage() {
  const { user, org, isAdmin, memberRole } = await getCurrentUserAndOrg();
  if (!user) redirect("/login");
  if (!org) redirect("/dashboard");

  const canManage = isAdmin || memberRole === "owner";
  const now = new Date();

  const applications = await prisma.externalApplication.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      active: true,
      createdAt: true,
      credentials: {
        where: { purpose: "COMMAND_INGRESS" },
        orderBy: { version: "desc" },
        select: { id: true, keyId: true, version: true, createdAt: true, revokedAt: true, expiresAt: true },
      },
      providerAccounts: {
        where: { provider: "META_WHATSAPP", channel: "WHATSAPP" },
        orderBy: { createdAt: "asc" },
        select: { id: true, externalAccountId: true, senderId: true, active: true, updatedAt: true },
      },
      forwardEndpoints: {
        orderBy: { createdAt: "asc" },
        select: { id: true, url: true, keyId: true, events: true, active: true, updatedAt: true },
      },
      templateConfigs: {
        orderBy: [{ operationKey: "asc" }, { locale: "asc" }],
        select: {
          id: true,
          operationKey: true,
          locale: true,
          providerTemplateId: true,
          active: true,
          providerAccountId: true,
        },
      },
    },
  });

  const views: ApplicationView[] = applications.map((application) => {
    const primaryAccount = application.providerAccounts[0] ?? null;

    return {
      id: application.id,
      key: application.key,
      name: application.name,
      active: application.active,
      createdAt: application.createdAt.toISOString(),
      activeCredentialCount: application.credentials.filter(
        (credential) => !credential.revokedAt && (!credential.expiresAt || credential.expiresAt > now),
      ).length,
      credentials: application.credentials.map((credential) => ({
        id: credential.id,
        keyId: credential.keyId,
        version: credential.version,
        createdAt: credential.createdAt.toISOString(),
        revokedAt: credential.revokedAt?.toISOString() ?? null,
        expiresAt: credential.expiresAt?.toISOString() ?? null,
      })),
      providerAccount: primaryAccount
        ? {
            id: primaryAccount.id,
            wabaId: primaryAccount.externalAccountId,
            maskedSenderId: maskIdentifier(primaryAccount.senderId),
            active: primaryAccount.active,
            updatedAt: primaryAccount.updatedAt.toISOString(),
          }
        : null,
      forwardEndpoints: application.forwardEndpoints.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        keyId: endpoint.keyId,
        events: endpoint.events,
        active: endpoint.active,
        updatedAt: endpoint.updatedAt.toISOString(),
      })),
      templateConfigs: application.templateConfigs.map((config) => ({
        id: config.id,
        operationKey: config.operationKey,
        locale: config.locale,
        providerTemplateId: config.providerTemplateId,
        active: config.active,
        scopedToProviderAccount: config.providerAccountId !== null,
      })),
    };
  });

  return (
    <SettingsPageFrame section="externalApplications">
      <ExternalApplicationsClient applications={views} canManage={canManage} />
    </SettingsPageFrame>
  );
}

/** Keeps only the last 4 characters visible, e.g. a Meta phone_number_id. */
function maskIdentifier(value: string | null) {
  if (!value) return null;
  if (value.length <= 4) return value;
  return `••••${value.slice(-4)}`;
}
