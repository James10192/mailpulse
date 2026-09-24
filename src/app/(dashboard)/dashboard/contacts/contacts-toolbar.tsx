"use client";

import { ArrowUpDown, ChevronDown, Search, Tag } from "lucide-react";
import { SingleChoiceGroup } from "@/components/forms/single-choice-group";
import { isOneOf } from "@/components/forms/one-of";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  ALL_TAGS,
  SORT_LABELS,
  SORT_OPTIONS,
  SUBSCRIPTION_FILTERS,
  SUBSCRIPTION_LABELS,
  type ContactFilters,
  type ContactTag,
} from "./contacts-filtering";

// Highlights the tag filter trigger while a tag is selected.
const FILTER_ACTIVE_CLASS =
  "border-orange-500/30 bg-orange-500/10 text-orange-600 shadow-none hover:bg-orange-500/15 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/15";

export function ContactsToolbar({
  filters,
  tags,
  onChange,
}: {
  filters: ContactFilters;
  tags: ContactTag[];
  onChange: (patch: Partial<ContactFilters>) => void;
}) {
  const tagActive = filters.tag !== ALL_TAGS;

  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Rechercher un contact..."
            aria-label="Rechercher un contact"
            className="pl-10 pr-4"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("w-full sm:w-auto justify-between font-normal", tagActive ? FILTER_ACTIVE_CLASS : "text-zinc-500")}
            >
              <Tag />
              {tagActive ? tags.find((t) => t.id === filters.tag)?.name : "Tags"}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuRadioGroup value={filters.tag} onValueChange={(tag) => onChange({ tag })}>
              <DropdownMenuRadioItem value={ALL_TAGS} className="text-xs">
                Tous les tags
              </DropdownMenuRadioItem>
              {tags.length > 0 && <DropdownMenuSeparator />}
              {tags.map((tag) => (
                <DropdownMenuRadioItem key={tag.id} value={tag.id} className="text-xs">
                  {tag.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto justify-between font-normal text-zinc-500">
              <ArrowUpDown />
              {SORT_LABELS[filters.sort]}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuRadioGroup
              value={filters.sort}
              onValueChange={(sort) => {
                if (isOneOf(SORT_OPTIONS, sort)) onChange({ sort });
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option} className="text-xs">
                  {SORT_LABELS[option]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SingleChoiceGroup
        values={SUBSCRIPTION_FILTERS}
        value={filters.subscription}
        onValueChange={(subscription) => onChange({ subscription })}
        aria-label="Filtrer par statut d'abonnement"
        className="flex-wrap gap-2"
      >
        {SUBSCRIPTION_FILTERS.map((option) => (
          <ToggleGroupItem key={option} value={option} variant="choice" size="choice-sm">
            {SUBSCRIPTION_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </SingleChoiceGroup>
    </div>
  );
}
