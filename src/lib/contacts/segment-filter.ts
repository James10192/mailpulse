import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { CONTACT_TAG_NAME_MAX_LENGTH } from "./tenant-scope";

const dateString = z
  .string()
  .max(64)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date invalide");

export const segmentFilterSchema = z
  .object({
    subscribed: z.boolean().optional(),
    engagementMin: z.number().finite().optional(),
    engagementMax: z.number().finite().optional(),
    createdAfter: dateString.optional(),
    createdBefore: dateString.optional(),
    includeTags: z.array(z.string().min(1).max(CONTACT_TAG_NAME_MAX_LENGTH)).max(50).optional(),
  })
  .strip();

export type SegmentFilter = z.infer<typeof segmentFilterSchema>;

export type SegmentFilterParse = { ok: true; filter: SegmentFilter | null } | { ok: false };

/** Validates a stored or submitted segment filter. `null` means "no filter". */
export function parseSegmentFilter(raw: unknown): SegmentFilterParse {
  if (raw === null || raw === undefined) return { ok: true, filter: null };
  const result = segmentFilterSchema.safeParse(raw);
  return result.success ? { ok: true, filter: result.data } : { ok: false };
}

/** Same as `parseSegmentFilter`, from the JSON string a form submits. */
export function parseSegmentFilterJson(json: string | undefined): SegmentFilterParse {
  if (!json) return { ok: true, filter: null };
  try {
    return parseSegmentFilter(JSON.parse(json));
  } catch {
    return { ok: false };
  }
}

/** Prisma where clause of a segment, always scoped to the organization. */
export function buildSegmentWhere(
  organizationId: string,
  filter: SegmentFilter | null
): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { organizationId };
  if (!filter) return where;

  if (filter.subscribed !== undefined) where.subscribed = filter.subscribed;

  if (filter.engagementMin !== undefined || filter.engagementMax !== undefined) {
    where.engagementScore = {
      ...(filter.engagementMin !== undefined && { gte: filter.engagementMin }),
      ...(filter.engagementMax !== undefined && { lte: filter.engagementMax }),
    };
  }

  if (filter.createdAfter !== undefined || filter.createdBefore !== undefined) {
    where.createdAt = {
      ...(filter.createdAfter !== undefined && { gte: new Date(filter.createdAfter) }),
      ...(filter.createdBefore !== undefined && { lte: new Date(filter.createdBefore) }),
    };
  }

  if (filter.includeTags && filter.includeTags.length > 0) {
    where.tags = { some: { name: { in: filter.includeTags } } };
  }

  return where;
}
