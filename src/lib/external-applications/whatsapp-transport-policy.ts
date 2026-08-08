/**
 * Transport-shaped decisions for the external application WhatsApp rail, kept
 * dependency-free so the rules that decide what a parent finally reads are
 * directly testable without a database or an HTTP client.
 */

export type WhatsAppTransportKind = "meta" | "baileys";

export type WhatsAppTemplateRenderReason =
  | "empty_body"
  | "invalid_placeholder"
  | "missing_parameter"
  | "unused_parameter";

export type WhatsAppTemplateRender =
  | { ok: true; text: string }
  | { ok: false; reason: WhatsAppTemplateRenderReason; rejectionCode: string };

const TEMPLATE_REJECTION_CODES: Record<WhatsAppTemplateRenderReason, string> = {
  empty_body: "whatsapp_template_body_empty",
  invalid_placeholder: "whatsapp_template_placeholder_invalid",
  missing_parameter: "whatsapp_template_parameter_missing",
  unused_parameter: "whatsapp_template_parameter_unused",
};

const PLACEHOLDER = /\{\{([^{}]*)\}\}/g;

/**
 * Meta refuses free-form text outside the 24h service window. A Baileys session
 * is a WhatsApp Web client with no such window, so applying the gate there would
 * silently drop replies the transport would have delivered.
 */
export function requiresWhatsAppServiceWindow(providerKind: WhatsAppTransportKind, contentType: "text" | "template") {
  return providerKind === "meta" && contentType === "text";
}

/**
 * Baileys has no approved-template concept, so the configured template id is
 * read as a body carrying {{1}}, {{2}}... markers. Any mismatch between markers
 * and parameters fails the whole render: a parent must never receive a message
 * still showing its own placeholder syntax.
 */
export function renderWhatsAppTextTemplate(body: string, parameters: readonly string[]): WhatsAppTemplateRender {
  if (!body.trim()) return renderFailure("empty_body");

  const used = new Set<number>();
  for (const match of body.matchAll(PLACEHOLDER)) {
    const index = placeholderIndex(match[1]);
    if (index === null) return renderFailure("invalid_placeholder");
    if (index > parameters.length) return renderFailure("missing_parameter");
    used.add(index);
  }

  // A stray brace left once every well-formed marker is removed means the author
  // mistyped the syntax, which would reach the recipient verbatim.
  if (/[{}]/.test(body.replace(PLACEHOLDER, ""))) return renderFailure("invalid_placeholder");
  if (used.size !== parameters.length) return renderFailure("unused_parameter");

  // Single pass, so a parameter value is never re-scanned for markers of its
  // own: substitution must not be able to expand into further substitution.
  const text = body
    .replace(PLACEHOLDER, (match: string, raw: string) => {
      const index = placeholderIndex(raw);
      return index === null ? match : parameters[index - 1];
    })
    .trim();

  // The guarantee the whole render exists for: whatever the caller sent, the
  // recipient never reads template syntax.
  if (/[{}]/.test(text)) return renderFailure("invalid_placeholder");
  return text ? { ok: true, text } : renderFailure("empty_body");
}

function renderFailure(reason: WhatsAppTemplateRenderReason): WhatsAppTemplateRender {
  return { ok: false, reason, rejectionCode: TEMPLATE_REJECTION_CODES[reason] };
}

function placeholderIndex(raw: string | undefined): number | null {
  const trimmed = raw?.trim() ?? "";
  // {{0}} and multi-hundred indices are authoring mistakes, not addressable
  // parameters, so they are rejected rather than silently rendered.
  return /^[1-9]\d{0,2}$/.test(trimmed) ? Number(trimmed) : null;
}
