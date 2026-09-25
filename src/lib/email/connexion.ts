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

/** « 25 sept. 2026 à 16:22 (UTC) » — the time the request reached the server. */
function horodatage(date: Date): string {
  const jour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(date);

  return `${jour} à ${heure} (UTC)`;
}

export function courrielConnexion(params: { email: string; code: string; lien: string; baseUrl: string; demandeLe?: Date }) {
  const { email, code, lien } = params;
  const base = params.baseUrl.replace(/\/$/, "");
  const quand = horodatage(params.demandeLe ?? new Date());
  // Code first: readable in the notification, and offered for autofill by
  // iOS and Android.
  const subject = `${code} est votre code MailPulse`;
  const preheader = `Valable ${EXPIRATION_MINUTES} minutes, une seule fois. Ce n'était pas vous ? Ignorez cet e-mail.`;
  const text = [
    "MailPulse : votre code de connexion",
    "",
    code,
    "",
    `Connexion directe : ${lien}`,
    "",
    `Demandé le ${quand} pour ${email}.`,
    `Le code et le lien expirent dans ${EXPIRATION_MINUTES} minutes et ne fonctionnent qu'une fois.`,
    "Ce n'était pas vous ? Ignorez cet e-mail : personne ne peut se connecter sans ce code.",
  ].join("\n");

  const mono = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
  const sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const chiffres = code
    .split("")
    .map(
      (c) =>
        `<td style="padding:0 3px;"><div style="width:46px;height:58px;line-height:58px;border:1px solid #e4e4e7;border-radius:12px;background:#fafafa;text-align:center;font-family:${mono};font-size:28px;font-weight:700;color:#09090b;">${escape(c)}</div></td>`,
    )
    .join("");

  // Light body on purpose: dark emails render badly in Outlook. The header is
  // dark with bgcolor attributes, which every client keeps. No tracking pixel,
  // no tracked link: this email must be trusted, and scanners that pre-open
  // links must not use it up (the link lands on a confirm page).
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escape(subject)}</title>
<style>
  @media (max-width:520px){
    .mp-pad{padding-left:24px!important;padding-right:24px!important;}
    .mp-cell div{width:40px!important;height:52px!important;line-height:52px!important;font-size:24px!important;}
    .mp-h1{font-size:24px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${sans};-webkit-font-smoothing:antialiased;">
<span style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f4f5" style="background:#f4f4f5;">
  <tr><td align="center" style="padding:40px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td bgcolor="#09090b" style="background:#09090b;border-radius:20px 20px 0 0;padding:26px 36px;" class="mp-pad">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td valign="middle">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle" style="padding-right:12px;"><img src="${escape(base)}/brand/mailpulse-mark-dark.png" width="44" height="26" alt="" style="display:block;border:0;width:44px;height:26px;"></td>
              <td valign="middle" style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#fafafa;">Mail<span style="color:#f97316;">Pulse</span></td>
            </tr></table>
          </td>
          <td align="right" valign="middle" style="font-family:${mono};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Connexion sécurisée</td>
        </tr></table>
      </td></tr>
      <tr><td bgcolor="#f97316" style="background:#f97316;height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
      <tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid #e4e4e7;border-top:0;border-radius:0 0 20px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td class="mp-pad" style="padding:36px 36px 0;">
            <p style="margin:0;font-family:${mono};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#ea580c;">Code de connexion</p>
            <h1 class="mp-h1" style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.03em;color:#09090b;">Votre code est prêt</h1>
            <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#52525b;">Saisissez-le dans l'onglet MailPulse ouvert pour vous connecter avec <strong style="color:#18181b;">${escape(email)}</strong>.</p>
          </td></tr>
          <tr><td align="center" style="padding:28px 16px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" class="mp-cell"><tr>${chiffres}</tr></table>
            <p style="margin:12px 0 0;font-family:${mono};font-size:12px;color:#71717a;">Valable ${EXPIRATION_MINUTES} minutes · usage unique</p>
          </td></tr>
          <tr><td class="mp-pad" style="padding:28px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="border-top:1px solid #f4f4f5;font-size:0;line-height:0;">&nbsp;</td>
              <td width="40" align="center" style="font-size:12px;color:#a1a1aa;">ou</td>
              <td style="border-top:1px solid #f4f4f5;font-size:0;line-height:0;">&nbsp;</td>
            </tr></table>
          </td></tr>
          <tr><td class="mp-pad" style="padding:20px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" bgcolor="#f97316" style="background:#f97316;border-radius:12px;">
                <a href="${escape(lien)}" style="display:block;padding:15px 20px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Se connecter à MailPulse &rarr;</a>
              </td>
            </tr></table>
            <p style="margin:10px 0 0;text-align:center;font-size:12px;color:#a1a1aa;">Un seul appui suffit sur cet appareil.</p>
          </td></tr>
          <tr><td class="mp-pad" style="padding:28px 36px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td bgcolor="#fafafa" style="background:#fafafa;border:1px solid #f4f4f5;border-radius:12px;padding:16px 18px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#18181b;">Ce n'était pas vous ?</p>
                <p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#71717a;">Demande reçue le ${escape(quand)}. Ignorez simplement cet e-mail : personne ne peut se connecter sans ce code, et il expirera tout seul.</p>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:28px 24px 0;">
        <img src="${escape(base)}/brand/mailpulse-icon-light.png" width="44" height="44" alt="" style="display:block;border:0;width:44px;height:44px;margin:0 auto;">
        <p style="margin:10px 0 0;font-size:13px;font-weight:600;color:#3f3f46;">MailPulse</p>
        <p style="margin:4px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">E-mail et WhatsApp depuis une seule plateforme, avec le suivi de chaque message.</p>
        <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#a1a1aa;">Vous recevez cet e-mail parce qu'une connexion a été demandée avec ${escape(email)}.<br><a href="${escape(base)}" style="color:#71717a;text-decoration:underline;">${escape(base.replace(/^https?:\/\//, ""))}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
