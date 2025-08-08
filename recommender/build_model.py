import pandas as pd # type: ignore
import json
from sklearn.feature_extraction.text import CountVectorizer # type: ignore
from sklearn.metrics.pairwise import cosine_similarity # type: ignore
import pickle
import os

# Base directory of this script file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# File paths relative to the script location
EVENTS_CSV_PATH = os.path.join(BASE_DIR, "data", "events.csv")
INTERACTIONS_PATH = os.path.join(BASE_DIR, "data", "user_event.json")
MODEL_PATH = os.path.join(BASE_DIR, "models", "similarity_model.pkl")


def load_data():
    # Load events from CSV
    events_df = pd.read_csv(EVENTS_CSV_PATH)

    # Add unique ID column starting from 1
    events_df.insert(0, 'id', range(1, len(events_df) + 1))

    # Convert tags from semicolon-separated string to space-separated lowercase string for vectorization
    events_df['tag_string'] = events_df['tags'].apply(lambda x: ' '.join(x.split(';')).lower())

    # Load interactions from JSON file
    with open(INTERACTIONS_PATH, 'r') as f:
        interactions = json.load(f)
    interactions_df = pd.DataFrame(interactions)

    return events_df, interactions_df


def build_similarity_model(events_df):
    # Vectorize the tag strings
    vectorizer = CountVectorizer()
    tag_vectors = vectorizer.fit_transform(events_df['tag_string'])

    # Compute cosine similarity
    similarity_matrix = cosine_similarity(tag_vectors)

    # Ensure model directory exists
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    # Save similarity matrix and event index
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump({
            'similarity_matrix': similarity_matrix,
            'event_ids': events_df['id'].tolist()
        }, f)

    print("✅ Similarity model saved to", MODEL_PATH)


if __name__ == "__main__":
    events_df, interactions_df = load_data()
    build_similarity_model(events_df)
