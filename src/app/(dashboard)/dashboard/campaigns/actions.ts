"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { redirect } from "next/navigation";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  subject: z.string().min(1, "Le sujet est requis"),
  previewText: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  htmlContent: z.string().optional(),
});

export type CampaignActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function createCampaign(
  _prevState: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
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

    await prisma.campaign.create({
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

    revalidatePath("/dashboard/campaigns");
    revalidatePath("/dashboard");
  } catch {
    return { error: "Erreur lors de la creation de la campagne." };
  }

  redirect("/dashboard/campaigns");
}

export async function deleteCampaign(campaignId: string): Promise<CampaignActionState> {
  try {
    await prisma.campaign.delete({ where: { id: campaignId } });
    revalidatePath("/dashboard/campaigns");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
