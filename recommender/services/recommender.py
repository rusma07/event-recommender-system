import pandas as pd
import psycopg2
import json
import random
import math
import numpy as np
from datetime import datetime
from collections import defaultdict

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
    "Ai": "Tech", "Blockchain": "Tech", "Cybersecurity": "Tech", "Data Analysis": "Tech",
    "Devops": "Tech", "Mobile Development": "Tech", "Networking": "Tech",
    "Robotics": "Tech", "Tech": "Tech", "Web": "Tech",
    "Education": "Education", "Engineering": "Education", "Business": "Education",
    "Marketing": "Education", "Pitching": "Education",
    "Community": "Community", "Culture": "Community", "Global": "Community",
    "Local": "Community", "Literature": "Community",
    "Health": "Health", "Sustainability": "Health", "Environment": "Health",
    "Physical": "Health",
    "Art": "Arts", "Graphic Design": "Arts", "Entertainment": "Arts",
    "Badminton": "Sports", "Chess": "Sports", "Football": "Sports",
    "Gaming": "Sports", "Hybrid": "Sports",
    "Online": "Online", "Free": "Online",
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
        print(f"Sample events: {df[['event_id', 'title']].head(3).to_dict('records')}")

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
    
    print(f"📊 Cluster distribution: {df['cluster'].value_counts().to_dict()}")

    return df

# === Load user interactions ===
def load_user_interactions_db():
    conn = get_connection()
    df = pd.read_sql('SELECT * FROM public."User_Event";', conn)
    conn.close()

    print(f"✅ Loaded {len(df)} user interactions from database")
    if not df.empty:
        print(f"Sample interactions: {df[['user_id', 'event_id', 'interaction_type']].head(3).to_dict('records')}")

    df["event_id"] = df["event_id"].astype(int)
    return df


def clean_recommendations(recommendations):
    cleaned = []
    for rec in recommendations:
        cleaned_rec = {}
        for k, v in rec.items():
            if isinstance(v, float) and math.isnan(v):
                cleaned_rec[k] = "Free" if k == "price" else ""
            elif v is None:
                cleaned_rec[k] = ""
            elif isinstance(v, (pd.Timestamp, datetime)):
                cleaned_rec[k] = v.strftime('%Y-%m-%d') if pd.notna(v) else None
            else:
                cleaned_rec[k] = v
        if 'tags' in cleaned_rec and not isinstance(cleaned_rec['tags'], list):
            cleaned_rec['tags'] = []
        cleaned.append(cleaned_rec)
    return cleaned
