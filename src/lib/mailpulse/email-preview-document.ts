/**
 * Only a captured email_html is proof of the original HTML payload.
 * For legacy messages MailPulse sent textToHtml(text): reconstruct that
 * minimal HTML rather than pretending a KLASSCI-branded layout existed.
 */
export type EmailPreview = { kind: "html" | "text"; html: string };

export function resolveEmailPreview(metadata: unknown, text: unknown): EmailPreview | null {
  const values = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  const submittedHtml = values.email_html;
  if (typeof submittedHtml === "string" && submittedHtml.trim() && submittedHtml.length <= 500_000) {
    return { kind: "html", html: submittedHtml };
  }
  if (typeof text !== "string" || text.length === 0) return null;
  // Mirrors the fallback used by message-direct-dispatch.ts.
  return {
    kind: "text",
    html: '<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;white-space:pre-wrap;">'
      + escapeEmailText(text) + '</div>',
  };
}

function escapeEmailText(value: string): string {
  return value.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
