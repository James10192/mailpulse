"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Renders the exact email_html submitted to MailPulse in an opaque-origin,
 * script-free iframe. Never inject provider HTML into the dashboard DOM.
 * Historic text-only messages simply do not have an HTML preview.
 */
export function EmailHtmlPreview({ metadata }: { metadata: unknown }) {
  const [showSource, setShowSource] = useState(false);
  const html = useMemo(() => {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const value = (metadata as Record<string, unknown>).email_html;
    return typeof value === "string" && value.trim() && value.length <= 500_000 ? value : null;
  }, [metadata]);

  if (!html) return null;

  // A restrictive sandbox is enforced by the iframe, not by trusting HTML.
  // Disallow active content, forms, top navigation, same-origin and JS.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'">`;
  const preview = html.includes("<head") ? html.replace(/<head(\s[^>]*)?>/i, (match) => match + policy) : policy + html;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm">Aperçu réel du courriel HTML</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Aperçu isolé, sans scripts ni formulaires ; aucune réexpédition.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowSource((v) => !v)}>
          {showSource ? "Masquer le HTML" : "Voir le HTML"}
        </Button>
      </CardHeader>
      <CardContent>
        <iframe title="Aperçu du courriel envoyé" sandbox="" referrerPolicy="no-referrer"
          loading="lazy" srcDoc={preview}
          className="h-[540px] w-full rounded-lg border bg-white sm:h-[650px]" />
        {showSource ? <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{html}</pre> : null}
      </CardContent>
    </Card>
  );
}
