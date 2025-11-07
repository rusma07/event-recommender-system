# ingest_from_postgres.py
import os, json
import psycopg2, psycopg2.extras
import requests  #type: ignore
from sentence_transformers import SentenceTransformer #type: ignore

ES = os.getenv("ES_URL", "http://localhost:9200")
INDEX = os.getenv("ES_INDEX", "events")
DB = dict(
    host=os.getenv("PGHOST","localhost"),
    dbname=os.getenv("PGDATABASE","eventdb"),
    user=os.getenv("PGUSER","postgres"),
    password=os.getenv("PGPASSWORD","postgres"),
)

MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_DB = 1000
ENC_BATCH = 128

model = SentenceTransformer(MODEL)

def get_conn():
    return psycopg2.connect(**DB)

def fetch_rows():
    # Adjust column names / table to your schema.
    # If tags is TEXT[] in Postgres, psycopg2 returns a Python list automatically.
    sql = 'SELECT "event_id"::text AS id, title, tags FROM public."Event" ORDER BY "event_id"'
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.itersize = BATCH_DB
        cur.execute(sql)
        for row in cur:
            title = row["title"] or ""
            tags = row["tags"]
            if isinstance(tags, list):
                tags_list = [str(t).strip() for t in tags if str(t).strip()]
            elif isinstance(tags, str):
                # fallback if stored like "{ai,networking}"
                tags_list = [t.strip() for t in tags.strip("{}").split(",") if t.strip()]
            else:
                tags_list = []
            yield {"id": row["id"], "title": title, "tags": tags_list}

def bulk_post(actions):
    payload = "\n".join(json.dumps(x, ensure_ascii=False) for x in actions) + "\n"
    r = requests.post(f"{ES}/_bulk",
                      headers={"Content-Type":"application/x-ndjson"},
                      data=payload, timeout=120)
    r.raise_for_status()
    j = r.json()
    if j.get("errors"):
        first_err = next((it.get("index",{}).get("error") for it in j.get("items",[]) if it.get("index",{}).get("error")), None)
        raise RuntimeError(f"Bulk error: {first_err}")
    return j

def main():
    buffer = []
    for row in fetch_rows():
        buffer.append(row)
        if len(buffer) >= BATCH_DB:
            flush(buffer); buffer = []
    if buffer:
        flush(buffer)
    print("✅ Indexed all events to Elasticsearch.")

def flush(rows):
    texts = [f"{r['title']}. tags: {', '.join(r['tags'])}" for r in rows]
    vecs = model.encode(texts, batch_size=ENC_BATCH, normalize_embeddings=True).tolist()
    actions = []
    for r, v in zip(rows, vecs):
        actions += [
            {"index": {"_index": INDEX, "_id": r["id"]}},
            {
                "id": r["id"],
                "title": r["title"],
                "tags": r["tags"],
                "title_suggest": r["title"],
                "tags_suggest": r["tags"],
                "vector": v
            }
        ]
    bulk_post(actions)

if __name__ == "__main__":
    main()
