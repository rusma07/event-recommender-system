from fastapi import APIRouter  # type: ignore
from typing import List
from pydantic import BaseModel, field_validator
from datetime import date
from services.recommender import recommend_events

router = APIRouter()

# ------------------------------
# Pydantic models for API response
# ------------------------------
class EventRecommendation(BaseModel):
    title: str
    image: str = ""
    start_date: date
    end_date: date | None = None
    location: str = ""
    tags: List[str] = []
    price: str = "Free"
    url: str = ""

    # Ensure tags are always a list of strings
    @field_validator("tags", mode="before")
    def parse_tags(cls, v):
        if isinstance(v, list):
            return [tag.strip() for tag in v if tag.strip()]
        elif isinstance(v, str):
            v = v.strip("{} ")
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return []

class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: List[EventRecommendation]

# ------------------------------
# API endpoint
# ------------------------------
@router.get("/recommendations/{user_id}", response_model=RecommendationResponse)
def get_recommendations(user_id: int, top_k: int = 15):
    import traceback
    try:
        # Call recommender service
        recommendations = recommend_events(user_id=user_id, top_k=top_k)

        # Convert each recommendation to Pydantic model
        events = [EventRecommendation(**rec) for rec in recommendations]

        return RecommendationResponse(user_id=user_id, recommendations=events)

    except Exception as e:
        traceback.print_exc()
        return {"user_id": user_id, "recommendations": [], "error": str(e)}
