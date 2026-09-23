"use client";

import { Select } from "@/components/ui/select";
import { isOneOf } from "@/components/forms/one-of";

type SelectRootProps = React.ComponentProps<typeof Select>;

/**
 * Select whose value is a string union: only values listed in `values` reach
 * `onValueChange`, so callers never cast Radix's plain string.
 */
export function TypedSelect<T extends string>({
  values,
  value,
  onValueChange,
  ...props
}: Omit<SelectRootProps, "value" | "onValueChange" | "defaultValue"> & {
  values: readonly T[];
  value: T;
  onValueChange: (value: T) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isOneOf(values, next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
