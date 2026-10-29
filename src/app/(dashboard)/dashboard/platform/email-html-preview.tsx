"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveEmailPreview } from "@/lib/mailpulse/email-preview-document";

/**
 * The HTML is isolated in an opaque-origin iframe. Text-only legacy messages
 * are previewed using MailPulse's original minimal text-to-HTML fallback.
 */
export function EmailHtmlPreview({ metadata, text }: { metadata: unknown; text: string | null }) {
  const [showSource, setShowSource] = useState(false);
  const preview = useMemo(() => resolveEmailPreview(metadata, text), [metadata, text]);
  if (!preview) return null;

  // Never allow stored HTML to run scripts, open forms or navigate the parent.
  const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data:; style-src \'unsafe-inline\'; font-src https: data:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; object-src \'none\'">';
  const document = /<head(\s[^>]*)?>/i.test(preview.html)
    ? preview.html.replace(/<head(\s[^>]*)?>/i, (match) => match + policy)
    : policy + preview.html;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm">
            {preview.kind === "html" ? "Aperçu du HTML enregistré" : "Aperçu du message texte"}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview.kind === "html"
              ? "Version HTML associée à ce message, affichée sans scripts ni formulaires."
              : "Message historique sans HTML personnalisé : rendu de lecture du texte, sans reconstituer un modèle d’établissement jamais envoyé."}
          </p>
        </div>
        {preview.kind === "html" ? (
          <Button size="sm" variant="outline" onClick={() => setShowSource((value) => !value)}>
            {showSource ? "Masquer le HTML" : "Voir le HTML"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <iframe
          title="Aperçu isolé du courriel"
          sandbox=""
          referrerPolicy="no-referrer"
          loading="lazy"
          srcDoc={document}
          className="h-[540px] w-full rounded-lg border bg-white sm:h-[650px]"
        />
        {preview.kind === "html" && showSource ? (
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
            {preview.html}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
