import { NextRequest } from "next/server";
import { sendEmail } from "@/lib/resend";

const CONTACT_RECIPIENTS = [
  "djedjelipatrick@gmail.com",
  "yablaiyablairubenvirgil@gmail.com",
];

export async function POST(request: NextRequest) {
  const { name, email, message } = await request.json();

  if (!name || !email || !message) {
    return Response.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }

  try {
    for (const recipient of CONTACT_RECIPIENTS) {
      await sendEmail({
        to: recipient,
        from: "MailPulse Contact <onboarding@resend.dev>",
        subject: `[MailPulse Contact] Message de ${name}`,
        replyTo: email,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Nouveau message de contact</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; color: #71717a; width: 80px;">Nom</td>
                <td style="padding: 8px 0; font-weight: 600;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #71717a;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #f97316;">${email}</a></td>
              </tr>
            </table>
            <div style="padding: 16px; background: #18181b; border-radius: 8px; color: #d4d4d8; white-space: pre-wrap;">${message}</div>
            <p style="color: #52525b; font-size: 12px; margin-top: 24px;">Envoye depuis le formulaire de contact MailPulse</p>
          </div>
        `,
      });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Erreur lors de l'envoi." }, { status: 500 });
  }
}
