"use client";

import { useState } from "react";
import type { PredictionRequest } from "@/lib/api";

const GENRES = ["Musical", "Drama", "Comedy", "Tragedy", "Thriller", "Family", "Experimental"];
const SEASONS = ["Spring", "Summer", "Fall", "Winter"];

const DEFAULT: PredictionRequest = {
  genre: "Musical",
  season: "Winter",
  capacity: 800,
  ticket_price: 95,
  marketing_spend: 100000,
  run_length_weeks: 8,
  cast_popularity: 7,
  is_musical: true,
  has_celebrity: false,
  prior_show_avg_rating: 7.5,
};

interface Props {
  onSubmit: (req: PredictionRequest) => void;
  loading: boolean;
}

export function PredictionForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<PredictionRequest>(DEFAULT);

  const set = (key: keyof PredictionRequest, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row 1: Genre + Season */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Genre">
          <select
            value={form.genre}
            onChange={(e) => {
              set("genre", e.target.value);
              set("is_musical", e.target.value === "Musical");
            }}
            className={selectCls}
          >
            {GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Season">
          <select value={form.season} onChange={(e) => set("season", e.target.value)} className={selectCls}>
            {SEASONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {/* Row 2: Capacity + Ticket Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Theatre Capacity (seats)">
          <NumberInput
            value={form.capacity} min={50} max={5000} step={50}
            onChange={(v) => set("capacity", v)}
            format={(v) => v.toLocaleString()}
          />
        </Field>
        <Field label="Ticket Price (USD)">
          <NumberInput
            value={form.ticket_price} min={5} max={1000} step={5}
            onChange={(v) => set("ticket_price", v)}
            format={(v) => `$${v}`}
          />
        </Field>
      </div>

      {/* Row 3: Marketing + Run Length */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Marketing Spend (USD)">
          <NumberInput
            value={form.marketing_spend} min={0} max={2000000} step={5000}
            onChange={(v) => set("marketing_spend", v)}
            format={(v) => `$${v.toLocaleString()}`}
          />
        </Field>
        <Field label="Run Length (weeks)">
          <NumberInput
            value={form.run_length_weeks} min={1} max={52} step={1}
            onChange={(v) => set("run_length_weeks", v)}
            format={(v) => `${v} wk${v !== 1 ? "s" : ""}`}
          />
        </Field>
      </div>

      {/* Row 4: Cast Popularity + Prior Rating */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={`Cast Popularity — ${form.cast_popularity.toFixed(1)} / 10`}>
          <input
            type="range" min={1} max={10} step={0.1}
            value={form.cast_popularity}
            onChange={(e) => set("cast_popularity", parseFloat(e.target.value))}
            className="w-full accent-[#C9A84C] cursor-pointer"
          />
        </Field>
        <Field label={`Prior Show Avg Rating — ${form.prior_show_avg_rating.toFixed(1)} / 10`}>
          <input
            type="range" min={1} max={10} step={0.1}
            value={form.prior_show_avg_rating}
            onChange={(e) => set("prior_show_avg_rating", parseFloat(e.target.value))}
            className="w-full accent-[#C9A84C] cursor-pointer"
          />
        </Field>
      </div>

      {/* Row 5: Toggles */}
      <div className="flex flex-wrap gap-6">
        <Toggle
          label="Is Musical"
          checked={form.is_musical}
          onChange={(v) => set("is_musical", v)}
        />
        <Toggle
          label="Has Celebrity Cast"
          checked={form.has_celebrity}
          onChange={(v) => set("has_celebrity", v)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-lg font-semibold text-lg tracking-widest uppercase transition-all
          bg-[#8B1A1A] hover:bg-[#C41E1E] text-[#FAF3E0] border border-[#C9A84C]
          disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[#C9A84C]/20"
        style={{ letterSpacing: "0.15em" }}
      >
        {loading ? "Predicting…" : "Raise the Curtain"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-sans text-[#C9A84C] tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const selectCls =
  "w-full bg-[#2D1515] border border-[#6B4040] text-[#FAF3E0] rounded-md px-3 py-2 focus:outline-none focus:border-[#C9A84C] font-sans text-sm";

interface NumberInputProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}

function NumberInput({ value, min, max, step, onChange, format }: NumberInputProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#C9A84C] cursor-pointer"
      />
      <span className="w-28 text-right text-sm font-sans text-[#E8C76A] font-medium tabular-nums">
        {format(value)}
      </span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors border ${
          checked ? "bg-[#8B1A1A] border-[#C9A84C]" : "bg-[#2D1515] border-[#6B4040]"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-[#C9A84C] ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="font-sans text-sm text-[#FAF3E0] group-hover:text-[#E8C76A] transition-colors">{label}</span>
    </label>
  );
}
