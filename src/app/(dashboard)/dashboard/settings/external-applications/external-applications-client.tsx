"use client";

import { Plug, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ApplicationCard } from "./application-card";
import { CreateApplicationDialog } from "./create-application-dialog";
import type { ApplicationView } from "./types";

export function ExternalApplicationsClient({
  applications,
  canManage,
}: {
  applications: ApplicationView[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {applications.length === 0
            ? "Aucune application externe pour le moment."
            : `${applications.length} application${applications.length > 1 ? "s" : ""} externe${
                applications.length > 1 ? "s" : ""
              } dans votre organisation.`}
        </p>
        {canManage && applications.length > 0 ? <CreateApplicationDialog /> : null}
      </div>

      {!canManage ? (
        <div className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Vous consultez cette page en lecture seule. La gestion des applications externes est réservée aux
            propriétaires et administrateurs de l&apos;organisation.
          </p>
        </div>
      ) : null}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
              <Plug className="h-6 w-6 text-orange-500" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Connectez une application partenaire
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Une application externe (ex. KLASSCI) envoie des commandes signées à MailPulse, relie son compte Meta
              WhatsApp, reçoit les événements entrants sur ses endpoints de rappel et mappe ses opérations métier sur
              des templates approuvés.
            </p>
            {canManage ? (
              <div className="mt-6 flex justify-center">
                <CreateApplicationDialog />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        applications.map((application) => (
          <ApplicationCard key={application.id} application={application} canManage={canManage} />
        ))
      )}
    </div>
  );
}
