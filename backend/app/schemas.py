from datetime import datetime
from typing import Literal, Optional

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


class SensitivityItem(BaseModel):
    lever: str
    label: str
    change: str
    tickets_sold: int
    total_revenue: float
    tickets_delta: int
    revenue_delta: float


class PredictionResponse(BaseModel):
    id: int
    tickets_sold: int
    total_revenue: float
    sold_out_probability: float
    feature_importance: dict[str, float]
    created_at: datetime
    # Optional new fields — defaults keep the response backward-compatible
    tickets_sold_low: Optional[int] = None
    tickets_sold_high: Optional[int] = None
    total_revenue_low: Optional[float] = None
    total_revenue_high: Optional[float] = None
    occupancy_rate: Optional[float] = None
    capped_at_capacity: Optional[bool] = None
    max_tickets: Optional[int] = None
    sensitivity: list[SensitivityItem] = []


class HistoryItem(BaseModel):
    id: int
    created_at: datetime
    inputs: dict
    tickets_sold: float
    total_revenue: float
    sold_out_probability: float

    class Config:
        from_attributes = True
