"""Load trained models and run inference."""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd

ARTIFACTS = Path(__file__).parent.parent / "ml" / "artifacts"

FEATURES = [
    "genre", "season", "capacity", "ticket_price", "marketing_spend",
    "run_length_weeks", "cast_popularity", "is_musical", "has_celebrity",
    "prior_show_avg_rating",
]

FEATURE_LABELS = {
    "genre": "Genre",
    "season": "Season",
    "capacity": "Theatre Capacity",
    "ticket_price": "Ticket Price",
    "marketing_spend": "Marketing Spend",
    "run_length_weeks": "Run Length",
    "cast_popularity": "Cast Popularity",
    "is_musical": "Is Musical",
    "has_celebrity": "Has Celebrity",
    "prior_show_avg_rating": "Prior Show Rating",
}

SHOWS_PER_WEEK = 8


@lru_cache(maxsize=1)
def _load_models():
    tickets = joblib.load(ARTIFACTS / "tickets_model.joblib")
    soldout = joblib.load(ARTIFACTS / "soldout_model.joblib")
    with open(ARTIFACTS / "metadata.json", encoding="utf-8") as f:
        metadata = json.load(f)
    try:
        p10 = joblib.load(ARTIFACTS / "tickets_p10_model.joblib")
        p90 = joblib.load(ARTIFACTS / "tickets_p90_model.joblib")
    except FileNotFoundError:
        p10 = None
        p90 = None
    return tickets, soldout, metadata, p10, p90


def _to_df(data: dict) -> pd.DataFrame:
    row = {k: [v] for k, v in data.items()}
    row["is_musical"] = [int(row["is_musical"][0])]
    row["has_celebrity"] = [int(row["has_celebrity"][0])]
    return pd.DataFrame(row)[FEATURES]


def _cap(raw: int, max_tickets: int) -> int:
    return max(0, min(raw, max_tickets))


def predict(data: dict) -> dict:
    tickets_model, soldout_model, metadata, p10_model, p90_model = _load_models()

    X = _to_df(data)
    capacity = int(data["capacity"])
    run_weeks = int(data["run_length_weeks"])
    ticket_price = float(data["ticket_price"])
    max_tickets = capacity * run_weeks * SHOWS_PER_WEEK

    raw_point = int(round(float(tickets_model.predict(X)[0])))
    tickets_sold = _cap(raw_point, max_tickets)
    capped_at_capacity = raw_point > max_tickets

    if p10_model is not None and p90_model is not None:
        raw_low = int(round(float(p10_model.predict(X)[0])))
        raw_high = int(round(float(p90_model.predict(X)[0])))
        # Quantile-crossing guard: sort then clamp
        raw_low, _, raw_high = sorted([raw_low, raw_point, raw_high])
        tickets_sold_low = _cap(raw_low, max_tickets)
        tickets_sold_high = _cap(raw_high, max_tickets)
    else:
        tickets_sold_low = tickets_sold
        tickets_sold_high = tickets_sold

    total_revenue = round(tickets_sold * ticket_price, 2)
    total_revenue_low = round(tickets_sold_low * ticket_price, 2)
    total_revenue_high = round(tickets_sold_high * ticket_price, 2)

    implied_occupancy = tickets_sold / max_tickets if max_tickets > 0 else 0.0
    raw_sold_out_prob = float(round(soldout_model.predict_proba(X)[0][1], 4))

    # Continuous sigmoid blend — replaces the old 3-branch cliff
    p_occ = 1.0 / (1.0 + math.exp(-22.0 * (implied_occupancy - 0.88)))
    sold_out_prob = round(min(0.6 * p_occ + 0.4 * raw_sold_out_prob, 0.9999), 4)

    # Feature importance: average tickets + sold_out models
    fi_tickets = metadata["feature_importance"]["tickets"]
    fi_soldout = metadata["feature_importance"]["sold_out"]
    combined = {
        k: round((fi_tickets.get(k, 0) + fi_soldout.get(k, 0)) / 2, 4)
        for k in FEATURES
    }
    total = sum(combined.values()) or 1
    feature_importance = {
        FEATURE_LABELS[k]: round(v / total, 4)
        for k, v in combined.items()
    }

    # Sensitivity: 7 what-if scenarios, batched into one DataFrame predict call
    marketing = float(data["marketing_spend"])
    cast_pop = float(data["cast_popularity"])
    scenarios = [
        {"lever": "ticket_price",      "label": "Price +10%",    "change": "+10%",   "mod": {"ticket_price":      min(ticket_price * 1.10, 1000.0)}},
        {"lever": "ticket_price",      "label": "Price −10%",    "change": "−10%",   "mod": {"ticket_price":      max(ticket_price * 0.90, 5.0)}},
        {"lever": "marketing_spend",   "label": "Marketing +25%","change": "+25%",   "mod": {"marketing_spend":   min(marketing * 1.25, 2_000_000.0)}},
        {"lever": "marketing_spend",   "label": "Marketing −25%","change": "−25%",   "mod": {"marketing_spend":   max(marketing * 0.75, 0.0)}},
        {"lever": "cast_popularity",   "label": "Cast +1",       "change": "+1",     "mod": {"cast_popularity":   min(cast_pop + 1.0, 10.0)}},
        {"lever": "run_length_weeks",  "label": "Run +2 weeks",  "change": "+2 wks", "mod": {"run_length_weeks":  min(run_weeks + 2, 52)}},
        {"lever": "run_length_weeks",  "label": "Run −2 weeks",  "change": "−2 wks", "mod": {"run_length_weeks":  max(run_weeks - 2, 1)}},
    ]

    batch_rows = []
    for sc in scenarios:
        sc_data = {**data, **sc["mod"]}
        row = {k: sc_data[k] for k in FEATURES}
        row["is_musical"] = int(row["is_musical"])
        row["has_celebrity"] = int(row["has_celebrity"])
        batch_rows.append(row)

    X_batch = pd.DataFrame(batch_rows)[FEATURES]
    batch_preds = tickets_model.predict(X_batch)

    sensitivity = []
    for i, sc in enumerate(scenarios):
        # Per-scenario max_tickets uses that scenario's own run_length_weeks
        sc_weeks = int(sc["mod"].get("run_length_weeks", run_weeks))
        sc_max = capacity * sc_weeks * SHOWS_PER_WEEK
        sc_price = float(sc["mod"].get("ticket_price", ticket_price))
        sc_raw = int(round(float(batch_preds[i])))
        sc_tickets = max(0, min(sc_raw, sc_max))
        sc_revenue = round(sc_tickets * sc_price, 2)
        sensitivity.append({
            "lever": sc["lever"],
            "label": sc["label"],
            "change": sc["change"],
            "tickets_sold": sc_tickets,
            "total_revenue": sc_revenue,
            "tickets_delta": sc_tickets - tickets_sold,
            "revenue_delta": round(sc_revenue - total_revenue, 2),
        })

    return {
        "tickets_sold": tickets_sold,
        "tickets_sold_low": tickets_sold_low,
        "tickets_sold_high": tickets_sold_high,
        "total_revenue": total_revenue,
        "total_revenue_low": total_revenue_low,
        "total_revenue_high": total_revenue_high,
        "sold_out_probability": sold_out_prob,
        "occupancy_rate": round(implied_occupancy, 4),
        "capped_at_capacity": capped_at_capacity,
        "max_tickets": max_tickets,
        "feature_importance": feature_importance,
        "sensitivity": sensitivity,
    }
