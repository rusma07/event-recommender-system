import os
import json
import math
import pandas as pd # type: ignore
import pickle

# === Paths Setup ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # e.g. ...\recommender\services

EVENTS_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "data", "events.csv"))
INTERACTIONS_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "data", "user_event.json"))
MODEL_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "models", "similarity_model.pkl"))

# === Load Events Data ===
def load_events():
    df = pd.read_csv(EVENTS_PATH)
    df.insert(0, 'id', range(1, len(df) + 1))  # add numeric event ID if not present
    return df

# === Load User Interaction Data ===
def load_user_interactions():
    with open(INTERACTIONS_PATH, 'r') as f:
        interactions = json.load(f)
    return pd.DataFrame(interactions)

# === Clean NaNs in recommendations ===
def clean_recommendations(recommendations):
    cleaned = []
    for rec in recommendations:
        cleaned_rec = {}
        for k, v in rec.items():
            if isinstance(v, float) and math.isnan(v):
                if k == "price":
                    cleaned_rec[k] = "Free"  # default for price NaN
                else:
                    cleaned_rec[k] = ""
            elif v is None:
                cleaned_rec[k] = ""
            else:
                cleaned_rec[k] = v
        cleaned.append(cleaned_rec)
    return cleaned

# === Recommendation Function ===
def recommend_events(user_id, top_k=10):
    events_df = load_events()
    interactions_df = load_user_interactions()

    # Load similarity matrix and event IDs
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)

    similarity_matrix = model["similarity_matrix"]
    event_ids = model["event_ids"]
    event_id_to_index = {eid: idx for idx, eid in enumerate(event_ids)}

    # Filter user interactions for the given user
    user_interactions = interactions_df[interactions_df["user_id"] == user_id]

    if user_interactions.empty:
        print(f"⚠️ No interactions found for user: {user_id}")
        return []

    # Only consider meaningful interaction types (adjust as needed)
    valid_types = ["view", "register", "tag_click"]
    interacted_event_ids = user_interactions[user_interactions["interaction_type"].isin(valid_types)]["event_id"].tolist()

    if not interacted_event_ids:
        print(f"⚠️ User {user_id} has no valid interactions for recommendation.")
        return []

    # Map event IDs to indices in similarity matrix
    interacted_indices = [event_id_to_index[eid] for eid in interacted_event_ids if eid in event_id_to_index]

    if not interacted_indices:
        print(f"⚠️ No matching events in similarity matrix for user {user_id}.")
        return []

    # Compute average similarity vector
    avg_similarity = similarity_matrix[interacted_indices].mean(axis=0)

    # Build DataFrame of similarity scores
    scores_df = pd.DataFrame({
        "id": event_ids,
        "similarity_score": avg_similarity
    })

    # Exclude events already interacted with
    scores_df = scores_df[~scores_df["id"].isin(interacted_event_ids)]

    # Merge similarity scores with event metadata
    merged_df = scores_df.merge(events_df, on="id").sort_values(by="similarity_score", ascending=False)

    # Get top K recommendations
    top_events = merged_df.head(top_k)

    # Convert to dict and clean NaNs
    top_events_list = top_events[[
        "title", "url", "image", "start_date", "end_date",
        "location", "tags", "price", "similarity_score"
    ]].to_dict(orient="records")

    return clean_recommendations(top_events_list)

# === Example usage ===
if __name__ == "__main__":
    user_id = 2  # change as needed
    recommendations = recommend_events(user_id=user_id, top_k=15)

    if recommendations:
        print(f"Top recommendations for user {user_id}:")
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec['title']} (Score: {rec['similarity_score']:.3f})")
    else:
        print(f"No recommendations available for user {user_id}.")
