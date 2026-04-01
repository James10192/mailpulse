"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { sendSmsForOrg, sendWhatsAppForOrg, activateOrgSms, type SmsChannel } from "@/lib/twilio";
import type { ActionState } from "@/types/action-state";

async function getOrgWithTwilio(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      smsEnabled: true,
      twilioSubaccountSid: true,
      twilioAuthToken: true,
      twilioPhoneNumber: true,
      twilioWhatsappNumber: true,
    },
  });
}

export async function activateSmsForOrg(countryCode = "US"): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    const result = await activateOrgSms(org.id, org.name, countryCode);
    revalidatePath("/dashboard/messaging");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur d'activation";
    return { error: msg };
  }
}

export async function sendMessage(
  channel: SmsChannel,
  to: string,
  body: string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const orgTwilio = await getOrgWithTwilio(org.id);
  if (!orgTwilio?.smsEnabled) return { error: "SMS non active. Activez d'abord dans les parametres." };

  if (!to || !body) return { error: "Numero et message requis." };

  const phone = to.replace(/\s/g, "");
  if (!phone.startsWith("+")) return { error: "Le numero doit commencer par + (ex: +225XXXXXXXXX)." };

  try {
    if (channel === "whatsapp") {
      await sendWhatsAppForOrg(orgTwilio, phone, body);
    } else {
      await sendSmsForOrg(orgTwilio, phone, body);
    }
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
  audience: "all" | string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const orgTwilio = await getOrgWithTwilio(org.id);
  if (!orgTwilio?.smsEnabled) return { error: "SMS non active." };

  if (!body) return { error: "Le message est requis." };

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

  for (const contact of withPhone) {
    try {
      const personalized = body
        .replace(/\{\{firstName\}\}/g, contact.firstName || "")
        .replace(/\{\{lastName\}\}/g, contact.lastName || "");

      if (channel === "whatsapp") {
        await sendWhatsAppForOrg(orgTwilio, contact.phone!, personalized);
      } else {
        await sendSmsForOrg(orgTwilio, contact.phone!, personalized);
      }
      sent++;
    } catch {
      // Continue sending to other contacts
    }
  }

  revalidatePath("/dashboard/messaging");

  if (sent === 0) {
    return { error: "Echec d'envoi a tous les contacts." };
  }

  return { success: true };
}
