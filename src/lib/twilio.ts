import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.warn("Twilio credentials not configured — SMS/WhatsApp disabled");
}

export const twilioClient = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null;

export const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER ?? "";
export const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER
  ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
  : "";

export type SmsChannel = "sms" | "whatsapp";

export async function sendSms(to: string, body: string) {
  if (!twilioClient) throw new Error("Twilio non configure");
  return twilioClient.messages.create({
    to,
    from: TWILIO_PHONE,
    body,
  });
}

export async function sendWhatsApp(to: string, body: string) {
  if (!twilioClient) throw new Error("Twilio non configure");
  return twilioClient.messages.create({
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    from: TWILIO_WHATSAPP,
    body,
  });
}
