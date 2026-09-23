"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Share2,
  Users,
  MessageSquare,
  Search,
  Mail,
  Zap,
  Megaphone,
  Bell,
  Target,
  UserPlus,
  MoreHorizontal,
  Plus,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Send,
  AtSign,
  Reply,
} from "lucide-react";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MailPulseLogo } from "@/components/mailpulse-logo";
import { usePostHog } from "posthog-js/react";
import { EVENTS } from "@/lib/analytics-events";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingData {
  // Step 1
  organizationName: string;
  website: string;
  socialProfile: string;
  subscriberRange: string;
  usageDescription: string;
  // Step 2
  discoverySource: string;
  goals: string[];
  // Step 3
  domainName: string;
  // Step 4
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
}

const INITIAL_DATA: OnboardingData = {
  organizationName: "",
  website: "https://",
  socialProfile: "",
  subscriberRange: "",
  usageDescription: "",
  discoverySource: "",
  goals: [],
  domainName: "",
  senderName: "",
  senderEmail: "",
  replyToEmail: "",
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Détails", title: "Parlez-nous de votre entreprise" },
  { label: "Besoins", title: "Parlez-nous de vos besoins" },
  { label: "Domaine", title: "Configurez votre domaine d'envoi" },
  { label: "Expéditeur", title: "Configurez votre expéditeur" },
  { label: "Terminé", title: "Vous êtes prêt !" },
];

const SUBSCRIBER_OPTIONS = [
  { value: "<1000", label: "Moins de 1 000" },
  { value: "1000-10000", label: "1 000 - 10 000" },
  { value: "10000-250000", label: "10 000 - 250 000" },
  { value: ">250000", label: "Plus de 250 000" },
];

const DISCOVERY_SOURCES = [
  "Twitter",
  "YouTube",
  "Google",
  "Ami",
  "LinkedIn",
  "Product Hunt",
  "Autre",
];

const GOAL_OPTIONS = [
  { value: "newsletters", label: "Envoyer des newsletters", icon: Mail },
  { value: "automations", label: "Automatiser les emails", icon: Zap },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "lead-generation", label: "Lead generation", icon: Target },
  { value: "user-onboarding", label: "User onboarding", icon: UserPlus },
  { value: "autre", label: "Autre", icon: MoreHorizontal },
];

// ---------------------------------------------------------------------------
// Shared styles (the onboarding screen is always rendered on a dark canvas)
// ---------------------------------------------------------------------------

const FIELD_LABEL_CLASS = "flex items-center gap-2 text-sm font-medium text-zinc-300 dark:text-zinc-300";

const FIELD_CLASS =
  "h-auto rounded-lg bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-[inset_0_0_0_1px_rgba(39,39,42,1)] placeholder:text-zinc-600 dark:bg-zinc-900 dark:shadow-[inset_0_0_0_1px_rgba(39,39,42,1)]";

const CHOICE_CLASS =
  "h-auto border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-normal text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300 data-[state=on]:border-orange-500 data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-400 data-[state=on]:hover:border-orange-500 data-[state=on]:hover:bg-orange-500/10 data-[state=on]:hover:text-orange-400";

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const value = Math.round((current / total) * 100);
  return (
    <Progress
      value={value}
      aria-label={`Progression de l'onboarding : étape ${current} sur ${total}`}
      className="h-2 bg-zinc-800"
    />
  );
}

// ---------------------------------------------------------------------------
// Step 1 - Company details
// ---------------------------------------------------------------------------

