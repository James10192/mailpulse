import type { InboundMessage } from "@/lib/external-applications/meta-webhook";
import { APPLICATION_WHATSAPP_ACCOUNTS, providerConfigForAccount } from "@/lib/messaging/whatsapp-sender";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppWith } from "@/lib/whatsapp";
import { readVerificationSecret } from "./code";
import { reverseReplyText } from "./policy";
import { receiveReverseCode, type InboundCodeOutcome, type VerificationServiceDeps } from "./service";
import { createPrismaVerificationStore } from "./store";

const store = createPrismaVerificationStore(prisma);

/**
 * Takes the reverse verification codes out of a batch of inbound messages,
 * approves them and answers the person. Returns the ids of the messages it
 * took, which must not be forwarded: a code is not a question for the
 * application's chatbot.
 *
 * Never throws: a failure here leaves the messages to their usual route, and
 * the person can still send the code again.
 */
export async function takeReverseVerificationCodes(
  target: { organizationId: string; providerAccountId: string },
  messages: readonly InboundMessage[],
): Promise<Set<string>> {
  const taken = new Set<string>();
  const secret = readVerificationSecret(process.env);
  if (!secret || messages.length === 0) return taken;
  const deps: VerificationServiceDeps = { store, now: () => new Date(), secret };

  for (const message of messages) {
    let outcome: InboundCodeOutcome;
    try {
      outcome = await receiveReverseCode(deps, {
        organizationId: target.organizationId,
        senderAccountId: target.providerAccountId,
        phoneNumber: `+${message.sender}`,
        text: message.text,
      });
    } catch (error) {
      console.error("[verifications] inbound code not read", { error: error instanceof Error ? error.message : error });
      continue;
    }
    if (outcome.type === "not_a_code") continue;
    taken.add(message.providerMessageId);
    if (outcome.type === "handled") await reply(target, message.sender, reverseReplyText(outcome.verification.locale, outcome.reply));
  }
  return taken;
}

/** Answers on the number the person wrote to. A lost answer changes nothing: the verification is already settled. */
async function reply(target: { organizationId: string; providerAccountId: string }, to: string, text: string) {
  try {
    const account = await prisma.providerAccount.findFirst({
      where: { id: target.providerAccountId, organizationId: target.organizationId },
      select: APPLICATION_WHATSAPP_ACCOUNTS.select,
    });
    const config = account ? providerConfigForAccount(account) : null;
    if (!config) return;
    await sendWhatsAppWith(config, `+${to}`, text, { fallbacks: false, priority: "interactive" });
  } catch (error) {
    console.error("[verifications] reverse reply not sent", { error: error instanceof Error ? error.message : error });
  }
}
