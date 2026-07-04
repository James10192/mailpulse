"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PaystackUpgradeButton() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpgrade() {
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/billing/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "PRO" }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { authorizationUrl?: string; error?: string }
      | null;

    if (!response.ok || !payload?.authorizationUrl) {
      setPending(false);
      setMessage(payload?.error ?? "Paiement impossible pour le moment.");
      return;
    }

    window.location.href = payload.authorizationUrl;
  }

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" onClick={handleUpgrade} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Ouverture Paystack..." : "Payer avec Paystack"}
      </Button>
      {message ? <p className="text-xs text-red-600 dark:text-red-400">{message}</p> : null}
    </div>
  );
}

export function PaystackReturnVerifier() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("paystack_reference") ?? searchParams.get("reference");
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">(
    reference ? "checking" : "idle"
  );

  useEffect(() => {
    if (!reference || status !== "checking") return;

    let cancelled = false;

    fetch("/api/billing/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Verification failed");
        if (!cancelled) {
          setStatus("success");
          router.replace("/dashboard/settings/billing");
          router.refresh();
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reference, router, status]);

  if (status === "idle") return null;

  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground">
      {status === "checking" ? "Vérification du paiement Paystack..." : null}
      {status === "success" ? "Paiement confirmé, plan mis à jour." : null}
      {status === "error" ? "Paiement non confirmé. Réessayez ou contactez le support." : null}
    </div>
  );
}
