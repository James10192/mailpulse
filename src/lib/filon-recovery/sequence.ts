import { prisma } from "@/lib/prisma";
import type { FilonRecoveryPayload } from "./schemas";
import { createOrUpdateFilonContact, getOrganizationOwnerId } from "./contacts";
import { defaultRecoveryTemplate, type RecoveryTemplateKey } from "./templates";
import { serializeFilonRecoveryStatus } from "./status";

const DEFAULT_STEPS: Array<{
  offsetDays: number;
  channel: "EMAIL" | "WHATSAPP" | "HUMAN_ACTION";
  templateKey: RecoveryTemplateKey;
}> = [
  { offsetDays: 0, channel: "EMAIL", templateKey: "filon_invoice_confirmation" },
  { offsetDays: 3, channel: "EMAIL", templateKey: "filon_soft_email" },
  { offsetDays: 7, channel: "WHATSAPP", templateKey: "filon_short_whatsapp" },
  { offsetDays: 10, channel: "EMAIL", templateKey: "filon_firm_email" },
  { offsetDays: 14, channel: "HUMAN_ACTION", templateKey: "filon_human_action" },
];

function scheduledAt(base: Date, offsetDays: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

export async function createOrGetFilonRecovery(params: {
  organizationId: string;
  companyName?: string;
  payload: FilonRecoveryPayload;
}) {
  const existing = await prisma.filonRecovery.findUnique({
    where: {
      organizationId_filonOpportunityId: {
        organizationId: params.organizationId,
        filonOpportunityId: params.payload.opportunityId,
      },
    },
    include: { steps: { orderBy: { position: "asc" } } },
  });

  if (existing) return serializeFilonRecoveryStatus(existing);

  const userId = await getOrganizationOwnerId(params.organizationId);
  if (!userId) {
    throw new Error("Aucun proprietaire MailPulse trouve pour cette organisation.");
  }

  const contact = await createOrUpdateFilonContact({
    organizationId: params.organizationId,
    userId,
    payload: params.payload,
  });

  const now = new Date();
  const nextReminderAt = scheduledAt(now, DEFAULT_STEPS[0].offsetDays);
  const recovery = await prisma.filonRecovery.create({
    data: {
      organizationId: params.organizationId,
      contactId: contact.id,
      filonOpportunityId: params.payload.opportunityId,
      externalWorkspaceId: params.payload.workspaceId ?? null,
      externalUserId: params.payload.userId ?? null,
      opportunityTitle: params.payload.opportunityTitle,
      amountDue: params.payload.amountDue,
      currency: params.payload.currency,
      dueDate: params.payload.dueDate,
      clientName: params.payload.clientName,
      clientEmail: params.payload.clientEmail.toLowerCase().trim(),
      clientPhone: params.payload.clientPhone || null,
      status: "PENDING",
      nextReminderAt,
      steps: {
        create: DEFAULT_STEPS.map((step, index) => {
          const template = defaultRecoveryTemplate(step.templateKey, {
            ...params.payload,
            companyName: params.companyName,
          });
          return {
            position: index,
            offsetDays: step.offsetDays,
            channel: step.channel,
            templateKey: step.templateKey,
            subject: template.subject ?? null,
            body: template.body,
            scheduledAt: scheduledAt(now, step.offsetDays),
            status: "PREPARED",
          };
        }),
      },
    },
    include: { steps: { orderBy: { position: "asc" } } },
  });

  return serializeFilonRecoveryStatus(recovery);
}
