import { Resend } from "resend";
import { getEmailProvider } from "@/lib/email";

export const resend = new Resend(process.env.RESEND_API_KEY);

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
  const provider = getEmailProvider();
  const result = await provider.send({
    from: options.from ?? process.env.RESEND_FROM_EMAIL!,
    to: options.to,
    subject: options.subject,
    html: options.html,
    replyTo: options.replyTo,
    headers: options.headers,
    tags: options.tags,
  });

  if (result.error) {
    throw new Error(`Failed to send email: ${result.error}`);
  }

  return { id: result.id };
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
