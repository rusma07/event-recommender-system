from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict
from pydantic import BaseModel, field_validator
from datetime import date
import os
import pandas as pd
import psycopg2
import traceback
from difflib import SequenceMatcher

# --- Search deps (OpenSearch + embeddings) ---
from opensearchpy import OpenSearch  # type: ignore
from opensearchpy.exceptions import TransportError  # type: ignore
from sentence_transformers import SentenceTransformer  # type: ignore

# --- OOP Recommender imports ---
# adjust the import path if recommender_oop.py lives in a package, e.g.:
# from services.recommender_oop import DatabaseConfig, RecommendationEngine
from services.recommender import DatabaseConfig, RecommendationEngine

# Config (readable via env; defaults OK for local)
ES_URL = os.getenv("ES_URL", "http://localhost:9200")
ES_INDEX = os.getenv("ES_INDEX", "events")

router = APIRouter()
ES = OpenSearch(ES_URL, timeout=10)

# ---------- Recommender Engine (OOP) ----------
db_conf = DatabaseConfig(
    host=os.getenv("PGHOST", "localhost"),
    database=os.getenv("PGDATABASE", "eventdb"),
    user=os.getenv("PGUSER", "postgres"),
    password=os.getenv("PGPASSWORD", "postgres"),
)

engine = RecommendationEngine(db_conf)


# ---------- Embedding model (lazy) ----------
_model: Optional[SentenceTransformer] = None
def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model


def get_connection():
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        database=os.getenv("PGDATABASE", "eventdb"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
    )


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, (a or "").lower(), (b or "").lower()).ratio()


def _norm(hits) -> Dict[str, float]:
    """Min–max normalize scores into {_id: score}."""
    if not hits:
        return {}
    vals = [h.get("_score", 0.0) for h in hits]
    lo, hi = min(vals), max(vals)
    return {
        h["_id"]: ((h.get("_score", 0.0) - lo) / (hi - lo) if hi > lo else 0.0)
        for h in hits
    }


# ---------- Pydantic models ----------
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
    similarity_score: Optional[float] = 0.0

    @field_validator("event_id", mode="before")
    def validate_event_id(cls, v):
        if v is None:
            return 0
        try:
            return int(float(v))
        except (ValueError, TypeError):
            return 0

    @field_validator("tags", mode="before")
    def parse_tags(cls, v):
        if isinstance(v, list):
            return [str(tag).strip() for tag in v if str(tag).strip()]
        if isinstance(v, str):
            v = v.strip("{} ")
            return [t.strip() for t in v.split(",") if t.strip()]
        return []

    @field_validator("similarity_score", mode="before")
    def validate_similarity_score(cls, v):
        if v is None:
            return 0.0
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: List[EventRecommendation]


# ---------- Routes ----------

# 👁️ Get single event by ID
@router.get("/api/events/{event_id:int}")
def get_event_by_id(event_id: int):
    conn = get_connection()
    try:
        df = pd.read_sql(
            'SELECT * FROM public."Event" WHERE event_id = %s;',
            conn,
            params=(event_id,),
        )
    finally:
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
                t.strip() for t in str(tags_value).strip("{}").split(",") if t.strip()
            ]
    else:
        event["tags"] = []

    return event


# 🤖 Personalized recommendations with optional (local) search filter
@router.get("/api/events/recommendations/{user_id:int}", response_model=RecommendationResponse)
def get_recommendations(
    user_id: int,
    top_k: int = Query(15, ge=1, le=100),
    query: str = Query("", min_length=0),
):
    try:
        # ✅ Use OOP engine instead of functional recommend_events
        recommendations = engine.recommend_events(
            user_id=user_id,
            top_k=top_k,
            max_per_cluster=5,  # you can make this a query param if you like
        ) or []

        # Normalize to dicts
        rec_dicts = []
        for rec in recommendations:
            if isinstance(rec, dict):
                rec_dicts.append(rec)
            elif hasattr(rec, "dict"):
                rec_dicts.append(rec.dict())
            else:
                rec_dicts.append(rec)

        # Optional local search filter
        if query:
            q = query.lower()

            conn = get_connection()
            try:
                df = pd.read_sql('SELECT * FROM public."Event";', conn)
            finally:
                conn.close()

            def parse_tags_local(x):
                if isinstance(x, list):
                    return x
                if isinstance(x, str):
                    return [t.strip() for t in x.strip("{}").split(",") if t.strip()]
                return []

            if "tags" in df.columns:
                df["tags"] = df["tags"].apply(parse_tags_local)
            event_lookup = {int(row["event_id"]): row for _, row in df.iterrows()}

            filtered = []
            for rec in rec_dicts:
                eid = int(rec.get("event_id", 0) or 0)
                ev = event_lookup.get(eid)
                if not ev:
                    continue

                title = str(ev.get("title") or "").lower()
                location = str(ev.get("location") or "").lower()
                tags = [str(t).lower() for t in ev.get("tags", [])]

                score = max(
                    similarity(title, q),
                    similarity(location, q),
                    max((similarity(t, q) for t in tags), default=0.0),
                )
                if q in title or q in location or any(q in t for t in tags):
                    score += 0.2

                if score > 0.3:
                    filtered.append((score, {**rec, "similarity_score": float(score)}))

            filtered.sort(key=lambda x: x[0], reverse=True)
            rec_dicts = [r for _, r in filtered]

        # Cast to Pydantic models
        events: List[EventRecommendation] = []
        for rec in rec_dicts:
            if "title" not in rec:
                rec["title"] = f"Event {rec.get('event_id', 'Unknown')}"
            events.append(EventRecommendation(**rec))

        return RecommendationResponse(user_id=user_id, recommendations=events)

    except Exception:
        traceback.print_exc()
        return RecommendationResponse(user_id=user_id, recommendations=[])


