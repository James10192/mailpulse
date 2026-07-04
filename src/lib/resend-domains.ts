import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

type SyncableSendingDomain = {
  id: string;
  status: string;
  resendDomainId: string | null;
  spfRecord: string | null;
  spfStatus: string | null;
  dkimRecord: string | null;
  dkimName: string | null;
  dkimStatus: string | null;
  region: string;
  verifiedAt?: Date | null;
};

type ResendDnsRecord = {
  record?: string;
  name?: string;
  type?: string;
  value?: string;
  status?: string;
};

type ResendDomainPayload = {
  status?: string | null;
  region?: string | null;
  records?: ResendDnsRecord[] | null;
};

type SyncOptions = {
  triggerVerify?: boolean;
  attempts?: number;
  delayMs?: number;
};

const VERIFIED_STATUS = "verified";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findRecord(records: ResendDnsRecord[], record: string, type: string) {
  return records.find((item) => item.record === record && item.type === type)
    ?? records.find((item) => item.record === record);
}

function buildDomainUpdate(domain: SyncableSendingDomain, payload: ResendDomainPayload) {
  const records = payload.records ?? [];
  const spfRecord = findRecord(records, "SPF", "TXT");
  const dkimRecord = findRecord(records, "DKIM", "TXT");
  const status = payload.status ?? domain.status;
  const isVerified = status === VERIFIED_STATUS;

  return {
    status,
    verified: isVerified,
    spfRecord: spfRecord?.value ?? domain.spfRecord,
    spfStatus: spfRecord?.status ?? domain.spfStatus,
    dkimRecord: dkimRecord?.value ?? domain.dkimRecord,
    dkimName: dkimRecord?.name ?? domain.dkimName,
    dkimStatus: dkimRecord?.status ?? domain.dkimStatus,
    region: payload.region ?? domain.region,
    verifiedAt: isVerified ? domain.verifiedAt ?? new Date() : null,
  };
}

async function getResendDomain(resendDomainId: string) {
  const { data, error } = await resend.domains.get(resendDomainId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function syncSendingDomainFromResend<T extends SyncableSendingDomain>(
  domain: T,
  options: SyncOptions = {}
) {
  return syncDomain(domain, options);
}

async function syncDomain<T extends SyncableSendingDomain>(
  domain: T,
  options: SyncOptions
): Promise<T> {
  if (!domain.resendDomainId) return domain;

  if (options.triggerVerify) {
    const { error } = await resend.domains.verify(domain.resendDomainId);
    if (error) throw new Error(error.message);
  }

  const attempts = Math.max(options.attempts ?? 1, 1);
  const delayMs = options.delayMs ?? 1200;
  let payload = await getResendDomain(domain.resendDomainId);

  for (let attempt = 1; payload?.status !== VERIFIED_STATUS && attempt < attempts; attempt += 1) {
    await wait(delayMs);
    payload = await getResendDomain(domain.resendDomainId);
  }

  if (!payload) return domain;

  const updateData = buildDomainUpdate(domain, payload);

  await prisma.sendingDomain.update({
    where: { id: domain.id },
    data: updateData,
  });

  return { ...domain, ...updateData };
}
