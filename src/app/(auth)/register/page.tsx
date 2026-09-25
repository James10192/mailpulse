import { redirect } from "next/navigation";

/**
 * Sign-up and sign-in are the same screen: an unknown address gets an account
 * after its code is checked. Old links to /register keep working.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(await searchParams)) {
    if (typeof valeur === "string") params.set(cle, valeur);
  }
  const suite = params.toString();

  redirect(suite ? `/login?${suite}` : "/login");
}
