import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { findIdempotentResponse, idempotentJson, storeIdempotentResponse } from "@/lib/mailpulse/idempotency";
import { serializeTemplate } from "@/lib/mailpulse/serializers";
import { toPrismaJson } from "@/lib/mailpulse/json";
import { toContentType, toTemplateStatus, updateTemplateSchema, validationError } from "@/lib/mailpulse/schemas";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ templateKey: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { templateKey } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const idempotencyKey = request.headers.get("idempotency-key");
  const replay = await findIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "PATCH",
    path: `/api/v1/templates/${templateKey}`,
  });
  if (replay) return idempotentJson(replay.responseBody, replay.statusCode);

  const existing = await prisma.communicationTemplate.findFirst({
    where: { organizationId: auth.organizationId, templateKey },
    orderBy: { updatedAt: "desc" },
  });
  if (!existing) return Response.json({ error: "Template not found" }, { status: 404 });

  const input = parsed.data;
  const template = await prisma.communicationTemplate.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      description: input.description,
      contentType: input.content_type ? toContentType(input.content_type) : undefined,
      subject: input.subject,
      body: input.body,
      variables: input.variables ? toPrismaJson(input.variables) : undefined,
      providerTemplateId: input.provider_template_id,
      status: input.status ? toTemplateStatus(input.status) : undefined,
      metadata: input.metadata ? toPrismaJson(input.metadata) : undefined,
    },
  });

  const response = { template: serializeTemplate(template) };
  await storeIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "PATCH",
    path: `/api/v1/templates/${templateKey}`,
    requestBody: body,
    statusCode: 200,
    responseBody: response,
  });

  return Response.json(response);
}
