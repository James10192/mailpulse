import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateFilonRequest } from "@/lib/filon-recovery/auth";
import { serializeFilonRecoveryStatus } from "@/lib/filon-recovery/status";

export async function filonRecoveryStatusResponse(request: NextRequest) {
  const integration = await authenticateFilonRequest(request);
  if (!integration) {
    return Response.json({ error: "Cle d'integration Filon invalide." }, { status: 401 });
  }

  const filonOpportunityId = request.nextUrl.searchParams.get("filonOpportunityId");
  if (!filonOpportunityId) {
    return Response.json({ error: "filonOpportunityId est requis." }, { status: 400 });
  }

  const recovery = await prisma.filonRecovery.findUnique({
    where: {
      organizationId_filonOpportunityId: {
        organizationId: integration.organizationId,
        filonOpportunityId,
      },
    },
    include: { steps: { orderBy: { position: "asc" } } },
  });

  if (!recovery) {
    return Response.json({ error: "Recouvrement introuvable." }, { status: 404 });
  }

  return Response.json(serializeFilonRecoveryStatus(recovery));
}
