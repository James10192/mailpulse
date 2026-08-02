import { normalizeContactPhone } from "@/lib/phone-numbers";

export const ORANGE_SMS_DELIVERY_RECEIPT_PATH = "/api/webhooks/sms/orange";

const ORANGE_SMS_SENDER_ADDRESS_PLACEHOLDER = "+2250000";
const DELIVERY_RECEIPT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function configuredEnvironment(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function isOrangeSmsSenderAddress(value: string | null | undefined) {
  const senderAddress = normalizeContactPhone(value);
  return /^\+225\d{10}$/.test(senderAddress) && senderAddress !== ORANGE_SMS_SENDER_ADDRESS_PLACEHOLDER;
}

export function orangeSmsSenderAddressFromEnvironment() {
  const senderAddress = configuredEnvironment("ORANGE_SMS_SENDER_ADDRESS");
  if (!isOrangeSmsSenderAddress(senderAddress)) {
    throw new Error(
      "ORANGE_SMS_SENDER_ADDRESS doit être un numéro ivoirien E.164 autorisé par Orange, sans valeur de démonstration.",
    );
  }
  return normalizeContactPhone(senderAddress);
}

export type OrangeSmsDeliveryReceiptConfiguration = {
  subscriptionConfirmed: boolean;
  callbackConfigured: boolean;
  trackingEnabled: boolean;
};

export function orangeSmsDeliveryReceiptConfiguration(): OrangeSmsDeliveryReceiptConfiguration {
  const subscriptionConfirmed = configuredEnvironment("ORANGE_SMS_DELIVERY_RECEIPTS_CONFIRMED") === "true";
  const webhookToken = configuredEnvironment("ORANGE_SMS_WEBHOOK_TOKEN");
  const callbackUrl = configuredEnvironment("ORANGE_SMS_DELIVERY_RECEIPT_CALLBACK_URL");

  const callbackConfigured = isOrangeSmsDeliveryReceiptCallback(callbackUrl, webhookToken);
  return {
    subscriptionConfirmed,
    callbackConfigured,
    trackingEnabled: subscriptionConfirmed && callbackConfigured,
  };
}

export function isOrangeSmsDeliveryReceiptCallback(callbackUrl: string, webhookToken: string) {
  if (!DELIVERY_RECEIPT_TOKEN_PATTERN.test(webhookToken)) return false;

  try {
    const url = new URL(callbackUrl);
    const tokenValues = url.searchParams.getAll("token");
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.hash
      && url.pathname === ORANGE_SMS_DELIVERY_RECEIPT_PATH
      && url.searchParams.size === 1
      && tokenValues.length === 1
      && tokenValues[0] === webhookToken;
  } catch {
    return false;
  }
}
