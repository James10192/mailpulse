import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

const schema = z.object({
  type: z.enum(["BUG", "IDEA", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  message: z.string().trim().min(3).max(4000),
  context: z.string().max(500).optional(),
  pageTitle: z.string().max(300).optional(),
  browser: z.string().max(1000).optional(),
  viewport: z.string().max(50).optional(),
  screenshotUrl: z.string().max(1000).optional(),
  canContactBack: z.boolean(),
});

export async function POST(request: Request) {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Retour invalide." }, { status: 400 });
  }

  const data = parsed.data;

  const feedback = await prisma.feedback.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      type: data.type,
      priority: data.priority,
      message: data.message,
      canContactBack: data.canContactBack,
      ...(data.context ? { context: data.context } : {}),
      ...(data.pageTitle ? { pageTitle: data.pageTitle } : {}),
      ...(data.browser ? { browser: data.browser } : {}),
      ...(data.viewport ? { viewport: data.viewport } : {}),
      ...(data.screenshotUrl ? { screenshotUrl: data.screenshotUrl } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ id: feedback.id });
}
