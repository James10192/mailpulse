import { createHmac } from "crypto";

const TRACKING_SECRET = process.env.TRACKING_SECRET ?? "mailpulse-tracking-secret";

/**
 * Generate a signed tracking token for open/click events.
 * Token = base64url(recipientId:campaignId:hmac)
 */
export function generateTrackingToken(recipientId: string, campaignId: string): string {
  const payload = `${recipientId}:${campaignId}`;
  const hmac = createHmac("sha256", TRACKING_SECRET).update(payload).digest("hex").slice(0, 16);
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64url");
  return token;
}

/**
 * Verify and decode a tracking token.
 * Returns { recipientId, campaignId } or null if invalid.
 */
export function verifyTrackingToken(token: string): {
  recipientId: string;
  campaignId: string;
} | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [recipientId, campaignId, providedHmac] = parts;
    const payload = `${recipientId}:${campaignId}`;
    const expectedHmac = createHmac("sha256", TRACKING_SECRET)
      .update(payload)
      .digest("hex")
      .slice(0, 16);

    if (providedHmac !== expectedHmac) return null;

    return { recipientId, campaignId };
  } catch {
    return null;
  }
}

/**
 * Inject tracking pixel into HTML email content.
 */
export function injectTrackingPixel(html: string, trackingUrl: string): string {
  const pixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;
  // Insert before closing body tag, or append
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Wrap all links in HTML for click tracking.
 * Replaces href="URL" with href="trackingBaseUrl?url=encodedURL&t=token"
 */
export function wrapLinksForTracking(
  html: string,
  trackingBaseUrl: string,
  token: string
): string {
  const hrefRegex = /href="(https?:\/\/[^"]+)"/gi;

  return html.replace(hrefRegex, (_match, originalUrl: string) => {
    // Don't wrap unsubscribe links or mailto
    if (originalUrl.includes("unsubscribe") || originalUrl.startsWith("mailto:")) {
      return `href="${originalUrl}"`;
    }

    const trackedUrl = `${trackingBaseUrl}?url=${encodeURIComponent(originalUrl)}&t=${token}`;
    return `href="${trackedUrl}"`;
  });
}

/**
 * Generate unsubscribe URL with signed token.
 */
export function generateUnsubscribeUrl(
  baseUrl: string,
  contactId: string,
  campaignId: string
): string {
  const payload = `${contactId}:${campaignId}`;
  const hmac = createHmac("sha256", TRACKING_SECRET).update(payload).digest("hex").slice(0, 16);
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64url");
  return `${baseUrl}/api/unsubscribe?t=${token}`;
}
