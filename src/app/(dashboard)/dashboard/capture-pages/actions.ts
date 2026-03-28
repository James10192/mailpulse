"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { generateSlug } from "@/lib/utils";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";

const capturePageSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
});

export async function createCapturePage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = capturePageSchema.safeParse({
    name: formData.get("name"),
  });
  if (!result.success) return { error: "Nom requis." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    const slug = generateSlug(result.data.name).slice(0, 60) + "-" + Date.now().toString(36);

    await prisma.capturePage.create({
      data: {
        name: result.data.name,
        slug,
        organizationId: org.id,
      },
    });

    trackServerEvent(user.id, EVENTS.CAPTURE_PAGE_CREATED, {
      page_name: result.data.name,
    }, org.id);

    revalidatePath("/dashboard/capture-pages");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation." };
  }
}

export async function toggleCapturePagePublished(
  id: string,
  published: boolean
): Promise<ActionState> {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Non authentifie." };

  try {
    await prisma.capturePage.update({
      where: { id, organizationId: org.id },
      data: { published },
    });
    revalidatePath("/dashboard/capture-pages");
    return { success: true };
  } catch {
    return { error: "Erreur." };
  }
}

export async function updateCapturePageFields(
  id: string,
  data: {
    fields: Array<{ name: string; type: string; required: boolean; label: string }>;
    buttonLabel: string;
    successMessage: string;
  }
): Promise<ActionState> {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Non authentifie." };

  try {
    await prisma.capturePage.update({
      where: { id, organizationId: org.id },
      data: {
        fields: data.fields,
        buttonLabel: data.buttonLabel,
        successMessage: data.successMessage,
      },
    });
    revalidatePath(`/dashboard/capture-pages/${id}`);
    revalidatePath(`/dashboard/capture-pages/${id}/edit`);
    return { success: true };
  } catch {
    return { error: "Erreur lors de la sauvegarde." };
  }
}

export async function deleteCapturePage(id: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    await prisma.capturePage.delete({ where: { id, organizationId: org.id } });
    trackServerEvent(user.id, EVENTS.CAPTURE_PAGE_DELETED, { page_id: id }, org.id);
    revalidatePath("/dashboard/capture-pages");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
