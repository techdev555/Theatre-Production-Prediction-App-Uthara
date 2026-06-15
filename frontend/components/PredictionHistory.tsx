"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAllPredictions,
  deletePrediction,
  fetchHistory,
  type HistoryItem,
} from "@/lib/api";

interface Props {
  refreshTrigger: number;
}

export function PredictionHistory({ refreshTrigger }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(50);
      setHistory(data);
    } catch {
      setError("Could not load history — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deletePrediction(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Delete all saved predictions? This cannot be undone.")) return;
    setDeletingId("all");
    try {
      await deleteAllPredictions();
      setHistory([]);
    } catch {
      setError("Clear failed.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6 text-sm font-sans" style={{ color: "#6B4040" }}>
        Loading history…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2
          className="text-xl font-bold flex items-center gap-2"
          style={{ color: "#FAF3E0", fontFamily: "Georgia, serif" }}
        >
          <span style={{ color: "#C9A84C" }}>✦</span>
          Saved Predictions
          <span className="text-sm font-sans font-normal" style={{ color: "#6B4040" }}>
            ({history.length})
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-md text-xs font-sans border transition-all hover:brightness-110"
            style={{ background: "#1A0A0A", borderColor: "#6B4040", color: "#C9A84C" }}
          >
            ↺ Refresh
          </button>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={deletingId === "all"}
              className="px-3 py-1.5 rounded-md text-xs font-sans border transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "#3D1010", borderColor: "#C41E1E", color: "#FAF3E0" }}
            >
              {deletingId === "all" ? "Clearing…" : "🗑 Clear all"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs font-sans text-center py-2" style={{ color: "#C41E1E" }}>
          {error}
        </p>
      )}

      {history.length === 0 ? (
        <div
          className="rounded-xl p-8 border text-center"
          style={{ background: "#2D1515", borderColor: "#6B4040" }}
        >
          <p className="text-sm font-sans" style={{ color: "#6B4040" }}>
            No predictions saved yet. Run a prediction to see it here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#6B4040" }}>
          {/* Table header */}
          <div
            className="grid text-xs font-sans font-semibold tracking-wide uppercase px-4 py-2.5"
            style={{
              background: "#3D1515",
              color: "#C9A84C",
              gridTemplateColumns: "3rem 1fr 1fr 1fr 1fr 1fr 2.5rem",
            }}
          >
            <span>#</span>
            <span>Genre / Season</span>
            <span className="text-right">Tickets</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Sold-Out %</span>
            <span className="text-right">Date</span>
            <span />
          </div>

          {/* Rows */}
          {history.map((item, idx) => (
            <div
              key={item.id}
              className="grid items-center px-4 py-3 text-sm font-sans transition-colors"
              style={{
                gridTemplateColumns: "3rem 1fr 1fr 1fr 1fr 1fr 2.5rem",
                background: idx % 2 === 0 ? "#2D1515" : "#1A0A0A",
                borderTop: "1px solid #3D1515",
              }}
            >
              <span style={{ color: "#6B4040" }}>{item.id}</span>

              <span style={{ color: "#FAF3E0" }}>
                {item.inputs.genre}
                <span className="ml-1 text-xs" style={{ color: "#6B4040" }}>
                  · {item.inputs.season}
                </span>
              </span>

              <span className="text-right tabular-nums" style={{ color: "#E8C76A" }}>
                {Math.max(0, item.tickets_sold).toLocaleString("en-US")}
              </span>

              <span className="text-right tabular-nums" style={{ color: "#E8C76A" }}>
                ${formatRevenue(Math.max(0, item.total_revenue))}
              </span>

              <span
                className="text-right tabular-nums font-medium"
                style={{
                  color:
                    item.sold_out_probability >= 0.75
                      ? "#22c55e"
                      : item.sold_out_probability >= 0.5
                      ? "#C9A84C"
                      : "#C41E1E",
                }}
              >
                {Math.round(item.sold_out_probability * 100)}%
              </span>

              <span className="text-right text-xs" style={{ color: "#6B4040" }}>
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>

              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                title="Delete this prediction"
                className="justify-self-end text-base leading-none transition-opacity hover:opacity-100 disabled:opacity-30"
                style={{ color: "#6B4040", opacity: 0.6 }}
              >
                {deletingId === item.id ? "…" : "×"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRevenue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}
