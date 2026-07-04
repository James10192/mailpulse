import { NextResponse } from "next/server";
import { z } from "zod";

import { initializePaystackTransaction } from "@/lib/paystack";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

const schema = z.object({
  plan: z.enum(["PRO"]),
});

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }

  const plan = parsed.data.plan as PlanTier;
  const amount = PLAN_LIMITS[plan].priceFCFA;
  if (amount <= 0) {
    return NextResponse.json({ error: "Ce plan ne peut pas être payé en ligne." }, { status: 400 });
  }

  const reference = `mailpulse-${org.id}-${Date.now()}`;
  const callbackUrl = `${getAppUrl(request)}/dashboard/settings/billing?paystack_reference=${encodeURIComponent(reference)}`;

  try {
    const transaction = await initializePaystackTransaction({
      email: user.email,
      amount: amount * 100,
      currency: "XOF",
      reference,
      callbackUrl,
      metadata: {
        organizationId: org.id,
        userId: user.id,
        plan,
      },
    });

    await prisma.billingPayment.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        reference,
        plan,
        amount,
        currency: "XOF",
        authorizationUrl: transaction.authorization_url,
        accessCode: transaction.access_code,
        rawResponse: transaction,
      },
    });

    return NextResponse.json({ authorizationUrl: transaction.authorization_url, reference });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Initialisation Paystack impossible." },
      { status: 500 }
    );
  }
}
