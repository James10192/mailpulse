/**
 * Where to go after signing in. Only a path on this site: `//evil.com` or a
 * full URL would turn the login page into an open redirect.
 */
export function destinationSure(brute: string | string[] | null | undefined): string {
  const valeur = Array.isArray(brute) ? brute[0] : brute;

  return valeur && valeur.startsWith("/") && !valeur.startsWith("//") && !valeur.startsWith("/\\") ? valeur : "/dashboard";
}
