export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface PredictionRequest {
  genre: string;
  season: string;
  capacity: number;
  ticket_price: number;
  marketing_spend: number;
  run_length_weeks: number;
  cast_popularity: number;
  is_musical: boolean;
  has_celebrity: boolean;
  prior_show_avg_rating: number;
}

export interface SensitivityItem {
  lever: string;
  label: string;
  change: string;
  tickets_sold: number;
  total_revenue: number;
  tickets_delta: number;
  revenue_delta: number;
}

export interface PredictionResponse {
  id: number;
  tickets_sold: number;
  total_revenue: number;
  sold_out_probability: number;
  feature_importance: Record<string, number>;
  created_at: string;
  // New optional fields
  tickets_sold_low?: number;
  tickets_sold_high?: number;
  total_revenue_low?: number;
  total_revenue_high?: number;
  occupancy_rate?: number;
  capped_at_capacity?: boolean;
  max_tickets?: number;
  sensitivity?: SensitivityItem[];
}

export interface HistoryItem {
  id: number;
  created_at: string;
  inputs: PredictionRequest;
  tickets_sold: number;
  total_revenue: number;
  sold_out_probability: number;
}

export async function runPrediction(req: PredictionRequest): Promise<PredictionResponse> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchHistory(limit = 50): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/history?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}

export async function deletePrediction(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/history/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete prediction");
}

export async function deleteAllPredictions(): Promise<void> {
  const res = await fetch(`${API_BASE}/history/all`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear history");
}
