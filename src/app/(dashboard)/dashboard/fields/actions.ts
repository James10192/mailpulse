"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";

const fieldSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Le nom doit etre alphanumérique (ex: company_name)"),
  label: z.string().min(1, "Le label est requis"),
  type: z.enum(["text", "number", "email", "url", "date", "select", "boolean"]).default("text"),
  required: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
});

export async function createField(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = fieldSchema.safeParse({
    name: formData.get("name"),
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required"),
  });
  if (!result.success) return { error: result.error.issues[0]?.message || "Donnees invalides." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    await prisma.customField.create({
      data: {
        name: result.data.name,
        label: result.data.label,
        type: result.data.type,
        required: result.data.required,
        organizationId: org.id,
      },
    });

    revalidatePath("/dashboard/fields");
    return { success: true };
  } catch (e) {
    if ((e as Record<string, unknown>).code === "P2002")
      return { error: "Un champ avec ce nom existe deja." };
    return { error: "Erreur lors de la creation." };
  }
}

export async function deleteField(id: string): Promise<ActionState> {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Non authentifie." };

  try {
    await prisma.customField.delete({ where: { id, organizationId: org.id } });
    revalidatePath("/dashboard/fields");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
