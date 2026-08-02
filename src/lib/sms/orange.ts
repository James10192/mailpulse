import { normalizeContactPhone } from "@/lib/phone-numbers";
import { isOrangeSmsEnabled } from "@/lib/transport-flags";
import { isOrangeSmsSenderAddress, orangeSmsSenderAddressFromEnvironment } from "./orange-config";
import type { SmsBalance, SmsProviderClient, SmsSendRequest, SmsSendResult } from "./types";
import { SmsProviderError } from "./types";

const ORANGE_API_BASE_URL = "https://api.orange.com";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const ORANGE_REQUEST_TIMEOUT_MS = 8_000;
type CachedToken = { value: string; expiresAt: number };

type OrangeTokenResponse = {
  access_token?: string;
  expires_in?: string | number;
};

type OrangeSendResponse = {
  outboundSMSMessageRequest?: { resourceURL?: string };
};

type OrangeContract = {
  country?: string;
  status?: string;
  availableUnits?: number;
  expirationDate?: string;
};

let cachedToken: CachedToken | null = null;
let tokenRequest: Promise<string> | null = null;

function requiredEnvironment(name: "ORANGE_SMS_CLIENT_ID" | "ORANGE_SMS_CLIENT_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new SmsProviderError(`La variable ${name} n'est pas configurée.`, false);
  return value;
}

async function orangeAccessToken() {
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return cachedToken.value;
  }

  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const clientId = requiredEnvironment("ORANGE_SMS_CLIENT_ID");
    const clientSecret = requiredEnvironment("ORANGE_SMS_CLIENT_SECRET");
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    let response: Response;
    try {
      response = await fetch(`${ORANGE_API_BASE_URL}/oauth/v3/token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(ORANGE_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new SmsProviderError("Unable to obtain an Orange access token before SMS submission.", true);
    }

    if (!response.ok) {
      throw new SmsProviderError("Impossible d'obtenir le jeton Orange SMS.", response.status >= 500 || response.status === 429);
    }

    const payload = await response.json().catch(() => null) as OrangeTokenResponse | null;
    if (!payload?.access_token) throw new SmsProviderError("Orange SMS returned an invalid access token.", true);

    const expiresInSeconds = Number(payload.expires_in ?? 3600);
    cachedToken = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(expiresInSeconds, 60) * 1000,
    };
    return cachedToken.value;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

function orangeCiRecipient(value: string) {
  const phone = normalizeContactPhone(value);
  if (!/^\+225\d{10}$/.test(phone)) {
    throw new SmsProviderError("Orange SMS Côte d'Ivoire exige un numéro mobile ivoirien au format E.164.", false);
  }
  return `tel:${phone}`;
}

function orangeCiSender(value: string) {
  const phone = normalizeContactPhone(value);
  let configuredSenderAddress: string;
  try {
    configuredSenderAddress = orangeSmsSenderAddressFromEnvironment();
  } catch (error) {
    throw new SmsProviderError(error instanceof Error ? error.message : "L'adresse Orange SMS est invalide.", false);
  }
  if (!isOrangeSmsSenderAddress(phone) || phone !== configuredSenderAddress) {
    throw new SmsProviderError("L'adresse d'envoi Orange CI ne correspond pas à l'adresse autorisée au déploiement.", false);
  }
  return `tel:${phone}`;
}

function approvedSenderName(value: string | null | undefined) {
  if (!value) return undefined;
  const senderName = value.trim();
  if (!/^[A-Za-z0-9 ]{1,11}$/.test(senderName)) {
    throw new SmsProviderError("Le nom d'expéditeur Orange doit contenir 1 à 11 caractères alphanumériques ou espaces.", false);
  }
  return senderName;
}

function resourceId(resourceUrl: string | undefined) {
  const id = resourceUrl?.split("/").filter(Boolean).at(-1);
  if (!id) throw new SmsProviderError("Orange accepted the request without a usable message identifier.", false, "unknown");
  return id;
}

function errorMessage(status: number, body: unknown) {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return `Orange SMS a refusé l'envoi (HTTP ${status}).`;
}

export class OrangeSmsProvider implements SmsProviderClient {
  async send(request: SmsSendRequest): Promise<SmsSendResult> {
    if (!isOrangeSmsEnabled()) {
      throw new SmsProviderError("Orange SMS est désactivé par la configuration runtime.", false);
    }

    const senderAddress = orangeCiSender(request.senderAddress);
    const senderName = approvedSenderName(request.senderName);
    const payload = {
      outboundSMSMessageRequest: {
        address: orangeCiRecipient(request.to),
        senderAddress,
        ...(senderName ? { senderName } : {}),
        outboundSMSTextMessage: { message: request.text },
      },
    };

    try {
      return await this.sendWithToken(await orangeAccessToken(), senderAddress, payload);
    } catch (error) {
      if (!(error instanceof OrangeUnauthorizedError)) throw error;
      cachedToken = null;
      return this.sendWithToken(await orangeAccessToken(), senderAddress, payload);
    }
  }

  private async sendWithToken(
    token: string,
    senderAddress: string,
    payload: { outboundSMSMessageRequest: Record<string, unknown> },
  ): Promise<SmsSendResult> {
    let response: Response;
    try {
      response = await fetch(
        `${ORANGE_API_BASE_URL}/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(ORANGE_REQUEST_TIMEOUT_MS),
        },
      );
    } catch {
      throw new SmsProviderError("La réponse Orange SMS est inconnue. Vérifiez la livraison avant de renvoyer ce message.", false, "unknown");
    }

    const body = await response.json().catch(() => null);
    if (response.status === 401) throw new OrangeUnauthorizedError();
    if (!response.ok) {
      const retryable = response.status === 429;
      const submissionState = retryable ? "not_submitted" : response.status >= 500 ? "unknown" : "not_submitted";
      throw new SmsProviderError(errorMessage(response.status, body), retryable, submissionState);
    }

    const result = body as OrangeSendResponse;
    return { providerMessageId: resourceId(result.outboundSMSMessageRequest?.resourceURL) };
  }

  async getBalance(): Promise<SmsBalance | null> {
    const token = await orangeAccessToken();
    const response = await fetch(`${ORANGE_API_BASE_URL}/sms/admin/v1/contracts`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(ORANGE_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new SmsProviderError("Impossible de lire le solde Orange SMS.", response.status >= 500 || response.status === 429);
    }

    const contracts = await response.json().catch(() => []) as OrangeContract[];
    const contract = contracts.find((item) => item.country === "CIV" && item.status === "ACTIVE");
    if (!contract) return null;

    return {
      availableUnits: Number(contract.availableUnits ?? 0),
      expirationDate: contract.expirationDate ? new Date(contract.expirationDate) : null,
    };
  }
}

class OrangeUnauthorizedError extends Error {
  constructor() {
    super("Orange SMS a refusé le jeton d'accès.");
  }
}

export function resetOrangeSmsTokenForTests() {
  cachedToken = null;
  tokenRequest = null;
}
