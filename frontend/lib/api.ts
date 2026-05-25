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

export interface PredictionResponse {
  id: number;
  tickets_sold: number;
  total_revenue: number;
  sold_out_probability: number;
  feature_importance: Record<string, number>;
  created_at: string;
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

export async function fetchHistory(limit = 10): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/history?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}
