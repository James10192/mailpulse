export type CredentialView = {
  id: string;
  keyId: string;
  version: number;
  createdAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
};

export type ProviderAccountView = {
  id: string;
  wabaId: string;
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
  providerAccount: ProviderAccountView | null;
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
