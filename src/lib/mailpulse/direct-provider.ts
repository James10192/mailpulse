export type DirectProviderChannel = "EMAIL" | "WHATSAPP";
export type WhatsAppProviderMode = "BAILEYS" | "META";

export function directProvider(
  channel: DirectProviderChannel,
  whatsappMode?: WhatsAppProviderMode,
) {
  if (channel === "EMAIL") return "RESEND";
  return whatsappMode === "META" ? "META_CLOUD" : "EVOLUTION_API";
}
