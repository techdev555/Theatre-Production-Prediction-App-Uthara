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
import type { PredictionRequest, PredictionResponse, SensitivityItem } from "@/lib/api";
import { API_BASE } from "@/lib/api";

interface Props {
  result: PredictionResponse;
  inputs: PredictionRequest;
}

const GOLD = "#C9A84C";
const CRIMSON = "#8B1A1A";
const CRIMSON_LIGHT = "#C41E1E";
const CREAM = "#FAF3E0";

function saveJson(result: PredictionResponse, inputs: PredictionRequest) {
  const payload = {
    prediction_id: result.id,
    saved_at: new Date().toISOString(),
    inputs,
    predictions: {
      tickets_sold: result.tickets_sold,
      tickets_sold_low: result.tickets_sold_low,
      tickets_sold_high: result.tickets_sold_high,
      total_revenue: result.total_revenue,
      total_revenue_low: result.total_revenue_low,
      total_revenue_high: result.total_revenue_high,
      sold_out_probability: result.sold_out_probability,
      occupancy_rate: result.occupancy_rate,
      capped_at_capacity: result.capped_at_capacity,
    },
    feature_importance: result.feature_importance,
    sensitivity: result.sensitivity ?? [],
    actuals: {
      actual_tickets_sold: null,
      actual_total_revenue: null,
      actual_sold_out: null,
      notes: "",
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prediction_${result.id}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PredictionResults({ result, inputs }: Props) {
  const soldOutPct = Math.round(result.sold_out_probability * 100);
  const occupancyPct = result.occupancy_rate != null ? Math.round(result.occupancy_rate * 100) : null;

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

  const hasRange = result.tickets_sold_high != null && result.tickets_sold_low != null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards — 2×2 on mobile, 4-across on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Expected Tickets"
          value={result.tickets_sold.toLocaleString("en-US")}
          sub={
            hasRange
              ? `${(result.tickets_sold_low!).toLocaleString("en-US")} – ${(result.tickets_sold_high!).toLocaleString("en-US")} (80% band)`
              : "total across the run"
          }
          accent={GOLD}
          badge={result.capped_at_capacity ? "Capped at capacity" : undefined}
        />
        <KpiCard
          label="Revenue Estimate"
          value={`$${formatRevenue(result.total_revenue)}`}
          sub={
            hasRange && result.total_revenue_low != null && result.total_revenue_high != null
              ? `$${formatRevenue(result.total_revenue_low)} – $${formatRevenue(result.total_revenue_high)} (80% band)`
              : "projected box office"
          }
          accent={GOLD}
        />
        <KpiCard
          label="Sold-Out Probability"
          value={`${soldOutPct}%`}
          sub={soldOutLabel(soldOutPct)}
          accent={soldOutPct >= 75 ? "#22c55e" : soldOutPct >= 50 ? GOLD : CRIMSON_LIGHT}
        />
        {occupancyPct != null && (
          <KpiCard
            label="Occupancy Rate"
            value={`${occupancyPct}%`}
            sub={occupancyLabel(occupancyPct)}
            accent={occupancyPct >= 75 ? "#22c55e" : occupancyPct >= 50 ? GOLD : CRIMSON_LIGHT}
          />
        )}
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

      {/* What-If Levers table */}
      {result.sensitivity && result.sensitivity.length > 0 && (
        <WhatIfTable sensitivity={result.sensitivity} />
      )}

      {/* Save actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => saveJson(result, inputs)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-sans font-medium transition-all hover:brightness-110"
          style={{ background: "#2D1515", borderColor: "#C9A84C", color: "#E8C76A" }}
        >
          <span>⬇</span> Save prediction as JSON
        </button>
        <a
          href={`${API_BASE}/export/csv`}
          download="predictions_log.csv"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-sans font-medium transition-all hover:brightness-110"
          style={{ background: "#2D1515", borderColor: "#6B4040", color: "#FAF3E0" }}
        >
          <span>📋</span> Download full log (CSV)
        </a>
      </div>

      <p className="text-center text-xs font-sans" style={{ color: "#6B4040" }}>
        Prediction #{result.id} · Saved {new Date(result.created_at).toLocaleString("en-US")}
        {" · "}Fill in the <em>actual_*</em> columns after the show runs to track accuracy
      </p>
    </div>
  );
}

function WhatIfTable({ sensitivity }: { sensitivity: SensitivityItem[] }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "#2D1515", borderColor: "#6B4040" }}
    >
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-[#C9A84C] text-sm font-sans tracking-wide uppercase">
          What-If Levers
        </h3>
        <p className="text-xs font-sans mt-1" style={{ color: "#6B4040" }}>
          Impact of changing one input at a time vs. the base prediction
        </p>
      </div>
      {/* Table header */}
      <div
        className="grid text-xs font-sans font-semibold tracking-wide uppercase px-5 py-2"
        style={{
          background: "#3D1515",
          color: "#C9A84C",
          gridTemplateColumns: "1fr auto 1fr 1fr",
          gap: "0 12px",
        }}
      >
        <span>Lever</span>
        <span>Change</span>
        <span className="text-right">Δ Tickets</span>
        <span className="text-right">Δ Revenue</span>
      </div>
      {sensitivity.map((item, idx) => (
        <div
          key={idx}
          className="grid items-center px-5 py-2.5 text-sm font-sans"
          style={{
            gridTemplateColumns: "1fr auto 1fr 1fr",
            gap: "0 12px",
            background: idx % 2 === 0 ? "#2D1515" : "#1A0A0A",
            borderTop: "1px solid #3D1515",
          }}
        >
          <span style={{ color: "#FAF3E0" }}>{item.label}</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#3D1515", color: "#C9A84C" }}>
            {item.change}
          </span>
          <span
            className="text-right tabular-nums font-medium"
            style={{ color: item.tickets_delta >= 0 ? "#22c55e" : "#C41E1E" }}
          >
            {item.tickets_delta >= 0 ? "+" : ""}{item.tickets_delta.toLocaleString("en-US")}
          </span>
          <span
            className="text-right tabular-nums font-medium"
            style={{ color: item.revenue_delta >= 0 ? "#22c55e" : "#C41E1E" }}
          >
            {item.revenue_delta >= 0 ? "+$" : "-$"}{formatRevenue(Math.abs(item.revenue_delta))}
          </span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  badge?: string;
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
      {badge && (
        <span
          className="inline-block text-xs font-sans font-semibold px-2 py-0.5 rounded-full mt-1 mb-1"
          style={{ background: "#3D2A00", border: "1px solid #C9A84C", color: "#C9A84C" }}
        >
          {badge}
        </span>
      )}
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

function occupancyLabel(pct: number): string {
  if (pct >= 90) return "Near full houses";
  if (pct >= 75) return "Strong attendance";
  if (pct >= 55) return "Moderate fill rate";
  if (pct >= 35) return "Sparse attendance";
  return "Low fill rate";
}
