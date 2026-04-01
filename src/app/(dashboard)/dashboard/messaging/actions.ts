"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { sendSms, sendWhatsApp, type SmsChannel } from "@/lib/twilio";
import type { ActionState } from "@/types/action-state";

export async function sendMessage(
  channel: SmsChannel,
  to: string,
  body: string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  if (!to || !body) return { error: "Numero et message requis." };

  // Normalize phone number
  const phone = to.replace(/\s/g, "");
  if (!phone.startsWith("+")) return { error: "Le numero doit commencer par + (ex: +225XXXXXXXXX)." };

  try {
    const result = channel === "whatsapp"
      ? await sendWhatsApp(phone, body)
      : await sendSms(phone, body);

    revalidatePath("/dashboard/messaging");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur d'envoi";
    return { error: msg };
  }
}

export async function sendBulkMessages(
  channel: SmsChannel,
  body: string,
  audience: "all" | string // "all" or tag name
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  if (!body) return { error: "Le message est requis." };

  // Fetch contacts with phone numbers
  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: org.id,
      subscribed: true,
      phone: { not: null },
      ...(audience !== "all" ? { tags: { some: { name: audience } } } : {}),
    },
    select: { id: true, phone: true, firstName: true, lastName: true },
  });

  const withPhone = contacts.filter((c) => c.phone && c.phone.startsWith("+"));
  if (withPhone.length === 0) {
    return { error: "Aucun contact avec un numero de telephone valide (+XXX)." };
  }

  let sent = 0;
  const errors: string[] = [];

  for (const contact of withPhone) {
    try {
      // Personalize message
      const personalized = body
        .replace(/\{\{firstName\}\}/g, contact.firstName || "")
        .replace(/\{\{lastName\}\}/g, contact.lastName || "");

      if (channel === "whatsapp") {
        await sendWhatsApp(contact.phone!, personalized);
      } else {
        await sendSms(contact.phone!, personalized);
      }
      sent++;
    } catch {
      errors.push(contact.phone!);
    }
  }

  revalidatePath("/dashboard/messaging");

  if (errors.length > 0 && sent === 0) {
    return { error: `Echec d'envoi a ${errors.length} contacts.` };
  }

  return { success: true };
}
