import os
import math
import json
import psycopg2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "similarity_model.json")

# --- Database connection ---
def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="eventdb",
        user="postgres",
        password="postgres"
    )

def tokenize(text):
    return [word.lower().strip() for word in text.split() if word.strip()]

def build_similarity_model():
    # --- Load events from DB ---
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT "event_id", title, tags, location FROM public."Event";')
    rows = cursor.fetchall()
    conn.close()

    events = []
    for row in rows:
        event_id, title, tags, location = row

        # --- Ensure event_id is integer ---
        try:
            event_id = int(event_id)
        except (ValueError, TypeError):
            continue  # Skip if invalid

        # --- Parse tags ---
        if isinstance(tags, str):
            tags_list = [tag.strip() for tag in tags.strip("{}").split(",") if tag.strip()]
        else:
            tags_list = []

        # --- Combine tags + title for text ---
        text = " ".join(tags_list) or (title or "")
        events.append({
            "id": event_id,
            "tokens": tokenize(text)
        })

    # --- Build vocabulary ---
    vocab = {}
    for ev in events:
        for word in ev["tokens"]:
            if word not in vocab:
                vocab[word] = len(vocab)

    # --- Convert events to vectors ---
    vectors = []
    for ev in events:
        vec = [0] * len(vocab)
        for word in ev["tokens"]:
            vec[vocab[word]] += 1
        vectors.append(vec)

    # --- Compute cosine similarity ---
    def cosine_similarity(v1, v2):
        dot = sum(a*b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a*a for a in v1))
        norm2 = math.sqrt(sum(b*b for b in v2))
        return dot / (norm1 * norm2) if norm1 and norm2 else 0.0

    similarity_matrix = []
    for i in range(len(vectors)):
        row = []
        for j in range(len(vectors)):
            sim = cosine_similarity(vectors[i], vectors[j])
            row.append(round(sim, 4))  # Round for smaller file size
        similarity_matrix.append(row)

    # --- Save model as JSON ---
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "event_ids": [int(ev["id"]) for ev in events],
            "similarity_matrix": similarity_matrix
        }, f, indent=2)

    print(f"✅ Model built from {len(events)} events and saved at:", MODEL_PATH)


if __name__ == "__main__":
    build_similarity_model()
