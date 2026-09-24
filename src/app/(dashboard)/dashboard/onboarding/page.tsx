"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { MailPulseLogo } from "@/components/mailpulse-logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EVENTS } from "@/lib/analytics-events";
import { INITIAL_DATA, STEPS, type OnboardingData } from "./onboarding-data";
import { StepDetails, StepSurvey } from "./profile-steps";
import { StepComplete, StepDomain, StepSender } from "./sending-steps";

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <Progress
      value={Math.round((current / total) * 100)}
      aria-label={`Progression de l'onboarding : étape ${current} sur ${total}`}
      className="h-2 bg-zinc-800"
    />
  );
}

function StepContent({ step, data, onChange }: { step: number; data: OnboardingData; onChange: (patch: Partial<OnboardingData>) => void }) {
  switch (step) {
    case 0: return <StepDetails data={data} onChange={onChange} />;
    case 1: return <StepSurvey data={data} onChange={onChange} />;
    case 2: return <StepDomain data={data} onChange={onChange} />;
    case 3: return <StepSender data={data} onChange={onChange} />;
    default: return <StepComplete />;
  }
}

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
    // The onboarding is always rendered on a dark canvas: the `dark` scope lets
    // every component use its own dark styles instead of per-element overrides.
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(249,115,22,0.14),transparent)]" />
      <div className="w-full max-w-lg">
        <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Onboarding" }]} />
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <MailPulseLogo className="h-10 w-[4.2rem]" sizes="68px" />
          <span className="text-lg font-semibold text-zinc-100">
            Mail<span className="text-[var(--mailpulse-signal)]">Pulse</span>
          </span>
        </div>

        <div className="mb-6">
          <ProgressBar current={step + 1} total={STEPS.length} />
          <p className="mt-3 text-center text-xs text-zinc-500">
            Étape {step + 1} sur {STEPS.length} · {STEPS[step].label}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-950/95 p-8 shadow-[var(--shadow-overlay)] ring-1 ring-white/10">
          {!isLastStep && (
            <h1 className="mb-6 text-xl font-semibold text-zinc-100">
              {STEPS[step].title}
            </h1>
          )}

          <StepContent step={step} data={data} onChange={handleChange} />

          <div className="mt-8 flex items-center justify-between">
            {step > 0 && !isLastStep ? (
              <Button type="button" variant="outline" onClick={handleBack} className="font-normal">
                <ArrowLeft />
                Retour
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              size="lg"
              onClick={handleContinue}
              className={isLastStep ? "w-full" : "ml-auto"}
            >
              {isLastStep ? "Accéder au dashboard" : "Continuer"}
              <ArrowRight />
            </Button>
          </div>
        </div>

        {!isLastStep && (
          <p className="mt-4 text-center">
            <Button
              type="button"
              variant="link"
              size="inline"
              onClick={() => router.push("/dashboard")}
              className="text-xs font-normal text-zinc-500 hover:text-zinc-300"
            >
              Passer cette étape
            </Button>
          </p>
        )}
      </div>
    </div>
  );
}
