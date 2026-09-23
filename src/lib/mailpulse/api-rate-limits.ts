import type { CommunicationChannel } from "@/generated/prisma";

/**
 * Per-organization API send rate, per channel. Dependency-free so rules that
 * share a limit (a WhatsApp message and a WhatsApp verification code both use
 * the same number) read one value.
 */
export const API_RATE_WINDOW_MS = 60_000;

export const API_RATE_LIMITS: Record<CommunicationChannel, number> = {
  EMAIL: 60,
  SMS: 30,
  WHATSAPP: 30,
};
