// Plans the applications that unattached API keys will speak for.
//
// Keys sharing a name are one application: a rotation creates the new key
// under the old one's name before revoking it. A key is never attached to an
// application that already exists, because that application may own a
// WhatsApp number and the key would start sending from it: an existing
// application is only ever chosen explicitly.

export const APPLICATION_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;

export type UnattachedApiKey = {
  id: string;
  name: string;
  defaultEmailSenderId: string | null;
};

export type PlannedApplication = {
  key: string;
  name: string;
  /** Set only when every key of the group already agreed on it. */
  defaultEmailSenderId: string | null;
  apiKeyIds: string[];
};

export function planApplicationsForKeys(keys: UnattachedApiKey[], takenApplicationKeys: Iterable<string>): PlannedApplication[] {
  const taken = new Set(takenApplicationKeys);
  const groups = new Map<string, UnattachedApiKey[]>();
  for (const key of keys) {
    const groupName = key.name.trim().replace(/\s+/g, " ").toLowerCase();
    groups.set(groupName, [...(groups.get(groupName) ?? []), key]);
  }

  return [...groups.values()].map((group) => {
    const name = group[0].name.trim().replace(/\s+/g, " ");
    const key = uniqueApplicationKey(slugifyApplicationKey(name), taken);
    taken.add(key);
    const senders = new Set(group.map((apiKey) => apiKey.defaultEmailSenderId));
    return {
      key,
      name,
      defaultEmailSenderId: senders.size === 1 ? group[0].defaultEmailSenderId : null,
      apiKeyIds: group.map((apiKey) => apiKey.id),
    };
  });
}

export function slugifyApplicationKey(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/-+$/, "")
    .slice(0, 56);
  return APPLICATION_KEY_PATTERN.test(slug) ? slug : "application";
}

function uniqueApplicationKey(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
