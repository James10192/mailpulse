import type { DocumentContent } from "./whatsapp-document";

export type ExternalCommandContent =
  | { type: "text"; text: string }
  | { type: "template"; locale: string; parameters: string[] }
  | DocumentContent;

export type ExternalCommand = {
  operationKey: string;
  idempotencyKey: string;
  recipient: string;
  content: ExternalCommandContent;
  /** Present when the content must wait for the recipient's explicit agreement. */
  consent?: ExternalConsentRequest;
};

export type ExternalConsentRequest = {
  /** Written by the client application; sent as is. */
  requestText: string;
  expiresInSeconds: number;
};
