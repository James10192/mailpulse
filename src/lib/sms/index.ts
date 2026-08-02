import { OrangeSmsProvider } from "./orange";
import type { SmsProviderClient } from "./types";

export function smsProviderFor(provider: "ORANGE_CI"): SmsProviderClient {
  switch (provider) {
    case "ORANGE_CI":
      return new OrangeSmsProvider();
  }
}

export * from "./types";
export * from "./metrics";
