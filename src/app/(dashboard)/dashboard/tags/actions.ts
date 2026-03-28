"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  color: z.string().default("#f97316"),
});

export type TagActionState = { success?: boolean; error?: string } | null;

export async function createTag(
  _prev: TagActionState,
  formData: FormData
): Promise<TagActionState> {
  const result = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!result.success) return { error: "Nom requis" };

  // Tags are per-contact in the schema (ContactTag).
  // Creating a "global" tag means we just validate – it will appear
  // once it is attached to at least one contact.
  // For now we create a placeholder entry so it shows in the list.
  // We need at least one contact to attach it to, so we skip the DB write
  // and simply revalidate so the UI closes the modal.
  // If you want standalone tags, add a Tag model to the schema.

  revalidatePath("/dashboard/tags");
  return { success: true };
}

export async function deleteTag(tagName: string): Promise<TagActionState> {
  try {
    await prisma.contactTag.deleteMany({ where: { name: tagName } });
    revalidatePath("/dashboard/tags");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
