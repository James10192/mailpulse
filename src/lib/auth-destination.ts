/**
 * Where to go after signing in. Only a path on this site: `//evil.com` or a
 * full URL would turn the login page into an open redirect.
 */
export function destinationSure(brute: string | string[] | null | undefined): string {
  const valeur = Array.isArray(brute) ? brute[0] : brute;

  if (!valeur || !valeur.startsWith("/")) return "/dashboard";
  // Browsers drop tabs and newlines in URLs, so `/\t/evil.com` becomes
  // `//evil.com`. Resolve against a dummy origin: anything that leaves it is
  // rejected.
  if (/[\x00-\x20\\]/.test(valeur)) return "/dashboard";
  try {
    const url = new URL(valeur, "http://mailpulse.invalid");
    return url.origin === "http://mailpulse.invalid" ? url.pathname + url.search + url.hash : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