function StepDetails({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Organization name */}
      <div className="space-y-2">
        <Label htmlFor="onboarding-organization" className={FIELD_LABEL_CLASS}>
          <Building2 size={16} className="text-zinc-500" />
          Nom de l&apos;organisation
        </Label>
        <Input
          id="onboarding-organization"
          type="text"
          value={data.organizationName}
          onChange={(e) => onChange({ organizationName: e.target.value })}
          placeholder="Acme Inc."
          className={FIELD_CLASS}
        />
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="onboarding-website" className={FIELD_LABEL_CLASS}>
          <Globe size={16} className="text-zinc-500" />
          Site web
        </Label>
        <Input
          id="onboarding-website"
          type="url"
          value={data.website}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="https://example.com"
          className={FIELD_CLASS}
        />
      </div>

      {/* Social media */}
      <div className="space-y-2">
        <Label htmlFor="onboarding-social" className={FIELD_LABEL_CLASS}>
          <Share2 size={16} className="text-zinc-500" />
          Profil de réseau social
        </Label>
        <Input
          id="onboarding-social"
          type="text"
          value={data.socialProfile}
          onChange={(e) => onChange({ socialProfile: e.target.value })}
          placeholder="https://twitter.com/acme"
          className={FIELD_CLASS}
        />
      </div>

      {/* Subscriber range */}
      <div className="space-y-3">
        <p id="onboarding-subscribers-label" className={FIELD_LABEL_CLASS}>
          <Users size={16} className="text-zinc-500" />
          Combien d&apos;abonnés avez-vous ?
        </p>
        <ToggleGroup
          type="single"
          value={data.subscriberRange}
          // Radix emits "" when the active item is clicked again; keep the current choice.
          onValueChange={(value) => {
            if (value) onChange({ subscriberRange: value });
          }}
          aria-labelledby="onboarding-subscribers-label"
          className="grid w-full grid-cols-2 gap-3"
        >
          {SUBSCRIBER_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={cn(CHOICE_CLASS, "rounded-lg")}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Usage description */}
      <div className="space-y-2">
        <Label htmlFor="onboarding-usage" className={FIELD_LABEL_CLASS}>
          <MessageSquare size={16} className="text-zinc-500" />
          Comment allez-vous utiliser MailPulse ?
        </Label>
        <Textarea
          id="onboarding-usage"
          value={data.usageDescription}
          onChange={(e) => onChange({ usageDescription: e.target.value })}
          placeholder="Décrivez brièvement votre cas d'utilisation..."
          rows={3}
          className={cn(FIELD_CLASS, "min-h-0 resize-none border-0 dark:border-0")}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 - Survey / needs
// ---------------------------------------------------------------------------

function StepSurvey({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Discovery source */}
      <div className="space-y-3">
        <p id="onboarding-discovery-label" className={FIELD_LABEL_CLASS}>
          <Search size={16} className="text-zinc-500" />
          Comment avez-vous connu MailPulse ?
        </p>
        <ToggleGroup
          type="single"
          value={data.discoverySource}
          // Radix emits "" when the active item is clicked again; keep the current choice.
          onValueChange={(value) => {
            if (value) onChange({ discoverySource: value });
          }}
          aria-labelledby="onboarding-discovery-label"
          className="flex w-full flex-wrap gap-2"
        >
          {DISCOVERY_SOURCES.map((source) => (
            <ToggleGroupItem
              key={source}
              value={source}
              className={cn(CHOICE_CLASS, "rounded-full py-2")}
            >
              {source}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Goals (multi-select) */}
      <div className="space-y-3">
        <p id="onboarding-goals-label" className={FIELD_LABEL_CLASS}>
          <Target size={16} className="text-zinc-500" />
          Que souhaitez-vous faire ?
        </p>
        <p className="text-xs text-zinc-500">
          Sélectionnez tous les objectifs qui vous correspondent.
        </p>
        <ToggleGroup
          type="multiple"
          value={data.goals}
          onValueChange={(goals) => onChange({ goals })}
          aria-labelledby="onboarding-goals-label"
          className="grid w-full grid-cols-2 gap-3"
        >
          {GOAL_OPTIONS.map((goal) => {
            const Icon = goal.icon;
            const selected = data.goals.includes(goal.value);
            return (
              <ToggleGroupItem
                key={goal.value}
                value={goal.value}
                className={cn(CHOICE_CLASS, "justify-start gap-3 rounded-lg text-left whitespace-normal")}
              >
                <Icon size={16} className="shrink-0" />
                {goal.label}
                {selected && <Check size={14} className="ml-auto shrink-0" />}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 - Domain
// ---------------------------------------------------------------------------

function StepDomain({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
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
          className={FIELD_CLASS}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-auto w-full border border-orange-500 bg-orange-500/10 py-3 text-orange-400 shadow-none hover:bg-orange-500/20 hover:text-orange-400 hover:shadow-none dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
      >
        <Plus size={16} />
        Ajouter un domaine
      </Button>

      <div className="relative flex items-center gap-4 py-2">
        <Separator className="flex-1 bg-zinc-800 dark:bg-zinc-800" />
        <span className="text-xs text-zinc-600">ou</span>
        <Separator className="flex-1 bg-zinc-800 dark:bg-zinc-800" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange({ domainName: "test.mailpulse.app" })}
        className="h-auto w-full border border-zinc-800 bg-zinc-900 py-3 font-normal text-zinc-400 shadow-none hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300 hover:shadow-none dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        <Send size={16} />
        Utiliser test.mailpulse.app
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 - Sender configuration
// ---------------------------------------------------------------------------

function StepSender({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
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
          className={FIELD_CLASS}
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
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-reply-to" className={FIELD_LABEL_CLASS}>
          <Reply size={16} className="text-zinc-500" />
          Adresse de réponse
          <span className="text-xs text-zinc-600">(optionnel)</span>
        </Label>
        <Input
          id="onboarding-reply-to"
          type="email"
          value={data.replyToEmail}
          onChange={(e) => onChange({ replyToEmail: e.target.value })}
          placeholder="support@exemple.com"
          className={FIELD_CLASS}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 - Complete
// ---------------------------------------------------------------------------

function StepComplete() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {/* Success animation */}
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

      <div className="mt-8 flex items-center gap-2 text-xs text-zinc-600">
        <Sparkles size={14} />
        Prêt à envoyer vos premiers emails
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Onboarding Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const posthog = usePostHog();

  function handleChange(patch: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleContinue() {
    if (step < STEPS.length - 1) {
      posthog?.capture(EVENTS.ONBOARDING_STEP_COMPLETED, {
        step: step + 1,
        step_name: STEPS[step].label,
      });
      setStep((s) => s + 1);
    } else {
      posthog?.capture(EVENTS.ONBOARDING_COMPLETED, {
        subscriber_range: data.subscriberRange,
        goals: data.goals,
        discovery_source: data.discoverySource,
      });
      // Final step, redirect to dashboard
      // TODO: persist onboarding data via API call
      router.push("/dashboard");
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(249,115,22,0.14),transparent)]" />
      <div className="w-full max-w-lg">
        <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Onboarding" }]} />
        {/* Logo / Brand */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <MailPulseLogo className="h-10 w-[4.2rem]" sizes="68px" />
          <span className="text-lg font-semibold text-zinc-100">
            Mail<span className="text-[var(--mailpulse-signal)]">Pulse</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <ProgressBar current={step + 1} total={STEPS.length} />
          <p className="mt-3 text-center text-xs text-zinc-500">
            Étape {step + 1} sur {STEPS.length} · {STEPS[step].label}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-zinc-950/95 p-8 shadow-[var(--shadow-overlay)] ring-1 ring-white/10">
          {/* Step title */}
          {step < STEPS.length - 1 && (
            <h1 className="mb-6 text-xl font-semibold text-zinc-100">
              {STEPS[step].title}
            </h1>
          )}

          {/* Step content */}
          {step === 0 && (
            <StepDetails data={data} onChange={handleChange} />
          )}
          {step === 1 && (
            <StepSurvey data={data} onChange={handleChange} />
          )}
          {step === 2 && (
            <StepDomain data={data} onChange={handleChange} />
          )}
          {step === 3 && (
            <StepSender data={data} onChange={handleChange} />
          )}
          {step === 4 && <StepComplete />}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 && !isLastStep ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="h-auto border border-zinc-800 bg-zinc-900 px-5 py-2.5 font-normal text-zinc-400 shadow-none hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300 hover:shadow-none dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <ArrowLeft size={16} />
                Retour
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              onClick={handleContinue}
              className={cn(
                "h-auto px-6 py-2.5",
                isLastStep ? "w-full" : "ml-auto shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]",
              )}
            >
              {isLastStep ? (
                <>
                  Accéder au dashboard
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <p className="mt-4 text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => router.push("/dashboard")}
              className="h-auto p-0 text-xs font-normal text-zinc-600 hover:text-zinc-400"
            >
              Passer cette étape
            </Button>
          </p>
        )}
      </div>
    </div>
  );
}
