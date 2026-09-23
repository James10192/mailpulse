"use client";

import { ToggleGroup } from "@/components/ui/toggle-group";
import { isOneOf } from "@/components/forms/one-of";

type ToggleGroupSingleProps = Extract<React.ComponentProps<typeof ToggleGroup>, { type: "single" }>;

/**
 * Single-choice toggle group. `value` is one of `values`, or "" while nothing is
 * selected yet (e.g. a value only known after mount). Once an option is chosen it
 * stays chosen: Radix emits "" when the active item is clicked again, and that
 * event is ignored here. Values outside `values` never reach `onValueChange`.
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
