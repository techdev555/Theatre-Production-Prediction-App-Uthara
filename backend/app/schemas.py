from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    genre: Literal["Musical", "Drama", "Comedy", "Tragedy", "Thriller", "Family", "Experimental"]
    season: Literal["Spring", "Summer", "Fall", "Winter"]
    capacity: int = Field(..., ge=50, le=5000, description="Theatre seat capacity")
    ticket_price: float = Field(..., ge=5.0, le=1000.0, description="Average ticket price in USD")
    marketing_spend: float = Field(..., ge=0.0, le=2_000_000.0, description="Total marketing budget in USD")
    run_length_weeks: int = Field(..., ge=1, le=52, description="Planned run in weeks")
    cast_popularity: float = Field(..., ge=1.0, le=10.0, description="Average cast popularity score (1–10)")
    is_musical: bool
    has_celebrity: bool
    prior_show_avg_rating: float = Field(..., ge=1.0, le=10.0, description="Producer's prior shows average rating (1–10)")


class PredictionResponse(BaseModel):
    id: int
    tickets_sold: int
    total_revenue: float
    sold_out_probability: float
    feature_importance: dict[str, float]
    created_at: datetime


class HistoryItem(BaseModel):
    id: int
    created_at: datetime
    inputs: dict
    tickets_sold: float
    total_revenue: float
    sold_out_probability: float

    class Config:
        from_attributes = True
