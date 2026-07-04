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

type PerformancePoint = {
  name: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
};

const channelConfig = {
  email: { label: "Email", color: "#f97316" },
  whatsapp: { label: "WhatsApp", color: "#22c55e" },
  sms: { label: "SMS", color: "#71717a" },
} satisfies ChartConfig;

const performanceConfig = {
  sent: { label: "Envoyés", color: "#f97316" },
  opened: { label: "Ouvertures", color: "#22c55e" },
  clicked: { label: "Clics", color: "#0ea5e9" },
  replied: { label: "Réponses", color: "#a855f7" },
} satisfies ChartConfig;

export function CampaignChannelChart({ data }: { data: ChannelPoint[] }) {
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

export function CampaignPerformanceChart({ data }: { data: PerformancePoint[] }) {
  return (
    <ChartContainer config={performanceConfig} className="h-[260px] min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="opened" fill="var(--color-opened)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="clicked" fill="var(--color-clicked)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="replied" fill="var(--color-replied)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
