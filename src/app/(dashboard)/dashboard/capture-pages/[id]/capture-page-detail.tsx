"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Pencil, ExternalLink, Users, BarChart3, MousePointerClick, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toggleCapturePagePublished } from "../actions";

interface PageData {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  totalViews: number;
  conversions: number;
  conversionRate: string;
  createdAt: string;
}

interface DailyStat {
  date: string;
  views: number;
  uniqueViews: number;
  conversions: number;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export function CapturePageDetail({
  page,
  dailyStats,
  recentSubscribers,
}: {
  page: PageData;
  dailyStats: DailyStat[];
  recentSubscribers: Subscriber[];
}) {
  const [published, setPublished] = useState(page.published);
  const [toggling, setToggling] = useState(false);

  async function handleTogglePublish() {
    setToggling(true);
    const result = await toggleCapturePagePublished(page.id, !published);
    if (result?.success) setPublished(!published);
    setToggling(false);
  }

  const stats = [
    { label: "Total vues", value: page.totalViews, icon: Eye, color: "text-blue-500" },
    { label: "Conversions", value: page.conversions, icon: MousePointerClick, color: "text-orange-500" },
    { label: "Taux de conversion", value: `${page.conversionRate}%`, icon: TrendingUp, color: "text-purple-500" },
  ];

  const chartData = dailyStats.map((s) => ({
    ...s,
    date: new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {page.name}
            </h1>
            {published ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Publiee
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                Brouillon
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
            /capture/{page.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePublish}
            disabled={toggling}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
              published
                ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
            }`}
          >
            {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {published ? "Depublier" : "Publier"}
          </button>
          {published && (
            <a
              href={`/capture/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              <ExternalLink className="h-4 w-4" />
              Preview
            </a>
          )}
          <Link
            href={`/dashboard/capture-pages/${page.id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium"
          >
            <Pencil className="h-4 w-4" />
            Editer la page
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
          Tendance (30 derniers jours)
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="conversionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="views" name="Vues" stroke="#3b82f6" fill="url(#viewsGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#f97316" fill="url(#conversionsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-zinc-500 text-sm">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
              Pas encore de donnees. Partagez votre page pour commencer a collecter.
            </div>
          </div>
        )}
      </div>

      {/* Recent subscribers */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            Abonnes recents ({recentSubscribers.length})
          </h2>
          <Link
            href="/dashboard/contacts"
            className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
          >
            Voir tous →
          </Link>
        </div>
        {recentSubscribers.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentSubscribers.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{sub.email}</p>
                  {sub.name && (
                    <p className="text-xs text-zinc-500">{sub.name}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  {new Date(sub.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-zinc-500">
            Aucun abonne pour le moment. Partagez votre page pour collecter des leads.
          </div>
        )}
      </div>
    </div>
  );
}
