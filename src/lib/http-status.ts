/**
 * A 4xx answer that settles the request: the provider refused it and nothing
 * was done. 408 (request timeout) and 429 (rate limited) are 4xx too, but they
 * say "not now", not "no", so they are excluded.
 */
export function isDeterministicRejection(statusCode: number) {
  return statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429;
}

/** `Retry-After` in seconds when the provider gives a positive delay in seconds; the HTTP-date form is ignored. */
export function retryAfterSeconds(headers: Headers) {
  const value = Number(headers.get("retry-after"));
  return Number.isInteger(value) && value > 0 ? value : null;
}
