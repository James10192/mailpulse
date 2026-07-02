import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { sha256 } from "@/lib/mailpulse/crypto";
import { storeIdempotentResponse, findIdempotentResponse, idempotentJson } from "@/lib/mailpulse/idempotency";
import { serializeContact } from "@/lib/mailpulse/serializers";
import { upsertContactSchema, validationError } from "@/lib/mailpulse/schemas";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = upsertContactSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const idempotencyKey = request.headers.get("idempotency-key");
  const replay = await findIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/contacts",
  });
  if (replay) return idempotentJson(replay.responseBody, replay.statusCode);

  const input = parsed.data;
  const syntheticEmail = !input.email;
  const email = input.email?.toLowerCase().trim() ?? syntheticContactEmail(input.phone ?? input.external_id ?? randomUUID());
  const metadata = {
    ...(input.metadata ?? {}),
    ...(input.external_id ? { external_id: input.external_id } : {}),
    ...(input.language ? { language: input.language } : {}),
    ...(input.preferred_channel ? { preferred_channel: input.preferred_channel } : {}),
    ...(syntheticEmail ? { mailpulse_synthetic_email: true } : {}),
  };

  const owner = await prisma.member.findFirst({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });

  if (!owner) return Response.json({ error: "Tenant has no owner user" }, { status: 409 });

  const contact = await prisma.contact.upsert({
    where: {
      email_organizationId: {
        email,
        organizationId: auth.organizationId,
      },
    },
    update: {
      firstName: input.first_name,
      lastName: input.last_name,
      phone: input.phone,
      subscribed: input.subscribed ?? true,
      metadata,
    },
    create: {
      organizationId: auth.organizationId,
      userId: owner.userId,
      email,
      firstName: input.first_name,
      lastName: input.last_name,
      phone: input.phone,
      subscribed: input.subscribed ?? true,
      metadata,
    },
  });

  const response = { contact: serializeContact(contact) };
  await storeIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/contacts",
    requestBody: body,
    statusCode: 200,
    responseBody: response,
  });

  return Response.json(response);
}

function syntheticContactEmail(seed: string) {
  return `contact_${sha256(seed).slice(0, 24)}@mailpulse.local`;
}
