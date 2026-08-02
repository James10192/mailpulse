export const MAX_SMS_CHARACTERS = 918;

const GSM7_BASIC_CHARACTERS = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENSION_CHARACTERS = "\f^{}\\[~]|€";

export type SmsMetrics = {
  encoding: "GSM-7" | "UCS-2";
  units: number;
  segmentCount: number;
};

export function smsMetrics(text: string): SmsMetrics {
  if (!text) return { encoding: "GSM-7", units: 0, segmentCount: 0 };

  let gsm7Units = 0;
  for (const character of text) {
    if (GSM7_BASIC_CHARACTERS.includes(character)) gsm7Units += 1;
    else if (GSM7_EXTENSION_CHARACTERS.includes(character)) gsm7Units += 2;
    else return segmentMetrics("UCS-2", text.length, 70, 67);
  }

  return segmentMetrics("GSM-7", gsm7Units, 160, 153);
}

export function smsSegmentCount(text: string) {
  return smsMetrics(text).segmentCount;
}

export function isSmsReconciliationTerminalStatus(status: string) {
  return status === "RECONCILED" || status === "DUPLICATE_CONFIRMED";
}

function segmentMetrics(
  encoding: SmsMetrics["encoding"],
  units: number,
  singleSegmentLimit: number,
  concatenatedSegmentLimit: number,
): SmsMetrics {
  return {
    encoding,
    units,
    segmentCount: units <= singleSegmentLimit ? 1 : Math.ceil(units / concatenatedSegmentLimit),
  };
}
