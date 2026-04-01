import twilio from "twilio";
import { prisma } from "@/lib/prisma";

// Master Twilio client (platform account) — used to create subaccounts
const masterSid = process.env.TWILIO_ACCOUNT_SID;
const masterToken = process.env.TWILIO_AUTH_TOKEN;

const masterClient = masterSid && masterToken
  ? twilio(masterSid, masterToken)
  : null;

export type SmsChannel = "sms" | "whatsapp";

interface OrgTwilioConfig {
  twilioSubaccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
  twilioWhatsappNumber: string | null;
  smsEnabled: boolean;
}

/** Create a Twilio client using the org's subaccount credentials */
function getClientForOrg(org: OrgTwilioConfig) {
  if (!org.smsEnabled || !org.twilioSubaccountSid || !org.twilioAuthToken) {
    throw new Error("SMS non active pour cette organisation.");
  }
  return twilio(org.twilioSubaccountSid, org.twilioAuthToken);
}

/** Create a Twilio subaccount for an organization + buy a phone number */
export async function activateOrgSms(orgId: string, orgName: string, countryCode = "US") {
  if (!masterClient) {
    throw new Error("Twilio master account non configure (TWILIO_ACCOUNT_SID manquant).");
  }

  // 1. Create subaccount
  const subaccount = await masterClient.api.accounts.create({
    friendlyName: `MailPulse - ${orgName}`,
  });

  // 2. Create a client for the new subaccount
  const subClient = twilio(subaccount.sid, subaccount.authToken);

  // 3. Search for an available phone number
  const available = await subClient
    .availablePhoneNumbers(countryCode)
    .local.list({ smsEnabled: true, limit: 1 });

  let phoneNumber: string | null = null;

  if (available.length > 0) {
    // 4. Buy the phone number
    const purchased = await subClient.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
    });
    phoneNumber = purchased.phoneNumber;
  }

  // 5. Save credentials to the organization
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      smsEnabled: true,
      twilioSubaccountSid: subaccount.sid,
      twilioAuthToken: subaccount.authToken,
      twilioPhoneNumber: phoneNumber,
    },
  });

  return { subaccountSid: subaccount.sid, phoneNumber };
}

/** Send an SMS using the org's subaccount */
export async function sendSmsForOrg(org: OrgTwilioConfig, to: string, body: string) {
  const client = getClientForOrg(org);
  if (!org.twilioPhoneNumber) throw new Error("Aucun numero SMS configure.");
  return client.messages.create({
    to,
    from: org.twilioPhoneNumber,
    body,
  });
}

/** Send a WhatsApp message using the org's subaccount */
export async function sendWhatsAppForOrg(org: OrgTwilioConfig, to: string, body: string) {
  const client = getClientForOrg(org);
  const fromNumber = org.twilioWhatsappNumber || org.twilioPhoneNumber;
  if (!fromNumber) throw new Error("Aucun numero WhatsApp configure.");
  return client.messages.create({
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    from: `whatsapp:${fromNumber}`,
    body,
  });
}

/** Check if the master Twilio account is configured (env vars present) */
export function isMasterConfigured() {
  return !!(masterSid && masterToken);
}
