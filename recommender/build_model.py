import os
import math
import json
import psycopg2
from typing import List, Dict, Any, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "similarity_model.json")


class SimilarityModelBuilder:
    """
    Builds a simple similarity model for events using bag-of-words and cosine similarity.
    Loads events from PostgreSQL, computes a similarity matrix, and saves it as JSON.
    """

    def __init__(self, db_config: Dict[str, Any], model_path: str) -> None:
        self.db_config = db_config
        self.model_path = model_path

    # --- Database connection ---

    def get_connection(self):
        """Create and return a new PostgreSQL connection."""
        return psycopg2.connect(**self.db_config)

    # --- Text processing utilities ---

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Simple whitespace tokenizer, lowercased and stripped."""
        if not text:
            return []
        return [word.lower().strip() for word in text.split() if word.strip()]

    @staticmethod
    def parse_tags(tags: Any) -> List[str]:
        """
        Parse tags from the DB.

        Supports:
        - Postgres text[] → comes into Python as a list: ['Ai', 'DataAnalysis', ...]
        - String format "{Ai,DataAnalysis,...}"
        """
        # Case 1: Postgres text[] → Python list
        if isinstance(tags, list):
            return [str(tag).strip() for tag in tags if str(tag).strip()]

        # Case 2: String in "{tag1,tag2}" format
        if isinstance(tags, str):
            s = tags.strip()
            # remove surrounding { } if present
            if s.startswith("{") and s.endswith("}"):
                s = s[1:-1]
            return [t.strip() for t in s.split(",") if t.strip()]

        # Fallback: no tags
        return []

    # --- Data loading ---

    def load_events(self) -> List[Dict[str, Any]]:
        """
        Load events from the database and return a list of dicts:
        [
          {"id": int, "tokens": List[str]},
          ...
        ]
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT "event_id", title, tags, location FROM public."Event";')
        rows = cursor.fetchall()

        conn.close()

        events = []
        for row in rows:
            event_id, title, tags, location = row

            # Ensure event_id is an integer
            try:
                event_id = int(event_id)
            except (ValueError, TypeError):
                continue  # skip invalid IDs

            tags_list = self.parse_tags(tags)

            # Use tags as the main text; if tags are empty, fall back to title
            text_source = " ".join(tags_list) or (title or "")
            tokens = self.tokenize(text_source)

            events.append({
                "id": event_id,
                "tokens": tokens
            })

        return events

    # --- Vectorization ---

    def build_vocab(self, events: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Build a vocabulary mapping word -> index based on event tokens.
        """
        vocab: Dict[str, int] = {}
        for ev in events:
            for word in ev["tokens"]:
                if word not in vocab:
                    vocab[word] = len(vocab)
        return vocab

    def vectorize_events(self, events: List[Dict[str, Any]], vocab: Dict[str, int]) -> List[List[int]]:
        """
        Convert event tokens into count vectors using the vocabulary.
        """
        vectors: List[List[int]] = []
        vocab_size = len(vocab)

        for ev in events:
            vec = [0] * vocab_size
            for word in ev["tokens"]:
                idx = vocab[word]
                vec[idx] += 1
            vectors.append(vec)

        return vectors

    # --- Similarity computation ---

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if not norm1 or not norm2:
            return 0.0
        return dot / (norm1 * norm2)

    def compute_similarity_matrix(self, vectors: List[List[int]]) -> List[List[float]]:
        """
        Compute a full cosine similarity matrix for the given vectors.
        """
        n = len(vectors)
        similarity_matrix: List[List[float]] = []

        for i in range(n):
            row: List[float] = []
            for j in range(n):
                sim = self.cosine_similarity(vectors[i], vectors[j])
                row.append(round(sim, 4))  # Round for smaller file size
            similarity_matrix.append(row)

        return similarity_matrix

    # --- Persistence ---

    def save_model(self, event_ids: List[int], similarity_matrix: List[List[float]]) -> None:
        """
        Save the model (event IDs + similarity matrix) as JSON.
        """
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

        data = {
            "event_ids": event_ids,
            "similarity_matrix": similarity_matrix,
        }

        with open(self.model_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    # --- High-level entry point ---

    def build(self) -> None:
        """
        Full pipeline:
        1. Load events
        2. Build vocabulary
        3. Vectorize events
        4. Compute similarity matrix
        5. Save model
        """
        events = self.load_events()
        if not events:
            print("⚠️ No valid events found. Model not built.")
            return

        vocab = self.build_vocab(events)
        vectors = self.vectorize_events(events, vocab)
        similarity_matrix = self.compute_similarity_matrix(vectors)

        event_ids = [int(ev["id"]) for ev in events]
        self.save_model(event_ids, similarity_matrix)

        print(f"✅ Model built from {len(events)} events and saved at: {self.model_path}")


if __name__ == "__main__":
    db_config = {
        "host": "localhost",
        "database": "eventdb",
        "user": "postgres",
        "password": "postgres",
    }

    builder = SimilarityModelBuilder(db_config=db_config, model_path=MODEL_PATH)
    builder.build()
