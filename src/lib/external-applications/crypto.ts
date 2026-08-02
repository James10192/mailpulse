import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const CIPHER_VERSION = "v1";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encryptExternalApplicationValue(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", externalApplicationKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [CIPHER_VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptExternalApplicationValue(value: string) {
  const [version, iv, authTag, ciphertext, ...extra] = value.split(".");
  if (version !== CIPHER_VERSION || !iv || !authTag || !ciphertext || extra.length > 0) {
    throw new Error("Invalid external application encrypted value.");
  }

  const ivBuffer = Buffer.from(iv, "base64url");
  const authTagBuffer = Buffer.from(authTag, "base64url");
  if (ivBuffer.length !== IV_LENGTH || authTagBuffer.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid external application encrypted value.");
  }

  const decipher = createDecipheriv("aes-256-gcm", externalApplicationKey(), ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function hashExternalApplicationPayload(value: string) {
  return createHmac("sha256", externalApplicationKey()).update(`payload.v1.${value}`).digest("hex");
}

/** A domain-separated stable lookup key for external conversation windows. */
export function hashExternalApplicationRecipient(value: string) {
  return createHmac("sha256", externalApplicationKey()).update(`recipient.v1.${value}`).digest("hex");
}

function externalApplicationKey() {
  const encoded = process.env.EXTERNAL_APPLICATION_KEK;
  if (!encoded) throw new Error("EXTERNAL_APPLICATION_KEK is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("EXTERNAL_APPLICATION_KEK must be a 32-byte base64 key.");
  return key;
}
