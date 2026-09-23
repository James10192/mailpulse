"use client";

import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { isOneOf } from "@/components/forms/one-of";

type SelectRootProps = React.ComponentProps<typeof Select>;

/**
 * Select over a string union: `values` fixes the order, `labels` names each value.
 * It renders the items itself, and only listed values reach `onValueChange`, so
 * callers never cast Radix's plain string. `children` is the trigger.
 */
export function TypedSelect<T extends string>({
  values,
  labels,
  value,
  onValueChange,
  children,
  ...props
}: Omit<SelectRootProps, "value" | "onValueChange" | "defaultValue"> & {
  values: readonly T[];
  labels: Record<T, string>;
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
    >
      {children}
      <SelectContent>
        {values.map((option) => (
          <SelectItem key={option} value={option}>
            {labels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
