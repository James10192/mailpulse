/**
 * The sign-in email: a 6-digit code AND a link that fills that code in.
 *
 * The link carries the code in the URL fragment (`#code=`), which browsers
 * never send to the server: it stays out of access logs, proxies and
 * analytics. Opening it on the device that asked for the code signs in with
 * one tap; on another device, the code is typed by hand.
 */

const EXPIRATION_MINUTES = 10;

export const CONNEXION_CODE_TTL_SECONDS = EXPIRATION_MINUTES * 60;

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function lienConnexion(baseUrl: string, email: string, code: string): string {
  const fragment = new URLSearchParams({ email, code }).toString();

  return `${baseUrl.replace(/\/$/, "")}/login/verifier#${fragment}`;
}

export function courrielConnexion(params: { email: string; code: string; lien: string }) {
  const { code, lien } = params;
  // Code first: readable in the notification, and offered for autofill by
  // iOS and Android.
  const subject = `${code} est votre code MailPulse`;
  const preheader = `Valable ${EXPIRATION_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`;
  const text = [
    "Votre code de connexion MailPulse :",
    "",
    code,
    "",
    `Ou connectez-vous directement : ${lien}`,
    "",
    `Le code et le lien expirent dans ${EXPIRATION_MINUTES} minutes et ne fonctionnent qu'une fois.`,
    "Ce n'était pas vous ? Ignorez cet e-mail : personne ne peut se connecter sans ce code.",
  ].join("\n");

  // Light body on purpose: dark emails render badly in Outlook. No tracking
  // pixel, no tracked link — this email must be trusted and scanners that
  // pre-open links must not use it up (the link lands on a confirm page).
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;">
      <tr><td style="padding:32px 32px 0;">
        <div style="font-size:15px;font-weight:600;color:#18181b;letter-spacing:-0.01em;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#f97316;margin-right:8px;vertical-align:middle;"></span>MailPulse
        </div>
      </td></tr>
      <tr><td style="padding:24px 32px 0;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:600;color:#18181b;letter-spacing:-0.02em;">Votre code de connexion</h1>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#52525b;">Saisissez ce code dans l'onglet MailPulse ouvert :</p>
      </td></tr>
      <tr><td style="padding:20px 32px 0;">
        <div style="background:#f4f4f5;border-radius:12px;padding:20px;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:600;letter-spacing:0.3em;color:#18181b;">${escape(code)}</div>
      </td></tr>
      <tr><td style="padding:24px 32px 0;">
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#52525b;">Ou connectez-vous directement :</p>
        <a href="${escape(lien)}" style="display:block;background:#ea580c;color:#ffffff;text-decoration:none;text-align:center;font-weight:600;font-size:15px;padding:14px 20px;border-radius:10px;">Se connecter à MailPulse</a>
      </td></tr>
      <tr><td style="padding:24px 32px 32px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">Le code et le lien expirent dans ${EXPIRATION_MINUTES} minutes et ne fonctionnent qu'une fois.<br>Ce n'était pas vous ? Ignorez cet e-mail : personne ne peut se connecter sans ce code.</p>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">MailPulse · e-mail, WhatsApp et SMS depuis une seule plateforme</p>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
