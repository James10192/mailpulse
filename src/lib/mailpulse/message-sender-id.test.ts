import assert from "node:assert/strict";
import test from "node:test";

const { createMessageSchema } = await import("./schemas");

const whatsapp = {
  channel: "whatsapp",
  recipient: { type: "phone", value: "+2250700000001" },
  content: { type: "text", text: "Bonjour" },
};

test("a WhatsApp message may name the number it leaves from", () => {
  const parsed = createMessageSchema.safeParse({ ...whatsapp, sender_id: "pa-yakro" });
  assert.equal(parsed.success && parsed.data.sender_id, "pa-yakro");
});

test("sender_id is refused on the other channels rather than ignored", () => {
  const parsed = createMessageSchema.safeParse({ ...whatsapp, channel: "sms", sender_id: "pa-yakro" });
  assert.equal(parsed.success, false);
});
