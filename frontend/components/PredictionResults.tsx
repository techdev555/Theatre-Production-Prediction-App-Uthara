"use client";

import {
  Bar,
  BarChart,
  Cell,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PredictionResponse } from "@/lib/api";

interface Props {
  result: PredictionResponse;
}

const GOLD = "#C9A84C";
const CRIMSON = "#8B1A1A";
const CRIMSON_LIGHT = "#C41E1E";
const CREAM = "#FAF3E0";

export function PredictionResults({ result }: Props) {
  const soldOutPct = Math.round(result.sold_out_probability * 100);

  const radialData = [
    {
      name: "Sold-Out Probability",
      value: soldOutPct,
      fill: soldOutPct >= 75 ? "#22c55e" : soldOutPct >= 50 ? GOLD : CRIMSON_LIGHT,
    },
  ];

  const fiEntries = Object.entries(result.feature_importance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const fiData = fiEntries.map(([name, value]) => ({
    name,
    value: Math.round(value * 100),
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Expected Ticket Sales"
          value={result.tickets_sold.toLocaleString()}
          sub="total across the run"
          accent={GOLD}
        />
        <KpiCard
          label="Revenue Estimate"
          value={`$${formatRevenue(result.total_revenue)}`}
          sub="projected box office"
          accent={GOLD}
        />
        <KpiCard
          label="Sold-Out Probability"
          value={`${soldOutPct}%`}
          sub={soldOutLabel(soldOutPct)}
          accent={soldOutPct >= 75 ? "#22c55e" : soldOutPct >= 50 ? GOLD : CRIMSON_LIGHT}
        />
      </div>

      {/* Sold-out radial + Feature importance bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radial gauge */}
        <div
          className="rounded-xl p-5 border"
          style={{ background: "#2D1515", borderColor: "#6B4040" }}
        >
          <h3 className="text-[#C9A84C] text-sm font-sans tracking-wide mb-4 uppercase">
            Sold-Out Likelihood
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              cx="50%"
              cy="100%"
              innerRadius="70%"
              outerRadius="100%"
              barSize={18}
              startAngle={180}
              endAngle={0}
              data={[{ name: "bg", value: 100, fill: "#3D2020" }, radialData[0]]}
            >
              <RadialBar dataKey="value" cornerRadius={8} />
              <text
                x="50%"
                y="95%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={radialData[0].fill}
                fontSize={28}
                fontWeight="bold"
                fontFamily="Georgia, serif"
              >
                {soldOutPct}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-center text-sm font-sans mt-2" style={{ color: radialData[0].fill }}>
            {soldOutLabel(soldOutPct)}
          </p>
        </div>

        {/* Feature importance */}
        <div
          className="rounded-xl p-5 border"
          style={{ background: "#2D1515", borderColor: "#6B4040" }}
        >
          <h3 className="text-[#C9A84C] text-sm font-sans tracking-wide mb-4 uppercase">
            Key Drivers
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={fiData}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fill: CREAM, fontSize: 11, fontFamily: "sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(139,26,26,0.15)" }}
                contentStyle={{ background: "#1A0A0A", border: "1px solid #C9A84C", borderRadius: 8 }}
                formatter={(v) => [`${v}%`, "Importance"]}
                labelStyle={{ color: GOLD, fontFamily: "Georgia, serif" }}
                itemStyle={{ color: CREAM }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {fiData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? GOLD : i <= 2 ? "#B8973E" : CRIMSON}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-center text-xs font-sans text-[#6B4040]">
        Prediction #{result.id} · Saved {new Date(result.created_at).toLocaleString()}
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl p-5 border text-center"
      style={{ background: "#2D1515", borderColor: "#6B4040" }}
    >
      <p className="text-xs font-sans tracking-widest uppercase mb-1" style={{ color: accent }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: "#FAF3E0", fontFamily: "Georgia, serif" }}>
        {value}
      </p>
      <p className="text-xs font-sans mt-1" style={{ color: "#C9A84C" }}>
        {sub}
      </p>
    </div>
  );
}

function formatRevenue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function soldOutLabel(pct: number): string {
  if (pct >= 85) return "Blockbuster potential";
  if (pct >= 70) return "Strong demand";
  if (pct >= 50) return "Moderate outlook";
  if (pct >= 30) return "Below average";
  return "Difficult run ahead";
}
