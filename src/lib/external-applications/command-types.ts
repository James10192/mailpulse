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
};
