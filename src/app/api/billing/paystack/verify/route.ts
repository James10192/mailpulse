import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPaystackTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

const schema = z.object({
  reference: z.string().min(8),
});

export async function POST(request: Request) {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Référence invalide." }, { status: 400 });
  }

  const payment = await prisma.billingPayment.findFirst({
    where: {
      reference: parsed.data.reference,
      organizationId: org.id,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  }

  try {
    const verified = await verifyPaystackTransaction(payment.reference);
    const success = verified.status === "success";

    await prisma.$transaction(async (tx) => {
      await tx.billingPayment.update({
        where: { reference: payment.reference },
        data: {
          status: success ? "SUCCESS" : verified.status === "abandoned" ? "ABANDONED" : "FAILED",
          providerStatus: verified.status,
          paidAt: success && verified.paid_at ? new Date(verified.paid_at) : null,
          rawResponse: verified,
        },
      });

      if (success) {
        await tx.organization.update({
          where: { id: org.id },
          data: { plan: payment.plan },
        });
      }
    });

    return NextResponse.json({ status: verified.status, plan: success ? payment.plan : org.plan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vérification Paystack impossible." },
      { status: 500 }
    );
  }
}
