import assert from "node:assert/strict";
import test from "node:test";
import { maskEmailAddress, maskRecipient, presentRegistryMessage } from "./message-privacy";

const message = {
  id: "m1",
  status: "delivered",
  recipient: { type: "phone", value: "+2250701020304" },
  content: { type: "text", text: "Votre code est 123456", variables: { code: "123456" } },
  contact: { email: "awa.kone@example.ci", phone: "+2250701020304", first_name: "Awa", last_name: "Koné" },
  metadata: { student: "Awa" },
  error_code: "recipient_not_activated",
  error_message: "Le numéro +2250701020304 n'est pas enregistré sur WhatsApp.",
  provider_message_id: "wamid.HBgMMjI1MDcwMTAyMDMwNBUCABEYEjQ1",
};

test("a manager sees the message untouched", () => {
  assert.equal(presentRegistryMessage(message, true), message);
});

test("anyone else never receives the address, the content or the metadata", () => {
  const masked = presentRegistryMessage(message, false);
  const serialized = JSON.stringify(masked);
  for (const secret of ["0701020304", "awa.kone", "123456", "student", "Koné", "\"Awa\"", "MjI1MDcwMTAy"]) assert.ok(!serialized.includes(secret), `${secret} a fuité`);
  assert.equal(masked.recipient.value, "Numéro masqué · **04");
  assert.equal(masked.error_message, "Numéro sans WhatsApp");
  assert.equal(masked.provider_message_id, "wamid.HBgMMj…");
  assert.equal(masked.contact?.email, "a•••@example.ci");
  assert.equal(masked.status, "delivered");
  assert.equal(masked.id, "m1");
});

test("addresses are masked by their kind", () => {
  assert.equal(maskRecipient("email", "jean@ecole.ci"), "j•••@ecole.ci");
  assert.equal(maskEmailAddress("pas-une-adresse"), "Adresse masquée");
  assert.equal(maskRecipient("phone", ""), "Numéro masqué");
});
