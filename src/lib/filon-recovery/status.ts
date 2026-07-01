import type { FilonRecovery, FilonRecoveryStep } from "@/generated/prisma";

type RecoveryWithSteps = FilonRecovery & {
  steps?: FilonRecoveryStep[];
};

function normalizeStatus(status: string) {
  return status.toLowerCase();
}

export function serializeFilonRecoveryStatus(recovery: RecoveryWithSteps) {
  return {
    recoveryId: recovery.id,
    filonOpportunityId: recovery.filonOpportunityId,
    status: normalizeStatus(recovery.status),
    mailpulseContactId: recovery.contactId,
    mailpulseSequenceId: recovery.id,
    lastReminderAt: recovery.lastReminderAt?.toISOString() ?? null,
    nextReminderAt: recovery.nextReminderAt?.toISOString() ?? null,
    prepared: true,
    steps: recovery.steps?.map((step) => ({
      id: step.id,
      position: step.position,
      channel: step.channel.toLowerCase(),
      status: step.status.toLowerCase(),
      scheduledAt: step.scheduledAt.toISOString(),
      subject: step.subject,
      templateKey: step.templateKey,
    })) ?? [],
  };
}
