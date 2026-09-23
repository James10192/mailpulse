/** Type guard narrowing a raw string (Radix onValueChange) to one of the allowed values. */
export function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}
