import Link from "next/link";
import { Code2, Globe2, KeyRound } from "lucide-react";

import { LinkedAccounts } from "@/components/dashboard/linked-accounts";
import { PasskeysSection } from "@/components/dashboard/passkeys-section";
import { ProfileSection } from "@/components/dashboard/profile-section";
import { ProBadge } from "@/components/dashboard/feature-gate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PLAN_LIMITS, canAccessFeature, type PlanTier } from "@/lib/plans";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SettingsPageFrame } from "./settings-page-frame";

export default async function SettingsPage() {
  const { org } = await getCurrentUserAndOrg();
  const canUseApi = org ? canAccessFeature(org.plan as PlanTier, "api_access") : false;
  const domainLimit = org ? PLAN_LIMITS[org.plan as PlanTier].domains : 0;

  return (
    <SettingsPageFrame section="general">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]">
        <div className="min-w-0 space-y-6">
          <ProfileSection />
          <LinkedAccounts />
          <PasskeysSection />
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
              <CardDescription>Paramètres utilisés par défaut dans vos envois.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organization-name">Nom de l&apos;organisation</Label>
                <Input id="organization-name" placeholder="Mon entreprise" defaultValue={org?.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-from">Email par défaut</Label>
                <Input id="default-from" type="email" placeholder="newsletter@mondomaine.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="h-5 w-5 text-orange-500" />
                    Domaines d&apos;envoi
                  </CardTitle>
                  <CardDescription className="mt-1">
                    SPF, DKIM et DMARC pour protéger votre délivrabilité.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {domainLimit !== 0 ? (
                <Alert>
                  <Globe2 className="h-4 w-4" />
                  <AlertTitle>Aucun domaine configuré</AlertTitle>
                  <AlertDescription>
                    Ajoutez votre domaine pour signer vos emails et améliorer la réception.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="warning">
                  <Globe2 className="h-4 w-4" />
                  <AlertTitle>Organisation introuvable</AlertTitle>
                  <AlertDescription>
                    Connectez-vous à une organisation pour gérer vos domaines d&apos;envoi.
                  </AlertDescription>
                </Alert>
              )}
              <Button asChild variant="outline" className="min-h-11 w-full justify-center">
                <Link href="/dashboard/domains">Gérer les domaines</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-orange-500" />
                    Clés API
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Connexion de vos applications à MailPulse.
                  </CardDescription>
                </div>
                {!canUseApi ? <ProBadge /> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUseApi ? (
                <Alert variant="success">
                  <Code2 className="h-4 w-4" />
                  <AlertTitle>API disponible</AlertTitle>
                  <AlertDescription>
                    Générez une clé et gardez-la dans votre gestionnaire de secrets.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="warning">
                  <Code2 className="h-4 w-4" />
                  <AlertTitle>Accès réservé au plan Pro</AlertTitle>
                  <AlertDescription>
                    Les clés API sont disponibles avec le plan Pro.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <Button disabled={!canUseApi} className="min-h-11 w-full">
                <KeyRound className="h-4 w-4" />
                Générer une clé API
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SettingsPageFrame>
  );
}
