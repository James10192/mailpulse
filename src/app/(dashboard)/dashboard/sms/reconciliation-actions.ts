"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/types/action-state";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { syncSmsCampaignProgressInTransaction } from "@/lib/sms/queue";

const reconciliationSchema = z.object({
  resourceId: z.string().cuid(),
  resourceType: z.enum(["external_transport_operation", "communication_message_sms", "communication_message"]),
  applicationId: z.preprocess((value) => value === "" ? undefined : value, z.string().cuid().optional()),
  decision: z.enum(["NO_FURTHER_ACTION", "EXTERNAL_FOLLOW_UP", "DUPLICATE_CONFIRMED"]),
});

const unknownStatusByResourceType = {
  external_transport_operation: "SUBMISSION_UNKNOWN",
  communication_message_sms: "SUBMISSION_UNKNOWN",
  communication_message: "SUBMISSION_UNKNOWN",
} as const;

export async function closeReconciliationItem(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reconciliationSchema.safeParse({
    resourceId: formData.get("resourceId"),
    resourceType: formData.get("resourceType"),
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return { error: "La décision de réconciliation est invalide." };

  const { user, org, isAdmin, memberRole } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Votre session a expiré." };
  if (!isAdmin && memberRole !== "owner") return { error: "Cette action est réservée aux administrateurs." };

  const { resourceId, resourceType, applicationId, decision } = parsed.data;
  if (resourceType === "external_transport_operation" && !applicationId) {
    return { error: "L'application cliente est invalide." };
  }
  const reviewedAt = new Date();
  const isExternalFollowUp = decision === "EXTERNAL_FOLLOW_UP";
  const terminalStatus = decision === "DUPLICATE_CONFIRMED" ? "DUPLICATE_CONFIRMED" as const : "RECONCILED" as const;
  const statusAfterReview = isExternalFollowUp ? unknownStatusByResourceType[resourceType] : terminalStatus;
  const closed = await prisma.$transaction(async (tx) => {
    const reconciliationData = isExternalFollowUp
      ? {
          reconciliationDecision: decision,
          reconciliationFollowUpAt: reviewedAt,
          reconciliationFollowUpById: user.id,
        }
      : {
          status: terminalStatus,
          reconciliationDecision: decision,
          reconciledAt: reviewedAt,
          reconciledById: user.id,
        };

    const transition = resourceType === "communication_message_sms"
      ? await tx.communicationMessage.updateMany({
          where: { id: resourceId, organizationId: org.id, channel: "SMS", status: unknownStatusByResourceType.communication_message_sms },
          data: reconciliationData,
        })
      : resourceType === "communication_message"
        ? await tx.communicationMessage.updateMany({
            where: { id: resourceId, organizationId: org.id, channel: { not: "SMS" }, status: unknownStatusByResourceType.communication_message },
            data: reconciliationData,
          })
        : await tx.externalTransportOperation.updateMany({
            where: {
              id: resourceId,
              organizationId: org.id,
              applicationId: applicationId!,
              status: unknownStatusByResourceType.external_transport_operation,
              application: { is: { organizationId: org.id, active: true } },
            },
            data: { ...reconciliationData, leaseToken: null, leaseExpiresAt: null },
          });

    if (transition.count === 0) return false;
    if (resourceType === "communication_message_sms" && !isExternalFollowUp) {
      const message = await tx.communicationMessage.findUniqueOrThrow({ where: { id: resourceId } });
      await syncSmsCampaignProgressInTransaction(tx, message);
    }

    await tx.auditLog.create({
      data: {
        actorType: "user",
        actorId: user.id,
        action: reconciliationAuditAction(resourceType),
        resourceType,
        resourceId,
        metadata: {
          decision,
          outcome: isExternalFollowUp ? "follow_up_recorded" : decision === "DUPLICATE_CONFIRMED" ? "duplicate_suppressed" : "resolved_without_further_action",
          statusAfterReview,
        },
        organizationId: org.id,
      },
    });
    return true;
  }, { isolationLevel: "Serializable" });

  if (!closed) return { error: "Cet élément n'est plus dans un état incertain." };

  revalidatePath("/dashboard/sms");
  return { success: true };
}

function reconciliationAuditAction(resourceType: keyof typeof unknownStatusByResourceType) {
  if (resourceType === "communication_message_sms") return "SMS_RECONCILIATION_CLOSED";
  if (resourceType === "communication_message") return "MESSAGE_RECONCILIATION_CLOSED";
  return "EXTERNAL_TRANSPORT_RECONCILIATION_CLOSED";
}
