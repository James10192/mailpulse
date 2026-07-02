"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function DeliveryByChannelChart({
  data,
}: {
  data: Array<{ channel: string; queued: number; delivered: number; failed: number }>;
}) {
  return (
    <ChartContainer
      className="h-64 w-full"
      config={{
        queued: { label: "Queued", color: "#f59e0b" },
        delivered: { label: "Delivered", color: "#10b981" },
        failed: { label: "Failed", color: "#ef4444" },
      }}
    >
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="channel" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="queued" fill="var(--color-queued)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="delivered" fill="var(--color-delivered)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="failed" fill="var(--color-failed)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function MessageVolumeChart({ data }: { data: Array<{ date: string; messages: number }> }) {
  return (
    <ChartContainer
      className="h-64 w-full"
      config={{
        messages: { label: "Messages", color: "#f97316" },
      }}
    >
      <LineChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="messages" stroke="var(--color-messages)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
