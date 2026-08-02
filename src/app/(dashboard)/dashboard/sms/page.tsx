import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import {
  isOrangeSmsSenderAddress,
  orangeSmsDeliveryReceiptConfiguration,
  orangeSmsSenderAddressFromEnvironment,
} from "@/lib/sms/orange-config";
import { presentSmsHistoryMessage } from "@/lib/sms/message-privacy";
import { SmsDashboard } from "./sms-dashboard";

const reconciliationResourceTypes = ["external_transport_operation", "communication_message_sms", "communication_message"] as const;
const reconciliationDecisions = ["NO_FURTHER_ACTION", "EXTERNAL_FOLLOW_UP", "DUPLICATE_CONFIRMED"] as const;

type ReconciliationItem = {
  id: string;
  resourceType: (typeof reconciliationResourceTypes)[number];
  status: "FORWARD_UNKNOWN" | "SUBMISSION_UNKNOWN";
  applicationId: string | null;
  applicationName: string | null;
  direction: "INBOUND" | "OUTBOUND" | null;
  operationKey: string | null;
  createdAt: string;
  reviewedAt: string | null;
  decision: (typeof reconciliationDecisions)[number] | null;
};

export default async function SmsPage() {
  const { user, org, isAdmin, memberRole } = await getCurrentUserAndOrg();
  if (!user) redirect("/login");
  if (!org) redirect("/dashboard");

  const messageWhere = { organizationId: org.id, channel: "SMS" as const };
  const canReconcile = isAdmin || memberRole === "owner";
  const canAccessSensitiveContent = isAdmin || memberRole === "owner";
  const [messages, queued, processing, delivered, failed, phoneContacts, smsOrganization, reconciliation] = await Promise.all([
    prisma.communicationMessage.findMany({
      where: messageWhere,
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        recipientValue: true,
        text: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
      },
    }),
    prisma.communicationMessage.count({ where: { ...messageWhere, status: { in: ["QUEUED", "RETRYING"] } } }),
    prisma.communicationMessage.count({ where: { ...messageWhere, status: "PROCESSING" } }),
    prisma.communicationMessage.count({ where: { ...messageWhere, status: "DELIVERED" } }),
    prisma.communicationMessage.count({ where: { ...messageWhere, status: { in: ["FAILED", "SUBMISSION_UNKNOWN"] } } }),
    prisma.contact.count({ where: { organizationId: org.id, subscribed: true, phone: { not: null } } }),
    prisma.organization.findUnique({
      where: { id: org.id },
      select: { smsEnabled: true, smsProvider: true, smsSenderAddress: true, smsSenderName: true },
    }),
    canReconcile ? getReconciliationItems(org.id) : Promise.resolve(null),
  ]);

  const configuredSenderAddress = getConfiguredSenderAddress();
  const senderAddressConfigured = Boolean(
    smsOrganization?.smsSenderAddress
      && isOrangeSmsSenderAddress(smsOrganization.smsSenderAddress)
      && smsOrganization.smsSenderAddress === configuredSenderAddress,
  );
  const providerConfigured = Boolean(smsOrganization?.smsEnabled && smsOrganization.smsProvider && senderAddressConfigured);
  const deliveryReceiptConfiguration = orangeSmsDeliveryReceiptConfiguration();
  const adminConfiguration = isAdmin || memberRole === "owner"
    ? {
        providerConfigured,
        enabled: smsOrganization?.smsEnabled ?? false,
        credentialsConfigured: Boolean(process.env.ORANGE_SMS_CLIENT_ID && process.env.ORANGE_SMS_CLIENT_SECRET),
        ownerAuthorized: process.env.ORANGE_SMS_OWNER_ORGANIZATION_ID === org.id,
        senderAddressConfigured,
        deliveryReceiptSubscriptionConfirmed: deliveryReceiptConfiguration.subscriptionConfirmed,
        deliveryReceiptCallbackConfigured: deliveryReceiptConfiguration.callbackConfigured,
        deliveryTrackingEnabled: deliveryReceiptConfiguration.trackingEnabled,
        senderAddress: smsOrganization?.smsSenderAddress ?? null,
        senderName: smsOrganization?.smsSenderName ?? null,
      }
    : null;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "SMS" }]} />
      <SmsDashboard
        providerConfigured={providerConfigured}
        deliveryTrackingEnabled={deliveryReceiptConfiguration.trackingEnabled}
        phoneContacts={phoneContacts}
        queue={{ queued, processing, delivered, failed }}
        adminConfiguration={adminConfiguration}
        reconciliation={reconciliation}
        messages={messages.map((message) => {
          const safeMessage = presentSmsHistoryMessage(message, canAccessSensitiveContent);
          return {
            ...safeMessage,
            createdAt: safeMessage.createdAt.toISOString(),
            sentAt: safeMessage.sentAt?.toISOString() ?? null,
            deliveredAt: safeMessage.deliveredAt?.toISOString() ?? null,
          };
        })}
      />
    </>
  );
}

