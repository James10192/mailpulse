export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  sendText(to: string, text: string): Promise<WhatsAppSendResult>;
}

// Discriminated union for config
export type WhatsAppProviderConfig =
  | { mode: "BAILEYS"; instanceName: string }
  | { mode: "META"; phoneNumberId: string; accessToken: string };
