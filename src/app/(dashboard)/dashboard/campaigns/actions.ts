"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";

const campaignSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  subject: z.string().min(1, "Le sujet est requis"),
  previewText: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  htmlContent: z.string().optional(),
});

export async function createCampaign(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    name: formData.get("name") as string,
    subject: formData.get("subject") as string,
    previewText: formData.get("previewText") as string,
    fromName: formData.get("fromName") as string,
    fromEmail: formData.get("fromEmail") as string,
    htmlContent: formData.get("htmlContent") as string,
  };

  const result = campaignSchema.safeParse(raw);
  if (!result.success) {
    return {
      error: "Donnees invalides",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const data = result.data;

  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve." };
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        previewText: data.previewText || null,
        fromName: data.fromName || null,
        fromEmail: data.fromEmail || null,
        htmlContent: data.htmlContent || null,
        status: "DRAFT",
        type: "REGULAR",
        userId: user.id,
        organizationId: org.id,
      },
    });

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "created",
      resourceType: "campaign",
      resourceId: campaign.id,
      resourceName: data.name,
    });

    revalidatePath("/dashboard/campaigns");
    revalidatePath("/dashboard");
  } catch {
    return { error: "Erreur lors de la creation de la campagne." };
  }

  redirect("/dashboard/campaigns");
}

export async function deleteCampaign(campaignId: string): Promise<ActionState> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true, organizationId: true, userId: true },
    });
    await prisma.campaign.delete({ where: { id: campaignId } });

    if (campaign) {
      convexServer.mutation(api.dashboard.logActivity, {
        organizationId: campaign.organizationId,
        userId: campaign.userId,
        userName: "System",
        action: "deleted",
        resourceType: "campaign",
        resourceId: campaignId,
        resourceName: campaign.name,
      });
    }

    revalidatePath("/dashboard/campaigns");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
