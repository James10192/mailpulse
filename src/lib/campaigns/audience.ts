export type CampaignAudience =
  | { kind: "all" }
  | { kind: "list"; id: string }
  | { kind: "tag"; name: string };

/** Parses the audience string sent by the campaign form: "all", "list:<id>" or "tag:<name>". */
export function parseCampaignAudience(audience: string): CampaignAudience | { error: string } {
  if (audience === "all") return { kind: "all" };
  if (audience.startsWith("list:")) {
    const id = audience.slice("list:".length);
    return id ? { kind: "list", id } : { error: "Segment invalide." };
  }
  if (audience.startsWith("tag:")) {
    const name = audience.slice("tag:".length).trim();
    return name && name.length <= 100 ? { kind: "tag", name } : { error: "Tag invalide." };
  }
  return { error: "Audience invalide." };
}
