import { Resend } from "resend";
import type { IEmailProvider, SendEmailOptions, SendEmailResult } from "./types";

const resend = new Resend(process.env.RESEND_API_KEY);

export class ResendProvider implements IEmailProvider {
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const { data, error } = await resend.emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      headers: options.headers,
      tags: options.tags,
    });

    if (error) {
      return { id: "", error: error.message };
    }

    return { id: data?.id ?? "" };
  }
}
