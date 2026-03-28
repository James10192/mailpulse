"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createContactSchema = z.object({
  email: z.string().email("Email invalide"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  tags: z.string().optional(),
});

export type ContactActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function createContact(
  _prevState: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const raw = {
    email: formData.get("email") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    phone: formData.get("phone") as string,
    tags: formData.get("tags") as string,
  };

  const result = createContactSchema.safeParse(raw);
  if (!result.success) {
    return {
      error: "Donnees invalides",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const data = result.data;

  try {
    // TODO: get real userId and organizationId from Better Auth session
    const user = await prisma.user.findFirst();
    if (!user) {
      return { error: "Utilisateur non trouve. Connectez-vous d'abord." };
    }

    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Mon organisation",
          slug: "mon-org",
        },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        email: data.email,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone || null,
        userId: user.id,
        organizationId: org.id,
      },
    });

    // Create tags if provided
    if (data.tags) {
      const tagNames = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        await prisma.contactTag.create({
          data: { name, contactId: contact.id },
        });
      }
    }

    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { error: "Ce contact existe deja dans votre organisation." };
    }
    return { error: "Erreur lors de la creation du contact." };
  }
}

export async function deleteContact(contactId: string): Promise<ContactActionState> {
  try {
    await prisma.contact.delete({ where: { id: contactId } });
    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
