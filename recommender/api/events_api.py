# api/event_api.py

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel, field_validator
from datetime import date
import pandas as pd
import psycopg2
import traceback
from difflib import SequenceMatcher
from services.recommender import recommend_events

# ------------------------------
# Setup
# ------------------------------
router = APIRouter()

def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="eventdb",
        user="postgres",
        password="postgres"
    )

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# ------------------------------
# Pydantic Models
# ------------------------------
class EventRecommendation(BaseModel):
    event_id: int
    title: str
    image: Optional[str] = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location: Optional[str] = ""
    tags: List[str] = []
    price: Optional[str] = "Free"
    url: Optional[str] = ""

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
# Routes
# ------------------------------

# 🔍 Search events
@router.get("/api/events/search")
def search_events(query: str = Query("", min_length=0)):
    conn = get_connection()
    df = pd.read_sql('SELECT * FROM public."Event";', conn)
    conn.close()

    df["tags"] = df["tags"].apply(
        lambda x: x if isinstance(x, list)
        else [t.strip() for t in x.strip("{}").split(",")] if x else []
    )

    q = query.lower()
    filtered = df[
        df["title"].str.lower().str.contains(q, na=False)
        | df["location"].str.lower().str.contains(q, na=False)
        | df["tags"].apply(lambda tags: any(q in t.lower() for t in tags))
    ]

    return filtered.to_dict(orient="records")

# 👁️ Get single event by ID
@router.get("/api/events/{event_id}")
def get_event_by_id(event_id: int):
    conn = get_connection()
    df = pd.read_sql(f'SELECT * FROM public."Event" WHERE event_id = {event_id};', conn)
    conn.close()

    if df.empty:
        raise HTTPException(status_code=404, detail="Event not found")

    event = df.iloc[0].to_dict()

    tags_value = event.get("tags")
    if tags_value:
        if isinstance(tags_value, list):
            event["tags"] = tags_value
        else:
            event["tags"] = [
                t.strip() for t in tags_value.strip("{}").split(",") if t.strip()
            ]
    else:
        event["tags"] = []

    return event

# 🤖 Personalized recommendations with optional search query
@router.get("/api/events/recommendations/{user_id}", response_model=RecommendationResponse)
def get_recommendations(user_id: int, top_k: int = 15, query: str = Query("", min_length=0)):
    try:
        # 1️⃣ Get recommended events from your recommender
        recommendations = recommend_events(user_id=user_id, top_k=top_k)
        rec_dicts = [rec if isinstance(rec, dict) else rec.dict() for rec in recommendations]

        # 2️⃣ If query is provided, filter recommendations
        if query:
            q = query.lower()

            # Fetch events from DB to get full data (tags, location, title)
            conn = get_connection()
            df = pd.read_sql('SELECT * FROM public."Event";', conn)
            conn.close()

            # Parse tags safely
            def parse_tags(x):
                if isinstance(x, list):
                    return x
                elif isinstance(x, str):
                    return [t.strip() for t in x.strip("{}").split(",") if t.strip()]
                return []

            df['tags'] = df['tags'].apply(parse_tags)
            event_lookup = {row['event_id']: row for _, row in df.iterrows()}

            filtered = []
            for rec in rec_dicts:
                event = event_lookup.get(rec['event_id'])
                if not event:
                    continue
                event_name = str(event.get('event_name') or "").lower()
                location = str(event.get('location') or "").lower()
                tags = [str(t).lower() for t in event['tags']]

                # Compute similarity score
                score = max(
                    similarity(event_name, q),
                    similarity(location, q),
                    max((similarity(t, q) for t in tags), default=0)
                )
                if q in event_name or q in location or any(q in t for t in tags):
                    score += 0.2

                if score > 0.3:
                    filtered.append((score, rec))

            # Sort by similarity descending
            filtered.sort(key=lambda x: x[0], reverse=True)
            rec_dicts = [r for _, r in filtered]

        # 3️⃣ Return Pydantic response
        events = [EventRecommendation(**r) for r in rec_dicts]
        return RecommendationResponse(user_id=user_id, recommendations=events)

    except Exception as e:
        traceback.print_exc()
        return {"user_id": user_id, "recommendations": [], "error": str(e)}
