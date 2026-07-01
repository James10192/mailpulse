import type { FilonRecoveryPayload } from "./schemas";

export type RecoveryTemplateKey =
  | "filon_invoice_confirmation"
  | "filon_soft_email"
  | "filon_short_whatsapp"
  | "filon_firm_email"
  | "filon_human_action";

type TemplateContext = FilonRecoveryPayload & {
  companyName?: string;
};

export type RecoveryTemplate = {
  key: RecoveryTemplateKey;
  subject?: string;
  body: string;
};

function variables(ctx: TemplateContext) {
  return {
    clientName: ctx.clientName,
    opportunityTitle: ctx.opportunityTitle,
    amountDue: new Intl.NumberFormat("fr-FR").format(ctx.amountDue),
    currency: ctx.currency,
    dueDate: new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(ctx.dueDate),
    companyName: ctx.companyName ?? "notre equipe",
  };
}

export function renderTemplate(input: string, ctx: TemplateContext) {
  const vars = variables(ctx);
  return Object.entries(vars).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, value),
    input,
  );
}

export function defaultRecoveryTemplate(key: RecoveryTemplateKey, ctx: TemplateContext): RecoveryTemplate {
  const templates: Record<RecoveryTemplateKey, RecoveryTemplate> = {
    filon_invoice_confirmation: {
      key,
      subject: "Confirmation de facture - {{opportunityTitle}}",
      body: "Bonjour {{clientName}},<br><br>Nous vous confirmons la facture liee a {{opportunityTitle}} pour un montant de {{amountDue}} {{currency}}, avec une echeance au {{dueDate}}.<br><br>Merci de nous indiquer si un document complementaire est necessaire.<br><br>{{companyName}}",
    },
    filon_soft_email: {
      key,
      subject: "Petit rappel - {{opportunityTitle}}",
      body: "Bonjour {{clientName}},<br><br>Nous revenons vers vous au sujet du reglement de {{amountDue}} {{currency}} pour {{opportunityTitle}}, attendu le {{dueDate}}.<br><br>Si le paiement est deja en cours, vous pouvez ignorer ce message. Sinon, nous restons disponibles pour toute precision.<br><br>{{companyName}}",
    },
    filon_short_whatsapp: {
      key,
      body: "Bonjour {{clientName}}, petit rappel concernant {{opportunityTitle}}: {{amountDue}} {{currency}} attendu le {{dueDate}}. Merci pour votre retour. {{companyName}}",
    },
    filon_firm_email: {
      key,
      subject: "Relance paiement - {{opportunityTitle}}",
      body: "Bonjour {{clientName}},<br><br>Sauf erreur de notre part, le reglement de {{amountDue}} {{currency}} lie a {{opportunityTitle}} reste en attente depuis l'echeance du {{dueDate}}.<br><br>Merci de nous confirmer la date de paiement prevue afin que nous puissions mettre le dossier a jour.<br><br>{{companyName}}",
    },
    filon_human_action: {
      key,
      body: "Action humaine recommandee: verifier le paiement de {{amountDue}} {{currency}} pour {{clientName}} et remonter le statut dans Filon.",
    },
  };

  const template = templates[key];
  return {
    ...template,
    subject: template.subject ? renderTemplate(template.subject, ctx) : undefined,
    body: renderTemplate(template.body, ctx),
  };
}
