import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send or manage emails.");
  }
  return new Resend(apiKey);
}

export const resend = new Proxy({} as Resend, {
  get(_target, property) {
    return Reflect.get(getResendClient(), property);
  },
});

interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
}

export async function sendEmail(options: SendEmailOptions) {
  const { data, error } = await getResendClient().emails.send({
    from: options.from ?? process.env.RESEND_FROM_EMAIL!,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
    headers: options.headers,
    tags: options.tags,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendCampaignEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  campaignId: string;
  recipientId: string;
  unsubscribeUrl: string;
}) {
  return sendEmail({
    to: params.to,
    from: params.from,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
    headers: {
      "List-Unsubscribe": `<${params.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-Campaign-Id": params.campaignId,
      "X-Recipient-Id": params.recipientId,
    },
    tags: [
      { name: "campaign_id", value: params.campaignId },
      { name: "recipient_id", value: params.recipientId },
    ],
  });
}
