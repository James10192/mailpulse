import type { BadgeProps } from "@/components/ui/badge";

export type PlatformMessageOrigin = "api" | "platform" | "legacy";

export function messageOriginLabel(origin: PlatformMessageOrigin) {
  if (origin === "api") return "API";
  if (origin === "platform") return "Plateforme";
  return "Héritée";
}

export function messageOriginVariant(origin: PlatformMessageOrigin): BadgeProps["variant"] {
  if (origin === "api") return "default";
  if (origin === "platform") return "secondary";
  return "outline";
}
