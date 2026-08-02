import type { CommunicationMessage } from "@/generated/prisma";
import { serializeMessage } from "./serializers";

export type MessageDispatchState = "accepted" | "pending" | "pending_reconciliation" | "failed";

type MessageDispatch = {
  state: MessageDispatchState;
  sms_fallback_eligible: boolean;
};

export type ApiMessageResponse =
  | { dispatch: MessageDispatch; message: ReturnType<typeof serializeMessage> }
  | { dispatch: MessageDispatch; error: string; code: string; message: ReturnType<typeof serializeMessage> };

export function responseForMessage(message: CommunicationMessage): { response: ApiMessageResponse; statusCode: number } {
  const serialized = serializeMessage(message);
  const dispatch = dispatchForMessage(message);
  if (dispatch.state === "failed") {
    return {
      statusCode: 422,
      response: {
        dispatch,
        error: serialized.error_message ?? "Message failed",
        code: serialized.error_code ?? "message_failed",
        message: serialized,
      },
    };
  }
  return { statusCode: 202, response: { dispatch, message: serialized } };
}

export function responseForSerializedMessage(
  message: ReturnType<typeof serializeMessage>,
): { response: ApiMessageResponse; statusCode: number } {
  const dispatch = dispatchForSerializedMessage(message);
  if (dispatch.state === "failed") {
    return {
      statusCode: 422,
      response: {
        dispatch,
        error: message.error_message ?? "Message failed",
        code: message.error_code ?? "message_failed",
        message,
      },
    };
  }
  return { statusCode: 202, response: { dispatch, message } };
}

function dispatchForMessage(message: CommunicationMessage): MessageDispatch {
  if (["SENT", "DELIVERED", "READ", "RECONCILED"].includes(message.status)) {
    return { state: "accepted", sms_fallback_eligible: false };
  }
  if (message.status === "SUBMISSION_UNKNOWN") {
    return { state: "pending_reconciliation", sms_fallback_eligible: false };
  }
  if (["QUEUED", "PROCESSING", "RETRYING"].includes(message.status)) {
    return { state: "pending", sms_fallback_eligible: false };
  }
  return {
    state: "failed",
    sms_fallback_eligible: message.channel === "WHATSAPP"
      && (message.status === "TEMPLATE_REQUIRED" || message.errorCode === "recipient_not_activated"),
  };
}

function dispatchForSerializedMessage(message: ReturnType<typeof serializeMessage>): MessageDispatch {
  if (["sent", "delivered", "read", "reconciled"].includes(message.status)) {
    return { state: "accepted", sms_fallback_eligible: false };
  }
  if (message.status === "submission_unknown") {
    return { state: "pending_reconciliation", sms_fallback_eligible: false };
  }
  if (["queued", "processing", "retrying"].includes(message.status)) {
    return { state: "pending", sms_fallback_eligible: false };
  }
  return {
    state: "failed",
    sms_fallback_eligible: message.channel === "whatsapp"
      && (message.status === "template_required" || message.error_code === "recipient_not_activated"),
  };
}
