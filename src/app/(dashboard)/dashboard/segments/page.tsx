import { prisma } from "@/lib/prisma";
import { SegmentsClient } from "./segments-client";

async function getSegments() {
  const segments = await prisma.contactList.findMany({
    where: { type: "dynamic" },
    select: {
      id: true,
      name: true,
      description: true,
      contactCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  // Serialize Date to string for client component
  return segments.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));
}

export default async function SegmentsPage() {
  const segments = await getSegments();
  return <SegmentsClient segments={segments} />;
}
