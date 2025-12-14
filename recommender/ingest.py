# ingest_from_postgres.py
import os, json
import psycopg2, psycopg2.extras
import requests  # type: ignore
from sentence_transformers import SentenceTransformer  # type: ignore


ES = os.getenv("ES_URL", "http://localhost:9200")
INDEX = os.getenv("ES_INDEX", "events")
DB = dict(
    host=os.getenv("PGHOST", "localhost"),
    dbname=os.getenv("PGDATABASE", "eventdb"),
    user=os.getenv("PGUSER", "postgres"),
    password=os.getenv("PGPASSWORD", "postgres"),
)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BATCH_DB = 1000
ENC_BATCH = 128


class EventIndexer:
    def __init__(
        self,
        es_url: str,
        index: str,
        db_config: dict,
        model_name: str,
        batch_db: int,
        enc_batch: int,
    ) -> None:
        self.es_url = es_url
        self.index = index
        self.db_config = db_config
        self.model_name = model_name
        self.batch_db = batch_db
        self.enc_batch = enc_batch

        # Same model as before, just stored on the instance
        self.model = SentenceTransformer(self.model_name)

    def get_conn(self):
        return psycopg2.connect(**self.db_config)

    def fetch_rows(self):
        """
        Yields rows in exactly the same shape as before:
        {"id": <str>, "title": <str>, "tags": <list[str]>}
        """
        sql = (
            'SELECT "event_id"::text AS id, title, tags '
            'FROM public."Event" ORDER BY "event_id"'
        )
        with self.get_conn() as conn, conn.cursor(
            cursor_factory=psycopg2.extras.DictCursor
        ) as cur:
            cur.itersize = self.batch_db
            cur.execute(sql)
            for row in cur:
                title = row["title"] or ""
                tags = row["tags"]

                if isinstance(tags, list):
                    tags_list = [str(t).strip() for t in tags if str(t).strip()]
                elif isinstance(tags, str):
                    # fallback if stored like "{ai,networking}"
                    tags_list = [
                        t.strip()
                        for t in tags.strip("{}").split(",")
                        if t.strip()
                    ]
                else:
                    tags_list = []

                yield {"id": row["id"], "title": title, "tags": tags_list}

    def bulk_post(self, actions):
        """
        Same bulk indexing behavior as before.
        """
        payload = "\n".join(
            json.dumps(x, ensure_ascii=False) for x in actions
        ) + "\n"
        r = requests.post(
            f"{self.es_url}/_bulk",
            headers={"Content-Type": "application/x-ndjson"},
            data=payload,
            timeout=120,
        )
        r.raise_for_status()
        j = r.json()
        if j.get("errors"):
            first_err = next(
                (
                    it.get("index", {}).get("error")
                    for it in j.get("items", [])
                    if it.get("index", {}).get("error")
                ),
                None,
            )
            raise RuntimeError(f"Bulk error: {first_err}")
        return j

    def flush(self, rows):
        """
        Encodes and indexes a batch of rows.
        Functionality is identical to your original flush().
        """
        texts = [
            f"{r['title']}. tags: {', '.join(r['tags'])}"
            for r in rows
        ]
        vecs = self.model.encode(
            texts,
            batch_size=self.enc_batch,
            normalize_embeddings=True,
        ).tolist()

        actions = []
        for r, v in zip(rows, vecs):
            actions += [
                {"index": {"_index": self.index, "_id": r["id"]}},
                {
                    "id": r["id"],
                    "title": r["title"],
                    "tags": r["tags"],
                    "title_suggest": r["title"],
                    "tags_suggest": r["tags"],
                    "vector": v,
                },
            ]

        self.bulk_post(actions)

    def run(self):
        """
        Same logic as main(): fetch rows in batches and flush.
        """
        buffer = []
        for row in self.fetch_rows():
            buffer.append(row)
            if len(buffer) >= self.batch_db:
                self.flush(buffer)
                buffer = []
        if buffer:
            self.flush(buffer)
        print("✅ Indexed all events to Elasticsearch.")


def main():
    indexer = EventIndexer(
        es_url=ES,
        index=INDEX,
        db_config=DB,
        model_name=MODEL_NAME,
        batch_db=BATCH_DB,
        enc_batch=ENC_BATCH,
    )
    indexer.run()


if __name__ == "__main__":
    main()
