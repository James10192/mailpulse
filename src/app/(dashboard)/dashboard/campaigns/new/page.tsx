"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, MessageCircle, Plus, Smartphone } from "lucide-react";
import { createCampaign } from "../actions";
import type { ActionState } from "@/types/action-state";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { toggleVariants } from "@/components/ui/toggle";

// A <label> wrapping a radio: the toggle "choice" style reacts to the checked radio inside it.
const CHANNEL_CARD_CLASS = toggleVariants({ variant: "choice", size: "card" });

export default function NewCampaignPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCampaign,
    null
  );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Campagnes", href: "/dashboard/campaigns" },
          { label: "Nouvelle campagne" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-zinc-500 dark:text-zinc-400">
          <Link href="/dashboard/campaigns" aria-label="Retour aux campagnes" title="Retour aux campagnes">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Nouvelle campagne
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Donnez un nom à votre campagne, puis éditez le contenu
          </p>
        </div>
      </div>

      <form action={formAction}>
        <Card>
          <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="campaign-name" className="mb-1.5 block">
              Nom de la campagne <span className="text-red-500">*</span>
            </Label>
            <Input
              id="campaign-name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Ex: Newsletter Mars 2026"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Vous pourrez éditer le sujet, le contenu et l&apos;expéditeur ensuite.
            </p>
          </div>

          <div>
            <p className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Canal de la campagne
            </p>
            <RadioGroup name="channel" defaultValue="EMAIL" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Label htmlFor="campaign-channel-email" className={CHANNEL_CARD_CLASS}>
                <RadioGroupItem id="campaign-channel-email" value="EMAIL" className="mt-1" />
                <span>
                  <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Email
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Sujet, aperçu, expéditeur et tracking email.
                  </span>
                </span>
              </Label>
              <Label htmlFor="campaign-channel-whatsapp" className={CHANNEL_CARD_CLASS}>
                <RadioGroupItem id="campaign-channel-whatsapp" value="WHATSAPP" className="mt-1" />
                <span>
                  <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <MessageCircle className="h-4 w-4 text-orange-500" />
                    WhatsApp
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Message envoyé aux contacts avec numéro WhatsApp.
                  </span>
                </span>
              </Label>
              <Label htmlFor="campaign-channel-sms" className={CHANNEL_CARD_CLASS}>
                <RadioGroupItem id="campaign-channel-sms" value="SMS" className="mt-1" />
                <span>
                  <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <Smartphone className="h-4 w-4 text-orange-500" />
                    SMS
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Texte uniquement, envoyé aux contacts avec un numéro mobile.
                  </span>
                </span>
              </Label>
            </RadioGroup>
          </div>

          {state?.error && (
            <Alert variant="destructive" className="p-3">
              {state.error}
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button asChild variant="ghost">
              <Link href="/dashboard/campaigns">Annuler</Link>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus />
                  Créer la campagne
                </>
              )}
            </Button>
          </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
