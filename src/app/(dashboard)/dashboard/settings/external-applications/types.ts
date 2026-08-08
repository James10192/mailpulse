export type CredentialView = {
  id: string;
  keyId: string;
  version: number;
  createdAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
};

/** Which WhatsApp transport a provider account runs on. */
export type WhatsAppTransport = "META" | "BAILEYS";

export type ProviderAccountView = {
  id: string;
  transport: WhatsAppTransport;
  /** Meta: the WABA id. Baileys: the Evolution instance name. */
  externalAccountId: string;
  maskedSenderId: string | null;
  active: boolean;
  updatedAt: string;
};

export type ForwardEndpointView = {
  id: string;
  url: string;
  keyId: string;
  events: string[];
  active: boolean;
  updatedAt: string;
};

export type TemplateConfigView = {
  id: string;
  operationKey: string;
  locale: string;
  providerTemplateId: string;
  active: boolean;
  scopedToProviderAccount: boolean;
};

export type ApplicationView = {
  id: string;
  key: string;
  name: string;
  active: boolean;
  createdAt: string;
  activeCredentialCount: number;
  credentials: CredentialView[];
  /** INBOUND_FORWARD tokens authenticating the Baileys webhook URL. */
  inboundTokens: CredentialView[];
  /** Every WhatsApp account of the application, both transports, active or not. */
  providerAccounts: ProviderAccountView[];
  /** The single active WhatsApp transport, or null when none is configured. */
  activeTransport: WhatsAppTransport | null;
  forwardEndpoints: ForwardEndpointView[];
  templateConfigs: TemplateConfigView[];
};

/** One-time key material returned by a server action, shown once then discarded. */
export type RevealedSecret = {
  title: string;
  description: string;
  keyIdLabel: string;
  keyId: string;
  secretLabel: string;
  secret: string;
};
