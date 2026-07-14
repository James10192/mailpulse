import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { sendWhatsApp } from "@/lib/whatsapp";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";

const DEFAULT_BATCH_SIZE = 25;

type StepStatus = "PENDING" | "PREPARED" | "SENT" | "SKIPPED" | "FAILED" | "CANCELLED";

type RunnerStats = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  humanActions: number;
  durationMs: number;
};

type RecoveryStep = Awaited<ReturnType<typeof loadDueSteps>>[number];

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isRunnableStatus(status: StepStatus) {
  return status === "PREPARED" || status === "PENDING";
}

function managedWhatsAppConfig() {
  if (process.env.MAILPULSE_MANAGED_WHATSAPP_ENABLED !== "true") return null;
  const mode = process.env.MAILPULSE_MANAGED_WHATSAPP_MODE === "META" ? "META" : "BAILEYS";

  if (mode === "META") {
    return {
      whatsappEnabled: true,
      whatsappMode: "META" as const,
      whatsappPhone: process.env.MAILPULSE_MANAGED_WHATSAPP_PHONE ?? null,
      evoInstanceName: null,
      evoInstanceStatus: null,
      metaWabaId: process.env.MAILPULSE_MANAGED_META_WABA_ID ?? null,
      metaPhoneNumberId: process.env.MAILPULSE_MANAGED_META_PHONE_NUMBER_ID ?? null,
      metaAccessToken: process.env.MAILPULSE_MANAGED_META_ACCESS_TOKEN ?? null,
    };
  }

  return {
    whatsappEnabled: true,
    whatsappMode: "BAILEYS" as const,
    whatsappPhone: process.env.MAILPULSE_MANAGED_WHATSAPP_PHONE ?? null,
    evoInstanceName: process.env.MAILPULSE_MANAGED_WHATSAPP_INSTANCE_NAME ?? null,
    evoInstanceStatus: "open",
    metaWabaId: null,
    metaPhoneNumberId: null,
    metaAccessToken: null,
  };
}

