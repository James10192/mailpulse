"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
}: React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
  children: React.ReactElement;
}) {
  const [mounted, setMounted] = React.useState(false);
  const generatedId = React.useId();
  const chartId = `chart-${id ?? generatedId.replace(/:/g, "")}`;
  const cssVars = Object.entries(config).reduce<Record<string, string>>((acc, [key, item]) => {
    if (item.color) acc[`--color-${key}`] = item.color;
    return acc;
  }, {});

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn("flex aspect-video min-w-0 justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-zinc-500 dark:[&_.recharts-cartesian-axis-tick_text]:fill-zinc-400", className)}
        style={cssVars as React.CSSProperties}
      >
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            {children}
          </ResponsiveContainer>
        ) : null}
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsTooltip;
const ChartLegend = RechartsLegend;

type ChartTooltipContentPayload = {
  dataKey?: string | number;
  name?: React.ReactNode;
  color?: string;
  value?: React.ReactNode;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: {
  active?: boolean;
  payload?: ChartTooltipContentPayload[];
  label?: React.ReactNode;
  className?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className={cn("grid min-w-32 gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-zinc-800 dark:bg-zinc-950", className)}>
      {label && <div className="font-medium text-zinc-900 dark:text-zinc-100">{label}</div>}
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name);
        const itemConfig = config[key];
        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
              {itemConfig?.label ?? item.name}
            </div>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartLegendContent() {
  const { config } = useChart();
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
      {Object.entries(config).map(([key, item]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label ?? key}
        </div>
      ))}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
