type TransportFlag = "ORANGE_SMS_ENABLED";

function isTransportEnabled(flag: TransportFlag) {
  return process.env[flag]?.trim() === "true";
}

export function isOrangeSmsEnabled() {
  return isTransportEnabled("ORANGE_SMS_ENABLED");
}
