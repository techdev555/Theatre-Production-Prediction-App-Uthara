"use client";

import { useState } from "react";
import { PredictionForm } from "@/components/PredictionForm";
import { PredictionHistory } from "@/components/PredictionHistory";
import { PredictionResults } from "@/components/PredictionResults";
import { runPrediction, type PredictionRequest, type PredictionResponse } from "@/lib/api";

export default function Home() {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [lastInputs, setLastInputs] = useState<PredictionRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  const handleSubmit = async (req: PredictionRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runPrediction(req);
      setResult(res);
      setLastInputs(req);
      setHistoryTick((t) => t + 1);
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen" style={{ background: "#0F172A" }}>
      {/* Decorative top border */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #5C0F0F, #C9A84C, #5C0F0F)" }} />

      {/* Header / Marquee */}
      <header className="text-center py-12 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #C9A84C 0, #C9A84C 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative">
          <p className="text-xs font-sans tracking-[0.4em] uppercase mb-3" style={{ color: "#C9A84C" }}>
            AI-Powered · Theatre Intelligence
          </p>
          <h1
            className="text-4xl sm:text-6xl font-bold mb-3 leading-tight"
            style={{
              color: "#FAF3E0",
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 2px 20px rgba(201,168,76,0.3)",
            }}
          >
            Curtain call
          </h1>
          <p className="text-base sm:text-lg max-w-xl mx-auto" style={{ color: "#C9A84C" }}>
            Predict your production&apos;s box office performance before opening night
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="h-px w-16" style={{ background: "#6B4040" }} />
            <span style={{ color: "#C9A84C", fontSize: "1.2rem" }}>✦</span>
            <div className="h-px w-16" style={{ background: "#6B4040" }} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-20 space-y-10">
        {/* Prediction Form Card */}
        <section
          className="rounded-2xl p-6 sm:p-8 border"
          style={{ background: "#2D1515", borderColor: "#6B4040" }}
        >
          <h2
            className="text-xl font-bold mb-6 flex items-center gap-2"
            style={{ color: "#FAF3E0", fontFamily: "Georgia, serif" }}
          >
            <span style={{ color: "#C9A84C" }}>✦</span>
            Production Details
          </h2>
          <PredictionForm onSubmit={handleSubmit} loading={loading} />
        </section>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl p-4 border text-sm font-sans text-center"
            style={{ background: "#3D1010", borderColor: "#C41E1E", color: "#FAF3E0" }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <section id="results">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ background: "#6B4040" }} />
              <h2
                className="text-xl font-bold px-2"
                style={{ color: "#C9A84C", fontFamily: "Georgia, serif" }}
              >
                Opening Night Forecast
              </h2>
              <div className="h-px flex-1" style={{ background: "#6B4040" }} />
            </div>
            <PredictionResults result={result} inputs={lastInputs!} />
          </section>
        )}

        {/* History */}
        <section
          className="rounded-2xl p-6 sm:p-8 border"
          style={{ background: "#2D1515", borderColor: "#6B4040" }}
        >
          <PredictionHistory refreshTrigger={historyTick} />
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 px-4 border-t" style={{ borderColor: "#2D1515" }}>
        <p className="text-xs font-sans" style={{ color: "#6B4040" }}>
          Curtain Call · Predictions powered by Gradient Boosting · For planning purposes only
        </p>
      </footer>

      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #5C0F0F, #C9A84C, #5C0F0F)" }} />
    </div>
  );
}
