import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type MailPulseLogoProps = ComponentPropsWithoutRef<"span"> & {
  sizes?: string;
};

export function MailPulseLogo({ className, sizes = "40px", ...props }: MailPulseLogoProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0", className)}
      {...props}
    >
      <Image
        alt=""
        className="object-contain dark:hidden"
        fill
        sizes={sizes}
        src="/brand/mailpulse-mark-light.png"
      />
      <Image
        alt=""
        className="hidden object-contain dark:block"
        fill
        sizes={sizes}
        src="/brand/mailpulse-mark-dark.png"
      />
    </span>
  );
}
