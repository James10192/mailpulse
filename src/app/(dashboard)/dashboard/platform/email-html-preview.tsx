"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Renders the exact email_html submitted to MailPulse in an opaque-origin,
 * script-free iframe. Never inject provider HTML into the dashboard DOM.
 * Historic text-only messages have a clearly labelled neutral text rendering.
 * Never claim a branded HTML layout that the provider did not receive.
 */
export function EmailHtmlPreview({ metadata, text }: { metadata: unknown; text?: string | null }) {
  const [showSource, setShowSource] = useState(false);
  const html = useMemo(() => {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const value = (metadata as Record<string, unknown>).email_html;
    return typeof value === "string" && value.trim() && value.length <= 500_000 ? value : null;
  }, [metadata]);

  const texte = typeof text === "string" && text.trim().length > 0 ? text : null;
  if (!html && !texte) return null;

  // Do not interpret historical plaintext as markup. It must never run
  // arbitrary HTML, JS or CSS in the operator's MailPulse session.
  const escaped = (texte ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
  const textPreview = '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<style>body{margin:0;padding:28px 16px;background:#f1f5f9;color:#1e293b;font:15px/1.7 system-ui,sans-serif}'
    + 'article{max-width:620px;margin:0 auto;background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:14px}'
    + 'pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:0}</style></head><body>'
    + '<article><pre>' + escaped + '</pre></article></body></html>';

  // A restrictive sandbox is enforced by the iframe, not by trusting HTML.
  // Disallow active content, forms, top navigation, same-origin and JS.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'">`;
  const preview = html ? (html.includes("<head") ? html.replace(/<head(\s[^>]*)?>/i, (match) => match + policy) : policy + html) : policy + textPreview;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm">{html ? "Aperçu réel du courriel HTML" : "Aperçu du message texte envoyé"}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{html ? "Aperçu isolé du HTML transmis au fournisseur." : "Ce message historique ne contient pas de HTML. Le texte est affiché sans inventer de mise en page d'établissement."} Aucune réexpédition.</p>
        </div>
        {html ? <Button size="sm" variant="outline" onClick={() => setShowSource((v) => !v)}>
          {showSource ? "Masquer le HTML" : "Voir le HTML"}
        </Button> : null}
      </CardHeader>
      <CardContent>
        <iframe title="Aperçu du courriel envoyé" sandbox="" referrerPolicy="no-referrer"
          loading="lazy" srcDoc={preview}
          className="h-[540px] w-full rounded-lg border bg-white sm:h-[650px]" />
        {showSource && html ? <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{html}</pre> : null}
      </CardContent>
    </Card>
  );
}