def recommend_new_user(events_df, top_k=15, max_per_cluster=2):
    print("⚠️ Using new-user cluster-based fallback recommendations")
    today = datetime.today().date()
    upcoming_events = events_df[events_df['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else False)]
    if upcoming_events.empty:
        upcoming_events = events_df
        print("ℹ️ No upcoming events found, using all events for fallback")

    clusters = upcoming_events['cluster'].unique()
    recommendations = []

    for cluster_id in clusters:
        cluster_events = upcoming_events[upcoming_events['cluster'] == cluster_id]
        n = min(len(cluster_events), max_per_cluster)
        if n > 0:
            sampled_events = cluster_events.sample(n).to_dict(orient='records')
            recommendations.extend(sampled_events)
            print(f"🎯 Cluster '{cluster_id}': selected {n} events")

    random.shuffle(recommendations)

    if len(recommendations) < top_k:
        existing_ids = {r.get("event_id") for r in recommendations}
        remaining_events = upcoming_events[~upcoming_events['event_id'].isin(existing_ids)]
        remaining_needed = top_k - len(recommendations)
        if not remaining_events.empty:
            additional_events = remaining_events.sample(min(remaining_needed, len(remaining_events))).to_dict(orient='records')
            recommendations.extend(additional_events)
            print(f"📈 Added {len(additional_events)} additional events to reach {top_k}")

    final_recommendations = clean_recommendations(recommendations[:top_k])
    print(f"🎁 Final fallback recommendations: {len(final_recommendations)} events")
    return final_recommendations

# === Diagnostic function to check user interactions ===
def diagnose_user_interactions(user_id: int):
    print(f"\n🔍 DIAGNOSING USER {user_id} INTERACTIONS")
    
    interactions_df = load_user_interactions_db()
    user_interactions = interactions_df[interactions_df["user_id"] == user_id]
    
    print(f"📋 All interactions for user {user_id}:")
    print(user_interactions[['event_id', 'interaction_type']].to_string())
    
    # Load similarity model to check overlap
    try:
        with open("models/similarity_model.json", "r") as f:
            model = json.load(f)
        
        model_event_ids = [int(eid) for eid in model["event_ids"]]
        user_event_ids = user_interactions['event_id'].tolist()
        
        print(f"\n🎯 User event IDs: {user_event_ids}")
        print(f"📊 Model contains {len(model_event_ids)} events")
        print(f"📋 Model event IDs sample: {model_event_ids[:10]}...")
        
        # Check overlap
        overlap = set(user_event_ids) & set(model_event_ids)
        print(f"✅ Overlap between user events and model: {overlap}")
        print(f"📊 Overlap count: {len(overlap)}/{len(user_event_ids)}")
        
        # Check interaction types
        valid_types = ["view", "register", "tag_click"]
        user_interaction_types = user_interactions['interaction_type'].unique()
        print(f"🎪 User interaction types: {user_interaction_types}")
        print(f"✅ Valid interaction types: {valid_types}")
        
        valid_interactions = user_interactions[user_interactions['interaction_type'].isin(valid_types)]
        print(f"📈 Valid interactions count: {len(valid_interactions)}")
        
        return len(overlap) > 0 and len(valid_interactions) >= 3
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False

# === Main cluster-aware recommendation function ===
def recommend_events(user_id: int, top_k: int = 15, max_per_cluster: int = 5):
    print(f"🚀 Starting recommendations for user {user_id}, top_k={top_k}, max_per_cluster={max_per_cluster}")
    
    # Run diagnostics first
    can_proceed = diagnose_user_interactions(user_id)
    if not can_proceed:
        print(f"❌ Diagnostics failed for user {user_id}, using fallback")
        events_df = load_events_db()
        return recommend_new_user(events_df, top_k)
    
    events_df = load_events_db()
    interactions_df = load_user_interactions_db()

    # Load similarity model
    try:
        with open("models/similarity_model.json", "r") as f:
            model = json.load(f)
        print("✅ Similarity model loaded successfully")
        print(f"📊 Similarity model contains {len(model['event_ids'])} events")
    except Exception as e:
        print(f"❌ Failed to load similarity model: {e}")
        return recommend_new_user(events_df, top_k)

    event_ids = [int(eid) for eid in model["event_ids"]]
    similarity_matrix = np.array(model["similarity_matrix"])
    event_id_to_index = {eid: idx for idx, eid in enumerate(event_ids)}

    # Filter user interactions with detailed debugging
    user_interactions = interactions_df[interactions_df["user_id"] == user_id].copy()
    print(f"👤 User {user_id} has {len(user_interactions)} total interactions")
    
    # Debug: Print all interaction types found
    print(f"🔍 All interaction types for user: {user_interactions['interaction_type'].unique()}")
    
    valid_types = ["view", "register", "tag_click"]
    interacted_df = user_interactions[user_interactions["interaction_type"].str.lower().isin(valid_types)].copy()
    
    print(f"📊 Valid interactions: {len(interacted_df)} (types: {interacted_df['interaction_type'].value_counts().to_dict()})")
    
    # Debug: Print the actual event IDs the user interacted with
    if not interacted_df.empty:
        print(f"🎯 User interacted with event IDs: {interacted_df['event_id'].tolist()}")

    # New-user fallback - check if user has enough interactions
    if len(interacted_df) < 3:
        print(f"⚠️ User has only {len(interacted_df)} valid interactions, using new-user fallback")
        return recommend_new_user(events_df, top_k)

    # Assign weights
    interaction_weights = {"view": 1, "tag_click": 2, "register": 5}
    interacted_df["weight"] = interacted_df["interaction_type"].str.lower().map(interaction_weights)

    # Map event IDs to similarity matrix indices and aggregate weights WITH DEBUGGING
    weight_map = defaultdict(float)
    found_in_model = []
    not_found_in_model = []
    
    for eid, w in zip(interacted_df["event_id"], interacted_df["weight"]):
        if eid in event_id_to_index:
            idx = event_id_to_index[eid]
            weight_map[idx] += float(w)
            found_in_model.append(eid)
        else:
            not_found_in_model.append(eid)

    print(f"✅ Events found in similarity model: {found_in_model}")
    print(f"❌ Events NOT found in similarity model: {not_found_in_model}")
    print(f"📊 Model coverage: {len(found_in_model)}/{len(interacted_df)} events found in model")

    interacted_indices = list(weight_map.keys())
    weights = [weight_map[idx] for idx in interacted_indices]

    print(f"🔢 Using {len(interacted_indices)} events for similarity calculation with weights: {weights}")

    if not interacted_indices:
        print("❌ No valid events found in similarity model, using fallback")
        return recommend_new_user(events_df, top_k)

    # Compute weighted similarity
    print("🔄 Computing weighted similarity scores...")
    weighted_sim = np.average(similarity_matrix[interacted_indices], axis=0, weights=weights)
    
    # Debug similarity scores
    print(f"📈 Similarity score range: {weighted_sim.min():.3f} to {weighted_sim.max():.3f}")
    print(f"📊 Top 5 similarity scores: {np.sort(weighted_sim)[-5:][::-1]}")

    # Build scores DataFrame
    scores_df = pd.DataFrame({
        "event_id": event_ids,
        "similarity_score": weighted_sim
    })
    
    # Penalize already interacted events instead of removing them completely
    interacted_event_ids = set(interacted_df["event_id"])
    scores_df["similarity_score"] = scores_df.apply(
        lambda row: row["similarity_score"] * 0.3 if row["event_id"] in interacted_event_ids else row["similarity_score"],
        axis=1
    )

    # Merge with event metadata - include ALL event fields
    merged_df = scores_df.merge(events_df, on="event_id")
    print(f"📈 Scored events: {len(merged_df)}")
    
    # Debug: Show top scored events before clustering
    print("🏆 Top 10 scored events before clustering:")
    top_scored = merged_df.nlargest(10, 'similarity_score')[['event_id', 'title', 'cluster', 'similarity_score']]
    print(top_scored.to_string())

    # === Cluster-aware top K selection (for diversity) ===
    today = datetime.today().date()
    upcoming_events = merged_df[merged_df['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else True)]
    
    if upcoming_events.empty:
        print("ℹ️ No upcoming events found after scoring, using all scored events")
        upcoming_events = merged_df

    print(f"📅 Upcoming events for recommendation: {len(upcoming_events)}")
    print(f"🏷️ Available clusters: {upcoming_events['cluster'].value_counts().to_dict()}")

    top_recommendations = []
    clusters = upcoming_events['cluster'].unique()

    for cluster_id in clusters:
        cluster_events = upcoming_events[upcoming_events['cluster'] == cluster_id].sort_values(
            by="similarity_score", ascending=False
        )
        n = min(len(cluster_events), max_per_cluster)
        if n > 0:
            cluster_recs = cluster_events.head(n).to_dict(orient='records')
            top_recommendations.extend(cluster_recs)
            print(f"🎯 Cluster '{cluster_id}': selected {n} events (best score: {cluster_events['similarity_score'].iloc[0]:.3f})")

    # If we don't have enough recommendations, fill with highest scored events across all clusters
    if len(top_recommendations) < top_k:
        print(f"⚠️ Only {len(top_recommendations)} events selected from clusters, filling remaining slots")
        existing_ids = {r['event_id'] for r in top_recommendations}
        remaining_events = upcoming_events[~upcoming_events['event_id'].isin(existing_ids)].sort_values(
            by="similarity_score", ascending=False
        )
        remaining_needed = top_k - len(top_recommendations)
        if not remaining_events.empty:
            additional_events = remaining_events.head(remaining_needed).to_dict(orient='records')
            top_recommendations.extend(additional_events)
            print(f"📈 Added {len(additional_events)} highest-scored events")

    random.shuffle(top_recommendations)
    final_recommendations = clean_recommendations(top_recommendations[:top_k])
    
    # === ENSURE ALL REQUIRED FIELDS ARE PRESENT ===
    required_fields = {
        'event_id': 0,
        'title': 'Unknown Event',
        'image': '',
        'start_date': None,
        'end_date': None,
        'location': '',
        'tags': [],
        'price': 'Free',
        'url': '',
        'similarity_score': 0.0
    }
    
    for rec in final_recommendations:
        # Ensure all required fields are present
        for field, default_value in required_fields.items():
            if field not in rec or rec[field] is None:
                rec[field] = default_value
        
        # Convert event_id to int safely
        event_id = rec.get('event_id')
        if event_id is not None:
            try:
                rec['event_id'] = int(float(event_id))
            except (ValueError, TypeError):
                rec['event_id'] = 0
        
        # Convert similarity_score to float safely
        similarity_score = rec.get('similarity_score')
        if similarity_score is not None:
            try:
                rec['similarity_score'] = float(similarity_score)
            except (ValueError, TypeError):
                rec['similarity_score'] = 0.0
        
        # Ensure dates are properly formatted (convert to string if needed)
        for date_field in ['start_date', 'end_date']:
            if rec.get(date_field) and isinstance(rec[date_field], (pd.Timestamp, datetime)):
                rec[date_field] = rec[date_field].strftime('%Y-%m-%d') if pd.notna(rec[date_field]) else None

    print(f"🎁 Final recommendations for user {user_id}: {len(final_recommendations)} events")
    print(f"📊 Final cluster distribution: {pd.DataFrame(final_recommendations)['cluster'].value_counts().to_dict()}")
    
    # Debug: Check first recommendation structure
    if final_recommendations:
        print("🔍 First recommendation structure:")
        first_rec = final_recommendations[0]
        for key, value in first_rec.items():
            print(f"  {key}: {value} (type: {type(value).__name__})")
    
    return final_recommendations
# === Standalone diagnostic function ===
def diagnose_recommendation_issue(user_id: int):
    """Run this function separately to diagnose issues"""
    print("🔍 RUNNING COMPREHENSIVE DIAGNOSTICS")
    return diagnose_user_interactions(user_id)