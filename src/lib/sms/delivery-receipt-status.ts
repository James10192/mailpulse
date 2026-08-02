export type OrangeSmsDeliveryStatus = "DeliveredToTerminal" | "DeliveryImpossible" | string;

export function orangeSmsReceiptTargetStatus(status: OrangeSmsDeliveryStatus) {
  if (status === "DeliveredToTerminal") return "DELIVERED" as const;
  if (status === "DeliveryImpossible") return "SUBMISSION_UNKNOWN" as const;
  return null;
}

export function preferredOrangeSmsDeliveryStatus(
  currentStatus: OrangeSmsDeliveryStatus,
  incomingStatus: OrangeSmsDeliveryStatus,
) {
  return orangeSmsDeliveryStatusPriority(incomingStatus) >= orangeSmsDeliveryStatusPriority(currentStatus)
    ? incomingStatus
    : currentStatus;
}

function orangeSmsDeliveryStatusPriority(status: OrangeSmsDeliveryStatus) {
  if (status === "DeliveredToTerminal") return 2;
  if (status === "DeliveryImpossible") return 1;
  return 0;
}
