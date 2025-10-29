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
    similarity_score: Optional[float] = 0.0  # Added this field

    @field_validator("event_id", mode="before")
    def validate_event_id(cls, v):
        """Ensure event_id is always an integer"""
        if v is None:
            return 0
        try:
            return int(float(v))  # Handle both int and float types
        except (ValueError, TypeError):
            return 0

    @field_validator("tags", mode="before")
    def parse_tags(cls, v):
        if isinstance(v, list):
            return [tag.strip() for tag in v if tag.strip()]
        elif isinstance(v, str):
            v = v.strip("{} ")
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return []

    @field_validator("similarity_score", mode="before")
    def validate_similarity_score(cls, v):
        """Ensure similarity_score is always a float"""
        if v is None:
            return 0.0
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0

class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: List[EventRecommendation]

# ------------------------------
# Routes
# ------------------------------

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
def get_recommendations(user_id: int, top_k: int = Query(15, ge=1, le=100), query: str = Query("", min_length=0)):
    try:
        print(f"🎯 API: Getting recommendations for user {user_id}, top_k={top_k}")
        
        # 1️⃣ Get recommended events from your recommender
        recommendations = recommend_events(user_id=user_id, top_k=top_k)
        
        # Debug: Check what's returned
        print(f"📊 API: Received {len(recommendations) if recommendations else 0} recommendations")
        
        if not recommendations:
            print("⚠️ API: No recommendations received, returning empty list")
            return RecommendationResponse(user_id=user_id, recommendations=[])
        
        # Ensure all items are dictionaries
        rec_dicts = []
        for rec in recommendations:
            if isinstance(rec, dict):
                rec_dicts.append(rec)
            else:
                # If it's a Pydantic model or other object, convert to dict
                rec_dicts.append(rec.dict() if hasattr(rec, 'dict') else rec)
        
        print(f"✅ API: Processed {len(rec_dicts)} recommendation dictionaries")
        
        # 2️⃣ If query is provided, filter recommendations
        if query:
            print(f"🔍 API: Filtering with query: '{query}'")
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
                event_id = rec.get('event_id')
                event = event_lookup.get(event_id)
                if not event:
                    continue
                    
                title = str(event.get('title') or "").lower()
                location = str(event.get('location') or "").lower()
                tags = [str(t).lower() for t in event['tags']]

                # Compute similarity score
                score = max(
                    similarity(title, q),
                    similarity(location, q),
                    max((similarity(t, q) for t in tags), default=0)
                )
                if q in title or q in location or any(q in t for t in tags):
                    score += 0.2

                if score > 0.3:
                    filtered.append((score, rec))

            # Sort by similarity descending
            filtered.sort(key=lambda x: x[0], reverse=True)
            rec_dicts = [r for _, r in filtered]
            print(f"✅ API: After filtering, {len(rec_dicts)} recommendations remain")

        # 3️⃣ Convert to Pydantic models with error handling
        events = []
        for i, rec in enumerate(rec_dicts):
            try:
                # Ensure all required fields are present
                if 'title' not in rec:
                    rec['title'] = f"Event {rec.get('event_id', 'Unknown')}"
                
                # Convert to Pydantic model
                event_model = EventRecommendation(**rec)
                events.append(event_model)
            except Exception as e:
                print(f"❌ API: Error converting recommendation {i}: {e}")
                print(f"❌ API: Problematic data: {rec}")
                continue

        print(f"🎁 API: Successfully created {len(events)} EventRecommendation objects")
        
        return RecommendationResponse(user_id=user_id, recommendations=events)

    except Exception as e:
        print(f"❌ API: Critical error: {e}")
        traceback.print_exc()
        # Return empty recommendations instead of crashing
        return RecommendationResponse(user_id=user_id, recommendations=[])