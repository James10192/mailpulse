import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PlanReadOnlyNotice({ feature }: { feature: string }) {
  return (
    <Alert variant="warning" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <AlertTitle>Consultation uniquement</AlertTitle>
          <AlertDescription className="text-pretty">
            {feature} reste visible avec Starter. Les actions reprennent automatiquement après le passage au plan Pro.
          </AlertDescription>
        </div>
      </div>
      <Button asChild size="sm" className="min-h-10 shrink-0">
        <Link href="/dashboard/settings/billing">Passer au Pro</Link>
      </Button>
    </Alert>
  );
}
