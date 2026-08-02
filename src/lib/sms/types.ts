export type SmsSendRequest = {
  to: string;
  text: string;
  senderAddress: string;
  senderName?: string | null;
};

export type SmsSendResult = {
  providerMessageId: string;
};

export type SmsBalance = {
  availableUnits: number;
  expirationDate: Date | null;
};

export type SmsProviderClient = {
  send(request: SmsSendRequest): Promise<SmsSendResult>;
  getBalance(): Promise<SmsBalance | null>;
};

export class SmsProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly submissionState: "not_submitted" | "unknown" = "not_submitted",
  ) {
    super(message);
    this.name = "SmsProviderError";
  }
}