async function loadDueSteps(now: Date, limit: number) {
  return prisma.filonRecoveryStep.findMany({
    where: {
      status: { in: ["PREPARED", "PENDING"] },
      scheduledAt: { lte: now },
      recovery: {
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    },
    orderBy: [{ scheduledAt: "asc" }, { position: "asc" }],
    take: limit,
    include: {
      recovery: {
        include: {
          contact: { select: { email: true, phone: true } },
          organization: {
            select: {
              id: true,
              name: true,
              plan: true,
              whatsappEnabled: true,
              whatsappMode: true,
              whatsappPhone: true,
              evoInstanceName: true,
              evoInstanceStatus: true,
              metaWabaId: true,
              metaPhoneNumberId: true,
              metaAccessToken: true,
              domains: {
                where: { verified: true },
                orderBy: { verifiedAt: "desc" },
                take: 1,
                select: { domain: true },
              },
              senders: {
                orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
                select: { email: true, name: true },
              },
            },
          },
        },
      },
    },
  });
}

async function reserveStep(step: RecoveryStep) {
  const result = await prisma.filonRecoveryStep.updateMany({
    where: {
      id: step.id,
      status: { in: ["PREPARED", "PENDING"] },
    },
    data: {
      status: "PENDING",
      errorMessage: null,
    },
  });

  return result.count === 1;
}

function resolveFromAddress(step: RecoveryStep) {
  const org = step.recovery.organization;
  const verifiedDomain = org.domains[0]?.domain;
  const verifiedSender = verifiedDomain
    ? org.senders.find((sender) => sender.email.endsWith(`@${verifiedDomain}`))
    : null;

  if (verifiedSender) return `${verifiedSender.name} <${verifiedSender.email}>`;
  if (verifiedDomain) return `${org.name} <noreply@${verifiedDomain}>`;
  if (process.env.MAILPULSE_MANAGED_FROM_EMAIL) return process.env.MAILPULSE_MANAGED_FROM_EMAIL;

  throw new Error("Aucun domaine email vérifié. Configurez un domaine ou activez l'expéditeur MailPulse.");
}

async function sendEmailStep(step: RecoveryStep) {
  if (!step.subject) {
    throw new Error("Sujet email manquant pour cette relance.");
  }

  await sendEmail({
    to: step.recovery.clientEmail,
    from: resolveFromAddress(step),
    subject: step.subject,
    html: step.body,
    text: stripHtml(step.body),
    tags: [
      { name: "source", value: "filon_recovery" },
      { name: "recovery_id", value: step.recoveryId },
      { name: "step_id", value: step.id },
    ],
  });
}

function resolveWhatsAppTarget(step: RecoveryStep) {
  const phone = step.recovery.clientPhone || step.recovery.contact.phone;
  if (!phone) throw new Error("Numéro WhatsApp client manquant.");
  return phone;
}

function resolveWhatsAppOrg(step: RecoveryStep) {
  const org = step.recovery.organization;
  if (org.whatsappEnabled) return org;

  const managed = managedWhatsAppConfig();
  if (managed) return managed;

  throw new Error("WhatsApp non configuré. Connectez Meta Cloud API, scannez un QR code Baileys ou activez le numéro MailPulse.");
}

async function sendWhatsAppStep(step: RecoveryStep) {
  await sendWhatsApp(resolveWhatsAppOrg(step), resolveWhatsAppTarget(step), step.body);
}

async function markStepSuccess(step: RecoveryStep, now: Date, status: StepStatus = "SENT") {
  const nextStep = await findNextStep(step);

  await prisma.$transaction([
    prisma.filonRecoveryStep.update({
      where: { id: step.id },
      data: { status, sentAt: now, errorMessage: null },
    }),
    prisma.filonRecovery.update({
      where: { id: step.recoveryId },
      data: {
        status: "ACTIVE",
        lastReminderAt: now,
        nextReminderAt: nextStep?.scheduledAt ?? null,
      },
    }),
  ]);
}

async function findNextStep(step: RecoveryStep) {
  return prisma.filonRecoveryStep.findFirst({
    where: {
      recoveryId: step.recoveryId,
      status: { in: ["PREPARED", "PENDING"] },
      id: { not: step.id },
    },
    orderBy: [{ scheduledAt: "asc" }, { position: "asc" }],
    select: { scheduledAt: true },
  });
}

async function markStepFailure(step: RecoveryStep, error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur inconnue pendant la relance.";
  const nextStep = await findNextStep(step);
  await prisma.$transaction([
    prisma.filonRecoveryStep.update({
      where: { id: step.id },
      data: { status: "FAILED", errorMessage: message },
    }),
    prisma.filonRecovery.update({
      where: { id: step.recoveryId },
      data: {
        status: "FAILED",
        nextReminderAt: nextStep?.scheduledAt ?? null,
      },
    }),
  ]);
}

async function processStep(step: RecoveryStep, now: Date) {
  if (!isRunnableStatus(step.status as StepStatus)) return "skipped" as const;
  if (!canAccessFeature(step.recovery.organization.plan as PlanTier, "recoveries")) return "skipped" as const;
  if (!(await reserveStep(step))) return "skipped" as const;

  if (step.channel === "HUMAN_ACTION") {
    await markStepSuccess(step, now, "SENT");
    return "human" as const;
  }

  try {
    if (step.channel === "EMAIL") await sendEmailStep(step);
    if (step.channel === "WHATSAPP") await sendWhatsAppStep(step);
    await markStepSuccess(step, now);
    return "sent" as const;
  } catch (error) {
    await markStepFailure(step, error);
    return "failed" as const;
  }
}

export async function runFilonRecoveryDueSteps(limit = DEFAULT_BATCH_SIZE): Promise<RunnerStats> {
  const startedAt = Date.now();
  const now = new Date();
  const steps = await loadDueSteps(now, limit);
  const stats: RunnerStats = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    humanActions: 0,
    durationMs: 0,
  };

  for (const step of steps) {
    stats.processed++;
    const result = await processStep(step, now);
    if (result === "sent") stats.sent++;
    if (result === "failed") stats.failed++;
    if (result === "skipped") stats.skipped++;
    if (result === "human") stats.humanActions++;
  }

  stats.durationMs = Date.now() - startedAt;
  return stats;
}
