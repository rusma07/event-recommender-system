from fastapi import APIRouter, Query
import pandas as pd
import psycopg2
from difflib import SequenceMatcher

router = APIRouter()

# === Database connection ===
def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="eventdb",
        user="postgres",
        password="postgres"
    )

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

@router.get("/api/events/search")
def search_events(query: str = Query("", min_length=1)):
    try:
        conn = get_connection()
        df = pd.read_sql('SELECT * FROM public."Event";', conn)
        conn.close()

        # Parse tags safely
        def parse_tags(x):
            if isinstance(x, list):
                return x
            elif isinstance(x, str):
                return [t.strip() for t in x.strip("{}").split(",") if t.strip()]
            else:
                return []

        df['tags'] = df['tags'].apply(parse_tags)

        q = query.lower()
        results = []

        for _, row in df.iterrows():
            event_name = str(row['event_name'] or "").lower()
            location = str(row['location'] or "").lower()
            tags = [str(t).lower() for t in row['tags']]

            from difflib import SequenceMatcher
            def similarity(a, b):
                return SequenceMatcher(None, a, b).ratio()

            score = max(
                similarity(event_name, q),
                similarity(location, q),
                max((similarity(t, q) for t in tags), default=0)
            )

            if q in event_name or q in location or any(q in t for t in tags):
                score += 0.2

            if score > 0.3:
                results.append((score, row.to_dict()))

        results.sort(key=lambda x: x[0], reverse=True)
        return [event for _, event in results]

    except Exception as e:
        return {"error": str(e)}

