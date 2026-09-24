"use client";

import { AtSign, Check, Globe, Plus, Reply, Send, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FIELD_LABEL_CLASS, type OnboardingStepProps } from "./onboarding-data";

/** Step 3: sending domain, or the shared test domain. */
export function StepDomain({ data, onChange }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Ajoutez votre propre domaine pour envoyer des emails depuis votre
        adresse professionnelle, ou utilisez notre domaine de test pour
        commencer rapidement.
      </p>

      <div className="space-y-2">
        <Label htmlFor="onboarding-domain" className={FIELD_LABEL_CLASS}>
          <Globe size={16} className="text-zinc-500" />
          Nom de domaine
        </Label>
        <Input
          id="onboarding-domain"
          type="text"
          value={data.domainName}
          onChange={(e) => onChange({ domainName: e.target.value })}
          placeholder="exemple.com"
        />
      </div>

      <Button type="button" variant="secondary" size="lg" className="w-full">
        <Plus />
        Ajouter un domaine
      </Button>

      <div className="relative flex items-center gap-4 py-2">
        <Separator className="flex-1" />
        <span className="text-xs text-zinc-500">ou</span>
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => onChange({ domainName: "test.mailpulse.app" })}
        className="w-full font-normal"
      >
        <Send />
        Utiliser test.mailpulse.app
      </Button>
    </div>
  );
}

/** Step 4: the sender shown in the "De" field. */
export function StepSender({ data, onChange }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Configurez les informations qui apparaîtront dans les emails envoyés à
        vos contacts.
      </p>

      <div className="space-y-2">
        <Label htmlFor="onboarding-sender-name" className={FIELD_LABEL_CLASS}>
          <Users size={16} className="text-zinc-500" />
          Nom de l&apos;expéditeur
        </Label>
        <Input
          id="onboarding-sender-name"
          type="text"
          value={data.senderName}
          onChange={(e) => onChange({ senderName: e.target.value })}
          placeholder="Équipe Marketing"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-sender-email" className={FIELD_LABEL_CLASS}>
          <AtSign size={16} className="text-zinc-500" />
          Adresse email
        </Label>
        <Input
          id="onboarding-sender-email"
          type="email"
          value={data.senderEmail}
          onChange={(e) => onChange({ senderEmail: e.target.value })}
          placeholder="newsletter@exemple.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-reply-to" className={FIELD_LABEL_CLASS}>
          <Reply size={16} className="text-zinc-500" />
          Adresse de réponse
          <span className="text-xs text-zinc-500">(optionnel)</span>
        </Label>
        <Input
          id="onboarding-reply-to"
          type="email"
          value={data.replyToEmail}
          onChange={(e) => onChange({ replyToEmail: e.target.value })}
          placeholder="support@exemple.com"
        />
      </div>
    </div>
  );
}

/** Step 5: confirmation. */
export function StepComplete() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-orange-600 shadow-[0_16px_40px_rgba(234,88,12,0.28)]">
          <Check size={40} className="text-white" strokeWidth={3} />
        </div>
      </div>

      <h2 className="mb-3 text-2xl font-semibold text-zinc-100">
        Félicitations !
      </h2>
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
        Votre compte MailPulse est configuré. Vous pouvez maintenant créer votre
        première campagne, importer vos contacts, ou explorer le tableau de
        bord.
      </p>

      <div className="mt-8 flex items-center gap-2 text-xs text-zinc-500">
        <Sparkles size={14} />
        Prêt à envoyer vos premiers emails
      </div>
    </div>
  );
}
