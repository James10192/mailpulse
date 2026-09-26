import type { CommunicationMessage } from "@/generated/prisma";

/**
 * Whether replaying an idempotent request should resume the dispatch of its
 * message. Only a message no worker has submitted yet: anything past that point
 * is answered from its current state, without calling the provider again or
 * re-emitting the webhook the first request already sent. SMS is dispatched by
 * its own queue, never by the request.
 */
export function replayResumesDispatch(message: Pick<CommunicationMessage, "status" | "channel">) {
  return message.channel !== "SMS" && (message.status === "QUEUED" || message.status === "PROCESSING");
}
