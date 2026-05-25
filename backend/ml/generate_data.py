"""Generate a synthetic dataset of theatre productions with realistic feature-to-outcome relationships."""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd

RNG = np.random.default_rng(seed=42)

GENRES = ["Musical", "Drama", "Comedy", "Tragedy", "Thriller", "Family", "Experimental"]
SEASONS = ["Spring", "Summer", "Fall", "Winter"]

# Per-genre base appeal multipliers (musicals and family shows tend to sell more)
GENRE_APPEAL = {
    "Musical": 1.25,
    "Drama": 0.95,
    "Comedy": 1.10,
    "Tragedy": 0.80,
    "Thriller": 1.00,
    "Family": 1.15,
    "Experimental": 0.65,
}

SEASON_LIFT = {"Spring": 1.05, "Summer": 0.95, "Fall": 1.10, "Winter": 1.15}


def generate(n: int = 5000) -> pd.DataFrame:
    genre = RNG.choice(GENRES, size=n)
    season = RNG.choice(SEASONS, size=n)
    capacity = RNG.integers(200, 2000, size=n)
    ticket_price = np.round(RNG.uniform(25, 250, size=n), 2)
    marketing_spend = np.round(RNG.uniform(5_000, 500_000, size=n), 2)
    run_length_weeks = RNG.integers(2, 32, size=n)
    cast_popularity = np.round(RNG.uniform(1, 10, size=n), 2)
    is_musical = (genre == "Musical").astype(int)
    has_celebrity = (RNG.random(n) < (cast_popularity / 12)).astype(int)
    prior_show_avg_rating = np.round(RNG.uniform(1, 10, size=n), 2)

    # ------------------------------------------------------------------
    # Build outcomes with sensible (but noisy) relationships.
    # ------------------------------------------------------------------
    genre_mult = np.array([GENRE_APPEAL[g] for g in genre])
    season_mult = np.array([SEASON_LIFT[s] for s in season])

    # Base occupancy rate driven by appeal + cast + marketing + rating
    base_occupancy = (
        0.30
        + 0.04 * cast_popularity
        + 0.025 * prior_show_avg_rating
        + 0.10 * has_celebrity
        + 0.000_0008 * marketing_spend  # diminishing returns approximated linearly
    )
    # Price elasticity: higher prices reduce occupancy
    price_penalty = (ticket_price - 75) * 0.0015
    occupancy_rate = (base_occupancy - price_penalty) * genre_mult * season_mult
    occupancy_rate = np.clip(
        occupancy_rate + RNG.normal(0, 0.06, size=n),
        0.05,
        0.99,
    )

    # 8 shows per week is a reasonable Broadway baseline
    total_shows = run_length_weeks * 8
    expected_tickets_sold = (occupancy_rate * capacity * total_shows).astype(int)
    total_revenue = np.round(expected_tickets_sold * ticket_price, 2)

    # Sold-out flag: any production averaging >88% occupancy
    sold_out = (occupancy_rate > 0.88).astype(int)

    df = pd.DataFrame(
        {
            "genre": genre,
            "season": season,
            "capacity": capacity,
            "ticket_price": ticket_price,
            "marketing_spend": marketing_spend,
            "run_length_weeks": run_length_weeks,
            "cast_popularity": cast_popularity,
            "is_musical": is_musical,
            "has_celebrity": has_celebrity,
            "prior_show_avg_rating": prior_show_avg_rating,
            # targets
            "tickets_sold": expected_tickets_sold,
            "total_revenue": total_revenue,
            "sold_out": sold_out,
        }
    )
    return df


def main() -> None:
    out_dir = Path(__file__).parent / "artifacts"
    out_dir.mkdir(parents=True, exist_ok=True)
    df = generate()
    out_path = out_dir / "productions.csv"
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")
    print(df.head())
    print("\nTarget summary:")
    print(df[["tickets_sold", "total_revenue", "sold_out"]].describe())


if __name__ == "__main__":
    main()
