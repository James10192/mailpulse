"use client";

import { ToggleGroup } from "@/components/ui/toggle-group";
import { isOneOf } from "@/components/forms/one-of";

type ToggleGroupSingleProps = Extract<React.ComponentProps<typeof ToggleGroup>, { type: "single" }>;

/**
 * Single-choice toggle group that always keeps one option selected. Radix emits ""
 * when the active item is clicked again; that event is ignored here, and values
 * outside `values` never reach `onValueChange`.
 */
export function SingleChoiceGroup<T extends string>({
  values,
  value,
  onValueChange,
  ...props
}: Omit<ToggleGroupSingleProps, "type" | "value" | "onValueChange" | "defaultValue"> & {
  values: readonly T[];
  /** "" while nothing is chosen yet (e.g. a value only known after mount). */
  value: T | "";
  onValueChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next && isOneOf(values, next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
