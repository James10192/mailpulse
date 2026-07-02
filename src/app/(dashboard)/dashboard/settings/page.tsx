import Link from "next/link";

import { LinkedAccounts } from "@/components/dashboard/linked-accounts";
import { PasskeysSection } from "@/components/dashboard/passkeys-section";
import { ProfileSection } from "@/components/dashboard/profile-section";
import { ProBadge } from "@/components/dashboard/feature-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canAccessFeature, type PlanTier } from "@/lib/plans";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SettingsPageFrame } from "./settings-page-frame";

export default async function SettingsPage() {
  const { org } = await getCurrentUserAndOrg();
  const canUseApi = org ? canAccessFeature(org.plan as PlanTier, "api_access") : false;
  const canUseDomains = org ? canAccessFeature(org.plan as PlanTier, "custom_domain") : false;

  return (
    <SettingsPageFrame section="general">
      <ProfileSection />
      <LinkedAccounts />
      <PasskeysSection />

      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization-name">Nom de l&apos;organisation</Label>
            <Input id="organization-name" placeholder="Mon entreprise" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-from">Email par défaut (From)</Label>
            <Input id="default-from" type="email" placeholder="newsletter@mondomaine.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Domaines d&apos;envoi</CardTitle>
            {!canUseDomains && <ProBadge />}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/domains">Gérer les domaines</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Configurez SPF, DKIM et DMARC pour vos domaines d&apos;envoi afin
            d&apos;améliorer la délivrabilité.
          </p>
          {!canUseDomains ? (
            <div className="rounded-lg border border-dashed border-orange-500/30 bg-orange-500/5 p-4 text-center text-sm text-zinc-500">
              Passez au plan Pro pour configurer vos propres domaines d&apos;envoi.
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
              Aucun domaine configuré
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Clés API</CardTitle>
            {!canUseApi && <ProBadge />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gérez vos clés API pour l&apos;intégration avec vos applications.
          </p>
          {canUseApi ? (
            <Button variant="secondary">Générer une clé API</Button>
          ) : (
            <div className="rounded-lg border border-dashed border-orange-500/30 bg-orange-500/5 p-4 text-center text-sm text-zinc-500">
              Passez au plan Pro pour accéder à l&apos;API.
            </div>
          )}
        </CardContent>
      </Card>
    </SettingsPageFrame>
  );
}
