import os
import csv
import math
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVENTS_PATH = os.path.join(BASE_DIR, "data", "events.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "similarity_model.json")

def tokenize(text):
    return [word.lower().strip() for word in text.split() if word.strip()]

def build_similarity_model():
    # Load CSV manually
    events = []
    with open(EVENTS_PATH, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            row["id"] = i
            # Use tags if available, else fallback to title+category
            text = row.get("tags") or (row.get("category", "") + " " + row.get("title", ""))
            row["tokens"] = tokenize(text)
            events.append(row)

    # Build vocabulary
    vocab = {}
    for ev in events:
        for word in ev["tokens"]:
            if word not in vocab:
                vocab[word] = len(vocab)

    # Convert each event into vector
    vectors = []
    for ev in events:
        vec = [0] * len(vocab)
        for word in ev["tokens"]:
            vec[vocab[word]] += 1
        vectors.append(vec)

    # Compute cosine similarity
    def cosine_similarity(v1, v2):
        dot = sum(a*b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a*a for a in v1))
        norm2 = math.sqrt(sum(b*b for b in v2))
        return dot / (norm1 * norm2) if norm1 and norm2 else 0.0

    similarity_matrix = []
    for i in range(len(vectors)):
        row = []
        for j in range(len(vectors)):
            row.append(cosine_similarity(vectors[i], vectors[j]))
        similarity_matrix.append(row)

    # Save as JSON (instead of pickle)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "event_ids": [ev["id"] for ev in events],
            "similarity_matrix": similarity_matrix
        }, f)

    print("✅ Pure Python model built and saved at:", MODEL_PATH)

if __name__ == "__main__":
    build_similarity_model()
