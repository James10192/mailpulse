import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { applyOrangeSmsDeliveryReceipt } from "@/lib/mailpulse/messages";
import { orangeSmsDeliveryReceiptConfiguration } from "@/lib/sms/orange-config";

const deliveryReceiptSchema = z.object({
  deliveryInfoNotification: z.object({
    callbackData: z.string().min(1),
    deliveryInfo: z.object({
      deliveryStatus: z.string().min(1),
    }),
  }),
});

function hasValidToken(request: Request) {
  const expected = process.env.ORANGE_SMS_WEBHOOK_TOKEN;
  const received = new URL(request.url).searchParams.get("token");
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  if (!orangeSmsDeliveryReceiptConfiguration().trackingEnabled) {
    return new Response("Delivery receipts are not enabled", { status: 503 });
  }
  if (!hasValidToken(request)) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = deliveryReceiptSchema.safeParse(body);
  if (!parsed.success) return new Response("Invalid payload", { status: 400 });

  await applyOrangeSmsDeliveryReceipt({
    resourceId: parsed.data.deliveryInfoNotification.callbackData,
    deliveryStatus: parsed.data.deliveryInfoNotification.deliveryInfo.deliveryStatus,
  });

  return new Response(null, { status: 200 });
}
