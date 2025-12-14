# indexer.py
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer # type: ignore
from opensearchpy import OpenSearch, helpers # type: ignore

APP_NAME = "EventIndexer"
app = FastAPI(title=APP_NAME)

# -----------------------------
# Env
# -----------------------------
OS_HOST = os.getenv("OS_HOST", "localhost")
OS_PORT = int(os.getenv("OS_PORT", "9200"))
OS_USER = os.getenv("OS_USER")         # optional
OS_PASS = os.getenv("OS_PASS")         # optional
OS_SSL  = os.getenv("OS_SSL", "false").lower() == "true"
OS_INDEX = os.getenv("OS_EVENT_INDEX", "events")
MODEL_NAME = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")  # 384 dims

# -----------------------------
# OpenSearch client
# -----------------------------
os_client = OpenSearch(
    hosts=[{"host": OS_HOST, "port": OS_PORT}],
    http_auth=(OS_USER, OS_PASS) if OS_USER and OS_PASS else None,
    use_ssl=OS_SSL,
    verify_certs=False,
)

# -----------------------------
# Model (load once)
# -----------------------------
model = SentenceTransformer(MODEL_NAME)
EMBED_DIM = model.get_sentence_embedding_dimension()

# -----------------------------
# Mapping helper (ensure index)
# -----------------------------
def ensure_index():
    if os_client.indices.exists(index=OS_INDEX):
        return
    body = {
        "settings": {"index": {"knn": True}},
        "mappings": {
            "properties": {
                "event_id": {"type": "integer"},
                "title": {"type": "text"},
                "tags": {"type": "keyword"},
                "location": {"type": "keyword"},
                "url": {"type": "keyword", "ignore_above": 2048},
                "image": {"type": "keyword", "ignore_above": 2048},
                "vector": {
                    "type": "knn_vector",
                    "dimension": EMBED_DIM,
                    "method": {
                        "name": "hnsw",
                        "engine": "nmslib",
                        "space_type": "cosinesimil"
                    }
                }
            }
        },
    }
    os_client.indices.create(index=OS_INDEX, body=body)

ensure_index()

# -----------------------------
# Schemas
# -----------------------------
class EventIn(BaseModel):
    event_id: int
    title: str
    tags: Optional[List[str]] = []
    location: Optional[str] = None
    url: Optional[str] = None
    image: Optional[str] = None
    # add fields if you later add columns (e.g., description)

# -----------------------------
# Embedding
# -----------------------------
def embed_event(ev: EventIn) -> list[float]:
    # Build a compact text for embedding (tune as you like)
    text_parts = [ev.title]
    if ev.tags:
        text_parts.append(" ".join([t for t in ev.tags if t]))
    if ev.location:
        text_parts.append(ev.location)
    text = " ".join(text_parts)
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()

# -----------------------------
# Upsert / Delete
# -----------------------------
@app.get("/index/health")
def health():
    return {"ok": True, "index": OS_INDEX, "model": MODEL_NAME, "dim": EMBED_DIM}

@app.post("/index/event")
def index_event(ev: EventIn):
    try:
        vec = embed_event(ev)
        body = ev.model_dump() | {"vector": vec}
        os_client.index(index=OS_INDEX, id=ev.event_id, body=body, refresh=False)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, f"Index error: {e}")

@app.delete("/index/event/{event_id}")
def delete_event(event_id: int):
    try:
        os_client.delete(index=OS_INDEX, id=event_id, ignore=[404], refresh=False)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, f"Delete error: {e}")

# -----------------------------
# Bulk reindex (from payload)
#   Use this for backfill if your Node API sends a list of events
# -----------------------------
class EventsPayload(BaseModel):
    events: List[EventIn]

@app.post("/index/reindex")
def reindex_events(payload: EventsPayload):
    actions = []
    for ev in payload.events:
        vec = embed_event(ev)
        body = ev.model_dump() | {"vector": vec}
        actions.append({
            "_op_type": "index",
            "_index": OS_INDEX,
            "_id": ev.event_id,
            "_source": body
        })

    success, fail = helpers.bulk(os_client, actions, refresh=True, raise_on_error=False)
    return {"ok": True, "indexed": success, "failed": len(fail)}
