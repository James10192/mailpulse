import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";

type CallbackTarget = {
  url: URL;
  address: string;
  family: 4 | 6;
};

export async function assertSafeCallbackUrl(value: string) {
  await resolveSafeCallbackTarget(value);
}

export async function postPinnedHttpsCallback(input: {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
}) {
  const target = await resolveSafeCallbackTarget(input.url);
  return new Promise<number>((resolve, reject) => {
    let settled = false;

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cancelAbsoluteDeadline();
      callback();
    };
    const fail = (error: Error) => settle(() => reject(error));

    const request = httpsRequest({
      ...pinnedHttpsRequestTarget(target.url, target.address, target.family),
      method: "POST",
      headers: { host: target.url.host, ...input.headers },
      rejectUnauthorized: true,
    }, (response) => {
      response.resume();
      response.once("end", () => settle(() => resolve(response.statusCode ?? 0)));
      response.once("error", fail);
      response.once("close", () => fail(new Error("External application callback response closed unexpectedly.")));
    });
    request.once("error", fail);
    request.once("close", () => fail(new Error("External application callback connection closed unexpectedly.")));

    // `request.setTimeout` only covers inactivity, so this deadline bounds streaming responses too.
    const cancelAbsoluteDeadline = createAbsoluteRequestDeadline(request, input.timeoutMs);
    request.setTimeout(input.timeoutMs, () => request.destroy(new Error("External application callback timed out.")));
    request.end(input.body);
  });
}

export function createAbsoluteRequestDeadline(request: { destroy(error?: Error): void }, timeoutMs: number) {
  const deadline = setTimeout(() => {
    request.destroy(new Error("External application callback timed out."));
  }, timeoutMs);
  return () => clearTimeout(deadline);
}

export function pinnedHttpsRequestTarget(url: URL, address: string, family: 4 | 6) {
  return {
    protocol: "https:" as const,
    hostname: address,
    family,
    servername: url.hostname,
    path: `${url.pathname}${url.search}`,
  };
}

async function resolveSafeCallbackTarget(value: string): Promise<CallbackTarget> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid external application callback URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.port) {
    throw new Error("Unsafe external application callback URL.");
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error("Unsafe external application callback host.");
  }
  const address = addresses[0];
  if (!address) throw new Error("Unsafe external application callback host.");
  return { url, address: address.address, family: address.family as 4 | 6 };
}

export function isPublicIpAddress(address: string): boolean {
  if (address.includes(":")) return isPublicIpv6(address);
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 0) return false;
  if (first === 192 && second === 168) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && octets[2] === 100) return false;
  if (first === 203 && second === 0 && octets[2] === 113) return false;
  return true;
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (
    normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("::")
    || normalized.startsWith("fe80:")
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("2001:db8:")
  ) {
    return false;
  }
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isPublicIpAddress(mappedIpv4) : !normalized.startsWith("ff");
}
