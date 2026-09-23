export interface ContactData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  subscribed: boolean;
  engagementScore: number;
  createdAt: string;
  tags: { id: string; name: string; color: string }[];
}

export type ContactTag = ContactData["tags"][number];

export const SUBSCRIPTION_FILTERS = ["ALL", "SUBSCRIBED", "UNSUBSCRIBED"] as const;
export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number];

export const SORT_OPTIONS = ["date-desc", "date-asc", "name-asc", "name-za", "score-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SUBSCRIPTION_LABELS: Record<SubscriptionFilter, string> = {
  ALL: "Tous",
  SUBSCRIBED: "Abonnés",
  UNSUBSCRIBED: "Désabonnés",
};

export const SORT_LABELS: Record<SortOption, string> = {
  "date-desc": "Plus récents",
  "date-asc": "Plus anciens",
  "name-asc": "Nom A-Z",
  "name-za": "Nom Z-A",
  "score-desc": "Score engagement",
};

/** Tag filter value meaning "no tag filter". */
export const ALL_TAGS = "ALL";

export interface ContactFilters {
  search: string;
  tag: string;
  sort: SortOption;
  subscription: SubscriptionFilter;
}

export const INITIAL_FILTERS: ContactFilters = {
  search: "",
  tag: ALL_TAGS,
  sort: "date-desc",
  subscription: "ALL",
};

/** Unique tags across contacts, sorted by name. */
export function collectTags(contacts: ContactData[]): ContactTag[] {
  const tagMap = new Map<string, ContactTag>();
  for (const contact of contacts) {
    for (const tag of contact.tags) {
      if (!tagMap.has(tag.id)) tagMap.set(tag.id, tag);
    }
  }
  return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function matches(contact: ContactData, filters: ContactFilters): boolean {
  const q = filters.search.toLowerCase();
  const matchesSearch =
    contact.email.toLowerCase().includes(q) ||
    (contact.firstName?.toLowerCase() ?? "").includes(q) ||
    (contact.lastName?.toLowerCase() ?? "").includes(q);
  const matchesSubscription =
    filters.subscription === "ALL" ||
    (filters.subscription === "SUBSCRIBED" && contact.subscribed) ||
    (filters.subscription === "UNSUBSCRIBED" && !contact.subscribed);
  const matchesTag = filters.tag === ALL_TAGS || contact.tags.some((t) => t.id === filters.tag);
  return matchesSearch && matchesSubscription && matchesTag;
}

const COMPARATORS: Record<SortOption, (a: ContactData, b: ContactData) => number> = {
  "date-desc": (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  "date-asc": (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  "name-asc": (a, b) => (a.firstName ?? "").localeCompare(b.firstName ?? ""),
  "name-za": (a, b) => (b.firstName ?? "").localeCompare(a.firstName ?? ""),
  "score-desc": (a, b) => b.engagementScore - a.engagementScore,
};

export function filterAndSortContacts(contacts: ContactData[], filters: ContactFilters): ContactData[] {
  return contacts.filter((c) => matches(c, filters)).sort(COMPARATORS[filters.sort]);
}
