from fastapi import APIRouter # type: ignore
from services.recommender import recommend_events

router = APIRouter()  # ✅ Fixed typo: APIRouterr() ➜ APIRouter()

@router.get("/recommendations/{user_id}")
def get_recommendations(user_id: int, top_k: int = 15):
    recommendations = recommend_events(user_id=user_id, top_k=top_k)
    return {
        "user_id": user_id,
        "recommendations": recommendations
    }
