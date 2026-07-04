"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type MessageVolumePoint = {
  date: string;
  email: number;
  whatsapp: number;
  api: number;
};

type ChannelPoint = {
  channel: string;
  sent: number;
  failed: number;
  queued: number;
};

type CampaignChannelPoint = {
  channel: string;
  value: number;
  fill: string;
};

const volumeConfig = {
  email: { label: "Email", color: "#f97316" },
  whatsapp: { label: "WhatsApp", color: "#22c55e" },
  api: { label: "API", color: "#71717a" },
} satisfies ChartConfig;

const channelConfig = {
  sent: { label: "Envoyés", color: "#22c55e" },
  failed: { label: "Échecs", color: "#ef4444" },
  queued: { label: "En attente", color: "#f59e0b" },
} satisfies ChartConfig;

const campaignConfig = {
  email: { label: "Email", color: "#f97316" },
  whatsapp: { label: "WhatsApp", color: "#22c55e" },
  sms: { label: "SMS", color: "#71717a" },
} satisfies ChartConfig;

export function MessageVolumeChart({ data }: { data: MessageVolumePoint[] }) {
  return (
    <ChartContainer config={volumeConfig} className="h-[260px] min-h-[260px] w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="email"
          type="monotone"
          fill="var(--color-email)"
          fillOpacity={0.18}
          stroke="var(--color-email)"
          strokeWidth={2}
        />
        <Area
          dataKey="whatsapp"
          type="monotone"
          fill="var(--color-whatsapp)"
          fillOpacity={0.14}
          stroke="var(--color-whatsapp)"
          strokeWidth={2}
        />
        <Area
          dataKey="api"
          type="monotone"
          fill="var(--color-api)"
          fillOpacity={0.1}
          stroke="var(--color-api)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function ApiStatusChart({ data }: { data: ChannelPoint[] }) {
  return (
    <ChartContainer config={channelConfig} className="h-[260px] min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="channel" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="queued" fill="var(--color-queued)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="failed" fill="var(--color-failed)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function CampaignChannelChart({ data }: { data: CampaignChannelPoint[] }) {
  return (
    <ChartContainer config={campaignConfig} className="h-[220px] min-h-[220px] w-full">
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