# 🔎 Hybrid search (BM25 + vector kNN)
@router.get("/api/events/search")
def hybrid_search(q: str = Query(..., min_length=1), size: int = Query(10, ge=1, le=50)):
    """
    Perform hybrid search (BM25 + vector cosine similarity) over event index.
    Returns hydrated event data from Postgres preserving ES ranking.
    """
    # Ensure index exists / OpenSearch reachable
    try:
        if not ES.indices.exists(index=ES_INDEX):
            raise HTTPException(status_code=503, detail=f"Index '{ES_INDEX}' not found")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"OpenSearch not reachable: {e}")

    # 1️⃣ BM25 text search
    fuzz = "1" if len(q) <= 4 else "AUTO:1,2"
    bm_body = {
        "size": min(50, max(size, 10)),
        "query": {
            "bool": {
                "should": [
                    {"match": {"title": {"query": q, "fuzziness": fuzz, "boost": 2.0}}},
                    {"match": {"tags": {"query": q, "fuzziness": fuzz}}},
                ],
                "minimum_should_match": 1,
            }
        },
    }

    try:
        bm_hits = ES.search(index=ES_INDEX, body=bm_body)["hits"]["hits"]
    except TransportError as e:
        raise HTTPException(status_code=503, detail=f"BM25 query failed: {getattr(e, 'info', str(e))}")

    # 2️⃣ Vector (semantic) search
    kn_hits = []
    try:
        model = get_model()
        qvec = model.encode([f"{q}. tags: {q}"], normalize_embeddings=True)[0].tolist()
        if len(qvec) != 384:
            raise HTTPException(status_code=500, detail=f"Embedding dimension {len(qvec)} != 384")

        kn_body = {
            "size": min(50, max(size, 10)),
            "query": {
                "knn": {
                    "field": "vector",
                    "query_vector": qvec,
                    "k": min(50, max(size, 10)),
                    "num_candidates": 200,
                }
            },
        }
        kn_hits = ES.search(index=ES_INDEX, body=kn_body)["hits"]["hits"]
    except Exception as e:
        print("⚠️ kNN search failed, falling back to BM25-only:", e)

    # 3️⃣ Fuse results (if both succeed)
    if kn_hits:
        bm_norm, kn_norm = _norm(bm_hits), _norm(kn_hits)
        all_ids = set(bm_norm) | set(kn_norm)

        fused = sorted(
            ((i, 0.6 * kn_norm.get(i, 0.0) + 0.4 * bm_norm.get(i, 0.0)) for i in all_ids),
            key=lambda x: x[1],
            reverse=True,
        )[:size]

        ids_ordered = [int(i) for i, _ in fused]
        scores_map = {str(i): s for i, s in fused}

        return hydrate(ids_ordered, scores_map)

    # 4️⃣ BM25 fallback only
    ids_ordered = [int(h["_id"]) for h in bm_hits[:size]]
    scores_map = {str(h["_id"]): float(h.get("_score", 0.0)) for h in bm_hits[:size]}
    return hydrate(ids_ordered, scores_map)


# ------------------------------
# 🧩 Helper: Hydrate from Postgres
# ------------------------------
def hydrate(ids_in_order, scores_by_id):
    """Fetch event details from Postgres preserving ES ranking order."""
    if not ids_in_order:
        return []

    placeholders = ",".join(["%s"] * len(ids_in_order))
    sql = f'SELECT * FROM public."Event" WHERE event_id IN ({placeholders})'

    with get_connection() as conn:
        df = pd.read_sql(sql, conn, params=ids_in_order)

    by_id = {int(r["event_id"]): dict(r) for _, r in df.iterrows()}
    results = []

    for eid in ids_in_order:
        row = by_id.get(int(eid))
        if not row:
            continue

        tags_val = row.get("tags")
        if isinstance(tags_val, str):
            row["tags"] = [t.strip() for t in tags_val.strip("{} ").split(",") if t.strip()]
        elif isinstance(tags_val, list):
            row["tags"] = tags_val
        else:
            row["tags"] = []

        row["score"] = float(scores_by_id.get(str(eid), 0.0))
        results.append(row)

    return results
