"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ChannelPoint = {
  channel: string;
  value: number;
  fill: string;
};

type ContentPoint = {
  name: string;
  words: number;
  chars: number;
};

const channelConfig = {
  email: { label: "Email", color: "#f97316" },
  whatsapp: { label: "WhatsApp", color: "#22c55e" },
  sms: { label: "SMS", color: "#71717a" },
} satisfies ChartConfig;

const contentConfig = {
  words: { label: "Mots", color: "#f97316" },
  chars: { label: "Caractères", color: "#71717a" },
} satisfies ChartConfig;

export function SnippetChannelChart({ data }: { data: ChannelPoint[] }) {
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

export function SnippetContentChart({ data }: { data: ContentPoint[] }) {
  return (
    <ChartContainer config={contentConfig} className="h-[260px] min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="words" fill="var(--color-words)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
