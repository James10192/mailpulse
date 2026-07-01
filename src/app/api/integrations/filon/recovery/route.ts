import { NextRequest } from "next/server";
import { authenticateFilonRequest } from "@/lib/filon-recovery/auth";
import {
  filonRecoveryPayloadSchema,
  validationErrorPayload,
} from "@/lib/filon-recovery/schemas";
import { createOrGetFilonRecovery } from "@/lib/filon-recovery/sequence";
import { filonRecoveryStatusResponse } from "@/lib/filon-recovery/status-query";

export async function POST(request: NextRequest) {
  const integration = await authenticateFilonRequest(request);
  if (!integration) {
    return Response.json({ error: "Cle d'integration Filon invalide." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = filonRecoveryPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(validationErrorPayload(parsed.error), { status: 400 });
  }

  try {
    const status = await createOrGetFilonRecovery({
      organizationId: integration.organizationId,
      companyName: integration.organization.name,
      payload: parsed.data,
    });
    return Response.json(status, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de preparer le recouvrement.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return filonRecoveryStatusResponse(request);
}
