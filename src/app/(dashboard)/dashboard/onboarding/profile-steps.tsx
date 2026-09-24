"use client";

import { Building2, Check, Globe, MessageSquare, Search, Share2, Target, Users } from "lucide-react";
import { SingleChoiceGroup } from "@/components/forms/single-choice-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DISCOVERY_SOURCES,
  FIELD_LABEL_CLASS,
  GOAL_OPTIONS,
  SUBSCRIBER_OPTIONS,
  type OnboardingStepProps,
} from "./onboarding-data";

const SUBSCRIBER_VALUES = SUBSCRIBER_OPTIONS.map((option) => option.value);

/** Step 1: company details. */
export function StepDetails({ data, onChange }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
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
        />
      </div>

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
        />
      </div>

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
        />
      </div>

      <div className="space-y-3">
        <p id="onboarding-subscribers-label" className={`${FIELD_LABEL_CLASS} text-sm font-medium text-zinc-300`}>
          <Users size={16} className="text-zinc-500" />
          Combien d&apos;abonnés avez-vous ?
        </p>
        <SingleChoiceGroup
          values={SUBSCRIBER_VALUES}
          value={data.subscriberRange}
          onValueChange={(subscriberRange) => onChange({ subscriberRange })}
          aria-labelledby="onboarding-subscribers-label"
          className="grid w-full grid-cols-2 gap-3"
        >
          {SUBSCRIBER_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} variant="choice" size="choice">
              {option.label}
            </ToggleGroupItem>
          ))}
        </SingleChoiceGroup>
      </div>

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
          className="min-h-0 resize-none"
        />
      </div>
    </div>
  );
}

/** Step 2: how the user found MailPulse and what they want to do with it. */
export function StepSurvey({ data, onChange }: OnboardingStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p id="onboarding-discovery-label" className={`${FIELD_LABEL_CLASS} text-sm font-medium text-zinc-300`}>
          <Search size={16} className="text-zinc-500" />
          Comment avez-vous connu MailPulse ?
        </p>
        <SingleChoiceGroup
          values={DISCOVERY_SOURCES}
          value={data.discoverySource}
          onValueChange={(discoverySource) => onChange({ discoverySource })}
          aria-labelledby="onboarding-discovery-label"
          className="flex w-full flex-wrap gap-2"
        >
          {DISCOVERY_SOURCES.map((source) => (
            <ToggleGroupItem key={source} value={source} variant="choice" size="choice" className="rounded-full">
              {source}
            </ToggleGroupItem>
          ))}
        </SingleChoiceGroup>
      </div>

      <div className="space-y-3">
        <p id="onboarding-goals-label" className={`${FIELD_LABEL_CLASS} text-sm font-medium text-zinc-300`}>
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
            return (
              <ToggleGroupItem
                key={goal.value}
                value={goal.value}
                variant="choice"
                size="choice"
                className="justify-start gap-3 text-left"
              >
                <Icon size={16} className="shrink-0" />
                {goal.label}
                {data.goals.includes(goal.value) && <Check size={14} className="ml-auto shrink-0" />}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
    </div>
  );
}
