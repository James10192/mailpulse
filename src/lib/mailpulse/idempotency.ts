import { prisma } from "@/lib/prisma";
import { sha256 } from "./crypto";
import { toPrismaJson } from "./json";

export function requestHash(body: unknown) {
  return sha256(JSON.stringify(body ?? {}));
}

export async function findIdempotentResponse(params: {
  organizationId: string;
  key: string | null;
  method: string;
  path: string;
}) {
  if (!params.key) return null;

  return prisma.idempotencyRecord.findUnique({
    where: {
      organizationId_key_method_path: {
        organizationId: params.organizationId,
        key: params.key,
        method: params.method,
        path: params.path,
      },
    },
  });
}

export async function storeIdempotentResponse(params: {
  organizationId: string;
  key: string | null;
  method: string;
  path: string;
  requestBody: unknown;
  statusCode: number;
  responseBody: unknown;
}) {
  if (!params.key) return;

  await prisma.idempotencyRecord.upsert({
    where: {
      organizationId_key_method_path: {
        organizationId: params.organizationId,
        key: params.key,
        method: params.method,
        path: params.path,
      },
    },
    update: {
      statusCode: params.statusCode,
      responseBody: toPrismaJson(params.responseBody),
      requestHash: requestHash(params.requestBody),
    },
    create: {
      organizationId: params.organizationId,
      key: params.key,
      method: params.method,
      path: params.path,
      requestHash: requestHash(params.requestBody),
      statusCode: params.statusCode,
      responseBody: toPrismaJson(params.responseBody),
    },
  });
}

export function idempotentJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Idempotent-Replayed": "true" },
  });
}
