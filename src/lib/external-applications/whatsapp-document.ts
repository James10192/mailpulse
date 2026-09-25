/**
 * Rules for a document sent through the external application WhatsApp rail,
 * kept dependency-free so they are directly testable.
 */

export const DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

export type DocumentContent = {
  type: "document";
  url: string;
  filename: string;
  mimeType: DocumentMimeType;
  caption?: string;
};

export const MAX_DOCUMENT_FILENAME_LENGTH = 120;
export const MAX_DOCUMENT_CAPTION_LENGTH = 1024;
const MAX_DOCUMENT_URL_LENGTH = 2048;

/**
 * The file is fetched by the provider, never by us, but it is fetched in the
 * clear unless the URL is HTTPS. The filename is shown to the recipient as is,
 * so a path separator is refused rather than silently rewritten.
 */
export function parseDocumentContent(input: {
  url: string;
  filename: string;
  mimeType: string;
  caption?: string | null;
}): DocumentContent | null {
  const url = input.url.trim();
  const filename = input.filename.trim();
  const mimeType = input.mimeType.trim().toLowerCase();
  const caption = input.caption?.trim() || undefined;

  if (!isHttpsUrl(url) || url.length > MAX_DOCUMENT_URL_LENGTH) return null;
  if (!filename || filename.length > MAX_DOCUMENT_FILENAME_LENGTH || /[/\\]/.test(filename)) return null;
  if (!isDocumentMimeType(mimeType)) return null;
  if (caption && caption.length > MAX_DOCUMENT_CAPTION_LENGTH) return null;

  return { type: "document", url, filename, mimeType, ...(caption ? { caption } : {}) };
}

export function isDocumentMimeType(value: string): value is DocumentMimeType {
  return (DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
