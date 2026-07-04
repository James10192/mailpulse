import { z } from "zod";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const initializeResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    authorization_url: z.string().url(),
    access_code: z.string(),
    reference: z.string(),
  }),
});

const verifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    reference: z.string(),
    status: z.string(),
    amount: z.number(),
    currency: z.string(),
    paid_at: z.string().nullable().optional(),
  }),
});

export type PaystackInitializeResult = z.infer<typeof initializeResponseSchema>["data"];
export type PaystackVerifyResult = z.infer<typeof verifyResponseSchema>["data"];

function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return key;
}

async function paystackRequest(path: string, init: RequestInit) {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : "Paystack request failed";
    throw new Error(message);
  }

  return payload;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}) {
  const payload = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });

  return initializeResponseSchema.parse(payload).data;
}

export async function verifyPaystackTransaction(reference: string) {
  const payload = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });

  return verifyResponseSchema.parse(payload).data;
}
