"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ChannelPoint = {
  channel: string;
  value: number;
  fill: string;
};

type DayPoint = {
  day: string;
  email: number;
  whatsapp: number;
};

const channelConfig = {
  email: { label: "Email", color: "#f97316" },
  whatsapp: { label: "WhatsApp", color: "#22c55e" },
  sms: { label: "SMS", color: "#71717a" },
} satisfies ChartConfig;

const dayConfig = {
  email: { label: "Email", color: "#f97316" },
  whatsapp: { label: "WhatsApp", color: "#22c55e" },
} satisfies ChartConfig;

export function CalendarChannelChart({ data }: { data: ChannelPoint[] }) {
  return (
    <ChartContainer config={channelConfig} className="h-[220px] min-h-[220px] w-full">
      <PieChart accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie data={data} dataKey="value" nameKey="channel" innerRadius={58} outerRadius={86} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.channel} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function CalendarDayChart({ data }: { data: DayPoint[] }) {
  return (
    <ChartContainer config={dayConfig} className="h-[260px] min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="email" stackId="day" fill="var(--color-email)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="whatsapp" stackId="day" fill="var(--color-whatsapp)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
