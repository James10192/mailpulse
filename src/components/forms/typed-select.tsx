"use client";

import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { isOneOf } from "@/components/forms/one-of";

type SelectRootProps = React.ComponentProps<typeof Select>;

/**
 * Select over a string union, built from a `{ value: label }` map: it renders the
 * items itself, and only listed values reach `onValueChange`, so callers never
 * cast Radix's plain string. `children` is the trigger.
 */
export function TypedSelect<T extends string>({
  options,
  value,
  onValueChange,
  children,
  ...props
}: Omit<SelectRootProps, "value" | "onValueChange" | "defaultValue"> & {
  options: Record<T, string>;
  value: T;
  onValueChange: (value: T) => void;
}) {
  const values = Object.keys(options) as T[];
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
            {options[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
