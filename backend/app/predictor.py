"""Load trained models and run inference."""
from __future__ import annotations

import json
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


@lru_cache(maxsize=1)
def _load_models():
    tickets = joblib.load(ARTIFACTS / "tickets_model.joblib")
    revenue = joblib.load(ARTIFACTS / "revenue_model.joblib")
    soldout = joblib.load(ARTIFACTS / "soldout_model.joblib")
    with open(ARTIFACTS / "metadata.json", encoding="utf-8") as f:
        metadata = json.load(f)
    return tickets, revenue, soldout, metadata


def predict(data: dict) -> dict:
    tickets_model, revenue_model, soldout_model, metadata = _load_models()

    row = {k: [v] for k, v in data.items()}
    row["is_musical"] = [int(row["is_musical"][0])]
    row["has_celebrity"] = [int(row["has_celebrity"][0])]
    X = pd.DataFrame(row)[FEATURES]

    tickets_sold = int(round(float(tickets_model.predict(X)[0])))
    total_revenue = float(round(revenue_model.predict(X)[0], 2))
    sold_out_prob = float(round(soldout_model.predict_proba(X)[0][1], 4))

    # Use pre-computed feature importances averaged across all three models
    fi_tickets = metadata["feature_importance"]["tickets"]
    fi_revenue = metadata["feature_importance"]["revenue"]
    fi_soldout = metadata["feature_importance"]["sold_out"]
    combined = {
        k: round((fi_tickets.get(k, 0) + fi_revenue.get(k, 0) + fi_soldout.get(k, 0)) / 3, 4)
        for k in FEATURES
    }
    # Normalize to sum to 1 and apply human-readable labels
    total = sum(combined.values()) or 1
    feature_importance = {
        FEATURE_LABELS[k]: round(v / total, 4)
        for k, v in combined.items()
    }

    return {
        "tickets_sold": tickets_sold,
        "total_revenue": total_revenue,
        "sold_out_probability": sold_out_prob,
        "feature_importance": feature_importance,
    }
