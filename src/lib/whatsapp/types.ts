export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export interface IWhatsAppProvider {
  sendText(to: string, text: string): Promise<WhatsAppSendResult>;
  sendTemplate(to: string, templateName: string, languageCode: string, parameters?: string[]): Promise<WhatsAppSendResult>;
  sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult>;
}

// Discriminated union for config
export type WhatsAppProviderConfig =
  | { mode: "BAILEYS"; instanceName: string }
  | { mode: "META"; phoneNumberId: string; accessToken: string };
