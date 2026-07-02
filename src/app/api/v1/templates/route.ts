import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { findIdempotentResponse, idempotentJson, storeIdempotentResponse } from "@/lib/mailpulse/idempotency";
import { serializeTemplate } from "@/lib/mailpulse/serializers";
import { createTemplateSchema, toChannel, toContentType, toTemplateStatus, validationError } from "@/lib/mailpulse/schemas";
import { toPrismaJson } from "@/lib/mailpulse/json";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const templates = await prisma.communicationTemplate.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return Response.json({ templates: templates.map(serializeTemplate) });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const idempotencyKey = request.headers.get("idempotency-key");
  const replay = await findIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/templates",
  });
  if (replay) return idempotentJson(replay.responseBody, replay.statusCode);

  const input = parsed.data;
  const template = await prisma.communicationTemplate.upsert({
    where: {
      organizationId_templateKey_locale_channel: {
        organizationId: auth.organizationId,
        templateKey: input.template_key,
        locale: input.locale,
        channel: toChannel(input.channel),
      },
    },
    update: {
      name: input.name,
      description: input.description,
      contentType: toContentType(input.content_type),
      subject: input.subject,
      body: input.body,
      variables: input.variables ? toPrismaJson(input.variables) : undefined,
      providerTemplateId: input.provider_template_id,
      status: toTemplateStatus(input.status),
      metadata: input.metadata ? toPrismaJson(input.metadata) : undefined,
    },
    create: {
      organizationId: auth.organizationId,
      templateKey: input.template_key,
      name: input.name,
      description: input.description,
      channel: toChannel(input.channel),
      locale: input.locale,
      contentType: toContentType(input.content_type),
      subject: input.subject,
      body: input.body,
      variables: input.variables ? toPrismaJson(input.variables) : undefined,
      providerTemplateId: input.provider_template_id,
      status: toTemplateStatus(input.status),
      metadata: input.metadata ? toPrismaJson(input.metadata) : undefined,
    },
  });

  const response = { template: serializeTemplate(template) };
  await storeIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/templates",
    requestBody: body,
    statusCode: 200,
    responseBody: response,
  });

  return Response.json(response);
}
