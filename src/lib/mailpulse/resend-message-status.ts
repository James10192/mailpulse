export type ReconciledEmailStatus = "DELIVERED" | "READ" | "FAILED";

type CurrentEmailMessage = {
  status: string;
  deliveredAt: Date | null;
  readAt: Date | null;
};

export function resendMessageTransition(
  eventType: string,
  occurredAt: Date,
  message: CurrentEmailMessage,
) {
  if (!canApplyTransition(message.status, eventType)) return null;

  if (eventType === "email.delivered") {
    return {
      status: "DELIVERED" as const,
      deliveredAt: message.deliveredAt ?? occurredAt,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (eventType === "email.opened" || eventType === "email.clicked") {
    return {
      status: "READ" as const,
      deliveredAt: message.deliveredAt ?? occurredAt,
      readAt: message.readAt ?? occurredAt,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (eventType === "email.bounced" || eventType === "email.complained") {
    return {
      status: "FAILED" as const,
      failedAt: occurredAt,
      errorCode: eventType === "email.bounced" ? "email_bounced" : "email_complained",
      errorMessage: eventType === "email.bounced"
        ? "Resend signale que l'email a rebondi."
        : "Resend signale une plainte du destinataire.",
    };
  }

  return null;
}

function canApplyTransition(currentStatus: string, eventType: string) {
  if (currentStatus === "CANCELLED" || currentStatus === "FAILED") return false;
  if (eventType === "email.delivered") return currentStatus !== "DELIVERED" && currentStatus !== "READ";
  if (eventType === "email.opened" || eventType === "email.clicked") return currentStatus !== "READ";
  if (currentStatus === "DELIVERED" || currentStatus === "READ") return false;
  return eventType === "email.bounced" || eventType === "email.complained";
}
