import { ResendProvider } from "./resend-provider";
import type { IEmailProvider } from "./types";

export type { IEmailProvider, SendEmailOptions, SendEmailResult } from "./types";

let provider: IEmailProvider | null = null;

export function getEmailProvider(): IEmailProvider {
  if (!provider) {
    provider = new ResendProvider();
  }
  return provider;
}
