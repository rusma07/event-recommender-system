import pandas as pd
import psycopg2
import json
import random
import math
import numpy as np
from datetime import datetime

# === DB connection ===
def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="eventdb",
        user="postgres",
        password="postgres"
    )

# === Cluster mapping for tags ===
TAG_CLUSTER_MAP = {
    # Technology & Development
    "Ai": "Tech", "Blockchain": "Tech", "Cybersecurity": "Tech", "Data Analysis": "Tech",
    "Devops": "Tech", "Mobile Development": "Tech", "Networking": "Tech",
    "Robotics": "Tech", "Tech": "Tech", "Web": "Tech",

    # Education & Professional
    "Education": "Education", "Engineering": "Education", "Business": "Education",
    "Marketing": "Education", "Pitching": "Education",

    # Community & Culture
    "Community": "Community", "Culture": "Community", "Global": "Community",
    "Local": "Community", "Literature": "Community",

    # Health & Environment
    "Health": "Health", "Sustainability": "Health", "Environment": "Health",
    "Physical": "Health",

    # Arts & Design
    "Art": "Arts", "Graphic Design": "Arts", "Entertainment": "Arts",

    # Sports & Gaming
    "Badminton": "Sports", "Chess": "Sports", "Football": "Sports",
    "Gaming": "Sports", "Hybrid": "Sports",

    # Online & Free
    "Online": "Online", "Free": "Online",

    # Startups & Innovation
    "Startup": "Startup"
}

def assign_cluster(row):
    for tag in row['tags']:
        cluster = TAG_CLUSTER_MAP.get(tag)
        if cluster:
            return cluster
    return "Other"

# === Load events from DB ===
def load_events_db():
    conn = get_connection()
    df = pd.read_sql('SELECT * FROM public."Event";', conn)
    conn.close()

    print(f"✅ Loaded {len(df)} events from database")
    if not df.empty:
        print(df.head(3))

    # Parse tags
    df['tags'] = df['tags'].apply(lambda x: x if isinstance(x, list) else [tag.strip() for tag in x.strip("{}").split(",")] if x else [])

    # Fill missing values
    df['end_date'] = pd.to_datetime(df['end_date'], errors='coerce')
    df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
    df['image'] = df['image'].fillna("")
    df['price'] = df['price'].fillna("Free")
    df['location'] = df['location'].fillna("")
    df['url'] = df['url'].fillna("")

    # Mark expired events
    today = datetime.today().date()
    df['is_expired'] = df['end_date'].apply(lambda d: d.date() < today if pd.notna(d) else False)

    # Assign clusters
    df['cluster'] = df.apply(assign_cluster, axis=1)

    return df

# === Load user interactions ===
def load_user_interactions_db():
    conn = get_connection()
    df = pd.read_sql('SELECT * FROM public."User_Event";', conn)
    conn.close()

    print(f"✅ Loaded {len(df)} user interactions from database")
    if not df.empty:
        print(df.head(3))

    df["event_id"] = df["event_id"].astype(int)
    return df

# === Clean recommendations ===
def clean_recommendations(recommendations):
    cleaned = []
    for rec in recommendations:
        cleaned_rec = {}
        for k, v in rec.items():
            if isinstance(v, float) and math.isnan(v):
                cleaned_rec[k] = "Free" if k == "price" else ""
            elif v is None:
                cleaned_rec[k] = ""
            else:
                cleaned_rec[k] = v
        # Ensure tags is always a list
        if 'tags' in cleaned_rec and not isinstance(cleaned_rec['tags'], list):
            cleaned_rec['tags'] = []
        cleaned.append(cleaned_rec)
    return cleaned

# === Cluster-based fallback for new users ===
def recommend_new_user(events_df, top_k=15, max_per_cluster=2):
    print("⚠️ Using new-user cluster-based fallback recommendations")
    today = datetime.today().date()

    # Prefer upcoming events first
    upcoming_events = events_df[events_df['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else False)]
    if upcoming_events.empty:
        upcoming_events = events_df

    clusters = upcoming_events['cluster'].unique()
    recommendations = []

    for cluster_id in clusters:
        cluster_events = upcoming_events[upcoming_events['cluster'] == cluster_id]
        n = min(len(cluster_events), max_per_cluster)
        if n > 0:
            recommendations.extend(cluster_events.sample(n).to_dict(orient='records'))

    random.shuffle(recommendations)

    # Fill remaining slots if needed
    if len(recommendations) < top_k:
        existing_ids = {r.get("event_id") for r in recommendations}
        remaining_events = upcoming_events[~upcoming_events['event_id'].isin(existing_ids)]
        remaining_needed = top_k - len(recommendations)
        if not remaining_events.empty:
            recommendations.extend(remaining_events.sample(min(remaining_needed, len(remaining_events))).to_dict(orient='records'))

    return clean_recommendations(recommendations[:top_k])

# === Main cluster-aware recommendation function ===
def recommend_events(user_id: int, top_k: int = 15, max_per_cluster: int = 5):
    events_df = load_events_db()
    interactions_df = load_user_interactions_db()

    # Load similarity model
    with open("models/similarity_model.json", "r") as f:
        model = json.load(f)

    event_ids = [int(eid) for eid in model["event_ids"]]
    similarity_matrix = np.array(model["similarity_matrix"])
    event_id_to_index = {eid: idx for idx, eid in enumerate(event_ids)}

    # Filter user interactions
    user_interactions = interactions_df[interactions_df["user_id"] == user_id]
    valid_types = ["view", "register", "tag_click"]
    interacted_df = user_interactions[user_interactions["interaction_type"].isin(valid_types)]

    # New-user fallback
    if len(interacted_df) < 3:
        return recommend_new_user(events_df, top_k)


    # Assign weights
    interaction_weights = {"view": 1, "tag_click": 2, "register": 5}
    interacted_df["weight"] = interacted_df["interaction_type"].map(interaction_weights)

    # Map event IDs to similarity matrix indices
    interacted_indices = [event_id_to_index[eid] for eid in interacted_df["event_id"] if eid in event_id_to_index]
    if not interacted_indices:
        return recommend_new_user(events_df, top_k)

    weights = [interacted_df.loc[interacted_df["event_id"] == eid, "weight"].iloc[0]
               for eid in interacted_df["event_id"] if eid in event_id_to_index]

    # Compute weighted similarity
    weighted_sim = np.average(similarity_matrix[interacted_indices], axis=0, weights=weights)

    # Build scores DataFrame
    scores_df = pd.DataFrame({
        "event_id": event_ids,
        "similarity_score": weighted_sim
    })
    scores_df = scores_df[~scores_df["event_id"].isin(interacted_df["event_id"])]

    # Merge with event metadata
    merged_df = scores_df.merge(events_df, on="event_id")

    # === Cluster-aware top K selection (for diversity) ===
    today = datetime.today().date()
    upcoming_events = merged_df[merged_df['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else True)]

    top_recommendations = []
    clusters = upcoming_events['cluster'].unique()

    for cluster_id in clusters:
        cluster_events = upcoming_events[upcoming_events['cluster'] == cluster_id].sort_values(by="similarity_score", ascending=False)
        n = min(len(cluster_events), max_per_cluster)
        top_recommendations.extend(cluster_events.head(n).to_dict(orient='records'))

    random.shuffle(top_recommendations)
    top_recommendations = top_recommendations[:top_k]

    return clean_recommendations(top_recommendations)
