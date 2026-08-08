import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SettingsPageFrame } from "../settings-page-frame";
import { ExternalApplicationsClient } from "./external-applications-client";
import { BAILEYS_PROVIDER, META_PROVIDER } from "./guards";
import type { ApplicationView, CredentialView, ProviderAccountView } from "./types";

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
        orderBy: { version: "desc" },
        select: {
          id: true,
          purpose: true,
          keyId: true,
          version: true,
          createdAt: true,
          revokedAt: true,
          expiresAt: true,
        },
      },
      providerAccounts: {
        where: { channel: "WHATSAPP", provider: { in: [META_PROVIDER, BAILEYS_PROVIDER] } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          provider: true,
          externalAccountId: true,
          senderId: true,
          active: true,
          updatedAt: true,
        },
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
    const commandCredentials = application.credentials.filter((credential) => credential.purpose === "COMMAND_INGRESS");
    const providerAccounts: ProviderAccountView[] = application.providerAccounts.map((account) => ({
      id: account.id,
      transport: account.provider === BAILEYS_PROVIDER ? "BAILEYS" : "META",
      externalAccountId: account.externalAccountId,
      maskedSenderId: maskIdentifier(account.senderId),
      active: account.active,
      updatedAt: account.updatedAt.toISOString(),
    }));
    // A second active account is refused on write, so the first one is the
    // transport actually in use.
    const activeAccount = providerAccounts.find((account) => account.active) ?? null;

    return {
      id: application.id,
      key: application.key,
      name: application.name,
      active: application.active,
      createdAt: application.createdAt.toISOString(),
      activeCredentialCount: commandCredentials.filter(
        (credential) => !credential.revokedAt && (!credential.expiresAt || credential.expiresAt > now),
      ).length,
      credentials: commandCredentials.map(toCredentialView),
      inboundTokens: application.credentials
        .filter((credential) => credential.purpose === "INBOUND_FORWARD")
        .map(toCredentialView),
      providerAccounts,
      activeTransport: activeAccount?.transport ?? null,
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

function toCredentialView(credential: {
  id: string;
  keyId: string;
  version: number;
  createdAt: Date;
  revokedAt: Date | null;
  expiresAt: Date | null;
}): CredentialView {
  return {
    id: credential.id,
    keyId: credential.keyId,
    version: credential.version,
    createdAt: credential.createdAt.toISOString(),
    revokedAt: credential.revokedAt?.toISOString() ?? null,
    expiresAt: credential.expiresAt?.toISOString() ?? null,
  };
}

/** Keeps only the last 4 characters visible, e.g. a Meta phone_number_id. */
function maskIdentifier(value: string | null) {
  if (!value) return null;
  if (value.length <= 4) return value;
  return `••••${value.slice(-4)}`;
}
