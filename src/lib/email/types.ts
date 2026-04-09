export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  id: string;
  error?: string;
}

export interface IEmailProvider {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}
