"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SmsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-stack app-shell-safe">
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400"><AlertTriangle className="size-5" /></div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Les données SMS sont indisponibles</h1>
          <p className="text-sm text-muted-foreground">Réessayez dans un instant. L’envoi des messages en file n’est pas interrompu.</p>
        </div>
        <Button type="button" onClick={reset} className="h-11 gap-2"><RefreshCw className="size-4" />Réessayer</Button>
      </div>
    </div>
  );
}