function getConfiguredSenderAddress() {
  try {
    return orangeSmsSenderAddressFromEnvironment();
  } catch {
    return null;
  }
}

async function getReconciliationItems(organizationId: string): Promise<ReconciliationItem[]> {
  const applications = await prisma.externalApplication.findMany({
    where: { organizationId, active: true },
    select: { id: true },
  });
  const applicationIds = applications.map((application) => application.id);
  const [smsMessages, providerMessages, externalOperations] = await Promise.all([
    prisma.communicationMessage.findMany({
      where: { organizationId, channel: "SMS", status: "SUBMISSION_UNKNOWN" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true, createdAt: true },
    }),
    prisma.communicationMessage.findMany({
      where: { organizationId, channel: { not: "SMS" }, status: "SUBMISSION_UNKNOWN" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true, createdAt: true },
    }),
    applicationIds.length > 0
      ? prisma.externalTransportOperation.findMany({
          where: {
            organizationId,
            applicationId: { in: applicationIds },
            status: "SUBMISSION_UNKNOWN",
            application: { is: { organizationId, active: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 50,
          select: {
            id: true,
            createdAt: true,
            direction: true,
            operationKey: true,
            applicationId: true,
            application: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const resourceIds = [...smsMessages, ...providerMessages, ...externalOperations].map((item) => item.id);
  if (resourceIds.length === 0) return [];

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      action: { in: ["CHATBOT_RECONCILIATION_CLOSED", "SMS_RECONCILIATION_CLOSED", "MESSAGE_RECONCILIATION_CLOSED", "EXTERNAL_TRANSPORT_RECONCILIATION_CLOSED"] },
      OR: [
        { resourceType: "communication_message_sms", resourceId: { in: resourceIds } },
        { resourceType: "communication_message", resourceId: { in: resourceIds } },
        { resourceType: "external_transport_operation", resourceId: { in: resourceIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { resourceId: true, resourceType: true, metadata: true, createdAt: true },
  });

  const reviews = new Map<string, { decision: ReconciliationItem["decision"]; reviewedAt: string }>();
  for (const auditLog of auditLogs) {
    if (!auditLog.resourceId || !isReconciliationResourceType(auditLog.resourceType)) continue;
    const key = `${auditLog.resourceType}:${auditLog.resourceId}`;
    if (reviews.has(key)) continue;
    reviews.set(key, { decision: getDecision(auditLog.metadata), reviewedAt: auditLog.createdAt.toISOString() });
  }

  return [
    ...smsMessages.map((item) => toReconciliationItem(item, "communication_message_sms", "SUBMISSION_UNKNOWN", reviews)),
    ...providerMessages.map((item) => toReconciliationItem(item, "communication_message", "SUBMISSION_UNKNOWN", reviews)),
    ...externalOperations.map((item) => toReconciliationItem(
      item,
      "external_transport_operation",
      "SUBMISSION_UNKNOWN",
      reviews,
      { applicationId: item.applicationId, applicationName: item.application.name, direction: item.direction, operationKey: item.operationKey },
    )),
  ];
}

function toReconciliationItem(
  item: { id: string; createdAt: Date },
  resourceType: ReconciliationItem["resourceType"],
  status: ReconciliationItem["status"],
  reviews: Map<string, { decision: ReconciliationItem["decision"]; reviewedAt: string }>,
  details: Pick<ReconciliationItem, "applicationId" | "applicationName" | "direction" | "operationKey"> = {
    applicationId: null,
    applicationName: null,
    direction: null,
    operationKey: null,
  },
): ReconciliationItem {
  const review = reviews.get(`${resourceType}:${item.id}`);
  return {
    id: item.id,
    resourceType,
    status,
    ...details,
    createdAt: item.createdAt.toISOString(),
    reviewedAt: review?.reviewedAt ?? null,
    decision: review?.decision ?? null,
  };
}

function isReconciliationResourceType(value: string): value is ReconciliationItem["resourceType"] {
  return reconciliationResourceTypes.includes(value as ReconciliationItem["resourceType"]);
}

function getDecision(metadata: unknown): ReconciliationItem["decision"] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const decision = (metadata as Record<string, unknown>).decision;
  if (typeof decision !== "string") return null;
  return reconciliationDecisions.includes(decision as (typeof reconciliationDecisions)[number])
    ? decision as ReconciliationItem["decision"]
    : null;
}
