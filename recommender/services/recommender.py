import pandas as pd
import psycopg2
import json
import random
import math
import numpy as np
from datetime import datetime
from collections import defaultdict, Counter

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

def assign_cluster_from_tags(tags):
    """Return first matching cluster for a list of tags; fallback 'Other'."""
    for tag in tags:
        cluster = TAG_CLUSTER_MAP.get(tag)
        if cluster:
            return cluster
    return "Other"

def parse_tags_field(val):
    """Parse event.tags field from DB (Postgres array style or list)."""
    if isinstance(val, list):
        return val
    if pd.isna(val) or val is None:
        return []
    s = str(val).strip()
    # Common Postgres text array string like '{Ai,Blockchain}'
    if s.startswith("{") and s.endswith("}"):
        items = [t.strip() for t in s[1:-1].split(",") if t.strip()]
        return items
    # Possibly JSON list string
    try:
        parsed = json.loads(s)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except Exception:
        # last fallback: comma split
        return [t.strip() for t in s.split(",") if t.strip()]

# === Load events from DB ===
def load_events_db():
    conn = get_connection()
    df = pd.read_sql('SELECT * FROM public."Event";', conn)
    conn.close()

    print(f"✅ Loaded {len(df)} events from database")
    if not df.empty:
        print(f"Sample events: {df[['event_id', 'title']].head(3).to_dict('records')}")

    # Parse tags robustly
    df['tags'] = df['tags'].apply(parse_tags_field)

    # Fill missing values & convert dates
    df['end_date'] = pd.to_datetime(df['end_date'], errors='coerce')
    df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
    df['image'] = df['image'].fillna("")
    df['price'] = df['price'].fillna("Free")
    df['location'] = df['location'].fillna("")
    df['url'] = df['url'].fillna("")

    # Mark expired events
    today = datetime.today().date()
    df['is_expired'] = df['end_date'].apply(lambda d: d.date() < today if pd.notna(d) else False)

    # Assign clusters from tags if cluster missing
    if 'cluster' not in df.columns:
        df['cluster'] = df['tags'].apply(assign_cluster_from_tags)
    else:
        df['cluster'] = df.apply(
            lambda r: r['cluster'] if pd.notna(r.get('cluster')) and r.get('cluster') != '' else assign_cluster_from_tags(r['tags']),
            axis=1
        )

    print(f"📊 Cluster distribution: {df['cluster'].value_counts().to_dict()}")

    return df

# === Load user interactions ===
def safe_parse_meta(m):
    """Parse meta field which may be dict, JSON string, or NULL."""
    if m is None or (isinstance(m, float) and math.isnan(m)):
        return {}
    if isinstance(m, dict):
        return m
    try:
        # sometimes meta is stored as stringified JSON
        return json.loads(m)
    except Exception:
        # try evaluating simple Python-style dict string
        try:
            return eval(m)
        except Exception:
            return {}

def load_user_interactions_db():
    conn = get_connection()
    df = pd.read_sql('SELECT * FROM public."User_Event";', conn)
    conn.close()

    print(f"✅ Loaded {len(df)} user interactions from database")
    if not df.empty:
        print(f"Sample interactions: {df[['user_id', 'event_id', 'interaction_type']].head(3).to_dict('records')}")

    # ensure event_id numeric when present and not null
    def safe_int(x):
        try:
            return int(x)
        except Exception:
            return None
    if 'event_id' in df.columns:
        df["event_id"] = df["event_id"].apply(safe_int)

    # parse meta JSON if present
    if 'meta' in df.columns:
        df['meta_parsed'] = df['meta'].apply(safe_parse_meta)
    else:
        df['meta_parsed'] = [{} for _ in range(len(df))]

    # normalize interaction_type to lower-case
    if 'interaction_type' in df.columns:
        df['interaction_type'] = df['interaction_type'].astype(str).str.lower()
    else:
        df['interaction_type'] = ''

    return df

# === Build tag profile from user's tag_click interactions ===
def build_user_tag_profile(interactions_df, user_id: int, tag_click_weight: float = 2.0):
    """
    Returns Counter {tag -> weight} for the user built from tag_click meta.
    tag_click_weight is multiplier for tag_click interactions (you can adjust).
    """
    user_inter = interactions_df[interactions_df['user_id'] == user_id]
    tags_counter = Counter()

    # include tag_click meta tags
    tag_clicks = user_inter[user_inter['interaction_type'] == 'tag_click']
    for _, row in tag_clicks.iterrows():
        meta = row.get('meta_parsed', {}) or {}
        tags = meta.get('tags') or meta.get('tag') or meta.get('clicked_tags') or []
        if isinstance(tags, str):
            # single-string tag or comma-separated
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        for t in tags:
            if t:
                tags_counter[t] += tag_click_weight

    # optionally include tags from events the user registered/viewed (to enrich profile)
    # for view/register interactions, count event tags with lower weight
    view_events = user_inter[user_inter['interaction_type'].isin(['view', 'register'])]
    for _, row in view_events.iterrows():
        event_tags = row.get('meta_parsed', {}).get('tags')
        # Sometimes event_id points to an event — we could fetch the event's tags if needed.
        if isinstance(event_tags, list):
            for t in event_tags:
                tags_counter[t] += 1.0  # base weight for event-tag inferred profile

    return tags_counter

# === Tag-based scoring utility ===
def compute_tag_score_for_events(events_df: pd.DataFrame, user_tag_profile: Counter):
    """
    Compute normalized tag score per event based on overlap of event tags with user_tag_profile.
    Returns a pandas Series aligned with events_df.index.
    """
    if not user_tag_profile:
        return pd.Series(0.0, index=events_df.index)

    # Convert to dict for faster access
    user_tag_weights = dict(user_tag_profile)
    max_possible = sum(user_tag_weights.values()) or 1.0

    scores = []
    for tags in events_df['tags']:
        s = 0.0
        for t in tags:
            s += user_tag_weights.get(t, 0.0)
        # normalize by user's total weight (so tag_score in [0,1] roughly)
        scores.append(s / max_possible)
    return pd.Series(scores, index=events_df.index)

# === Clean recommendations (same as your function) ===
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

# === New-user fallback ===
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

# === Diagnostic function to check user interactions (updated to use parsed meta) ===
def diagnose_user_interactions(user_id: int):
    print(f"\n🔍 DIAGNOSING USER {user_id} INTERACTIONS")
    interactions_df = load_user_interactions_db()
    user_interactions = interactions_df[interactions_df["user_id"] == user_id]

    print(f"📋 All interactions for user {user_id}:")
    if user_interactions.empty:
        print("  (no interactions found)")
    else:
        print(user_interactions[['event_id', 'interaction_type', 'meta_parsed']].to_string())

    try:
        with open("models/similarity_model.json", "r") as f:
            model = json.load(f)

        model_event_ids = [int(eid) for eid in model["event_ids"]]
        user_event_ids = user_interactions['event_id'].dropna().astype(int).tolist()

        print(f"\n🎯 User event IDs: {user_event_ids}")
        print(f"📊 Model contains {len(model_event_ids)} events")
        overlap = set(user_event_ids) & set(model_event_ids)
        print(f"✅ Overlap between user events and model: {overlap}")
        print(f"📊 Overlap count: {len(overlap)}/{len(user_event_ids)}")

        valid_types = ["view", "register", "tag_click"]
        user_interaction_types = user_interactions['interaction_type'].unique()
        print(f"🎪 User interaction types: {user_interaction_types}")
        valid_interactions = user_interactions[user_interactions['interaction_type'].isin(valid_types)]
        print(f"📈 Valid interactions count: {len(valid_interactions)}")

        # Require at least 3 valid interactions OR at least 1 tag_click for tag-based personalization
        has_tag_click = any(user_interactions['interaction_type'] == 'tag_click')
        return (len(overlap) > 0 and len(valid_interactions) >= 3) or has_tag_click

    except Exception as e:
        print(f"❌ Error loading model: {e}")
        # If we can't load the model, allow tag-only personalization if tag_click exists
        has_tag_click = any(load_user_interactions_db()['interaction_type'] == 'tag_click')
        return has_tag_click

# === Main recommender with tag integration ===
def recommend_events(user_id: int, top_k: int = 15, max_per_cluster: int = 5,
                     similarity_weight: float = 0.75, tag_weight: float = 0.25):
    """
    similarity_weight + tag_weight should sum to 1.0 (they are combined into final_score).
    You can change these defaults to tune influence of tag clicks.
    """
    print(f"🚀 Starting recommendations for user {user_id}, top_k={top_k}, max_per_cluster={max_per_cluster}")

    # Load data
    events_df = load_events_db()
    interactions_df = load_user_interactions_db()

    # Build user's tag profile (even if no model present, tags can drive personalization)
    user_tag_profile = build_user_tag_profile(interactions_df, user_id)
    print(f"🧾 User tag profile (top 10): {user_tag_profile.most_common(10)}")

    # Diagnostics: do we have enough info for similarity-based method?
    can_proceed = diagnose_user_interactions(user_id)
    if not can_proceed:
        print(f"❌ Diagnostics indicate not enough similarity data — using tag-only or fallback")
        # If user has tag profile, use tag-based ranking; else fallback
        if user_tag_profile:
            # Compute tag score for events
            tag_scores = compute_tag_score_for_events(events_df, user_tag_profile)
            events_df = events_df.copy()
            events_df['tag_score'] = tag_scores
            events_df['final_score'] = events_df['tag_score']  # tag-only ranking
            ranked = events_df.sort_values(by='final_score', ascending=False)
            # Keep upcoming events
            today = datetime.today().date()
            upcoming = ranked[ranked['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else True)]
            recs = upcoming.head(top_k).to_dict(orient='records')
            return clean_recommendations(recs)
        else:
            return recommend_new_user(events_df, top_k)

    # Try to load similarity model
    try:
        with open("models/similarity_model.json", "r") as f:
            model = json.load(f)
        print("✅ Similarity model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load similarity model: {e}")
        # Fall back to tag-based if tags exist, else fallback clusters
        if user_tag_profile:
            tag_scores = compute_tag_score_for_events(events_df, user_tag_profile)
            events_df = events_df.copy()
            events_df['tag_score'] = tag_scores
            events_df['final_score'] = events_df['tag_score']
            ranked = events_df.sort_values(by='final_score', ascending=False)
            return clean_recommendations(ranked.head(top_k).to_dict(orient='records'))
        return recommend_new_user(events_df, top_k)

    # Prepare similarity arrays
    event_ids = [int(eid) for eid in model["event_ids"]]
    similarity_matrix = np.array(model["similarity_matrix"])
    event_id_to_index = {eid: idx for idx, eid in enumerate(event_ids)}

    # Filter user interactions for scoring
    user_interactions = interactions_df[interactions_df["user_id"] == user_id].copy()
    valid_types = ["view", "register", "tag_click"]
    interacted_df = user_interactions[user_interactions["interaction_type"].isin(valid_types)].copy()
    print(f"👤 User {user_id} has {len(interacted_df)} valid interactions (including tag_clicks)")

    # If not enough event-based interactions but tag clicks exist, we'll rely more on tags
    if len(interacted_df[interacted_df['interaction_type'] != 'tag_click']) < 1 and user_tag_profile:
        print("⚠️ No event-based interactions found; using tag-based scoring primarily")
        tag_scores = compute_tag_score_for_events(events_df, user_tag_profile)
        events_df = events_df.copy()
        events_df['tag_score'] = tag_scores
        # final score is tag_score (optionally could combine with a small similarity baseline)
        events_df['final_score'] = events_df['tag_score']
        ranked = events_df.sort_values(by='final_score', ascending=False)
        return clean_recommendations(ranked.head(top_k).to_dict(orient='records'))

    # Map interaction weights (tunable)
    interaction_weights = {"view": 1, "tag_click": 2, "register": 5}
    interacted_df["weight"] = interacted_df["interaction_type"].map(interaction_weights).fillna(1.0)

    # Build weights aggregated over model indices (only for interactions that reference event_id and are present in model)
    weight_map = defaultdict(float)
    found_in_model = []
    not_found_in_model = []
    for _, row in interacted_df.iterrows():
        eid = row.get('event_id')
        w = float(row.get('weight', 1.0))
        if eid is not None and eid in event_id_to_index:
            idx = event_id_to_index[eid]
            weight_map[idx] += w
            found_in_model.append(eid)
        else:
            not_found_in_model.append(eid)

    print(f"✅ Events found in similarity model: {found_in_model}")
    print(f"❌ Events NOT found in similarity model: {not_found_in_model}")

    interacted_indices = list(weight_map.keys())
    weights = [weight_map[idx] for idx in interacted_indices]

    if len(interacted_indices) == 0:
        print("❌ No matching interacted events in similarity model, falling back to tag-based or cluster fallback")
        if user_tag_profile:
            tag_scores = compute_tag_score_for_events(events_df, user_tag_profile)
            events_df = events_df.copy()
            events_df['tag_score'] = tag_scores
            events_df['final_score'] = events_df['tag_score']
            ranked = events_df.sort_values(by='final_score', ascending=False)
            return clean_recommendations(ranked.head(top_k).to_dict(orient='records'))
        return recommend_new_user(events_df, top_k)

    # Compute weighted similarity vector
    print("🔄 Computing weighted similarity scores...")
    weighted_sim = np.average(similarity_matrix[interacted_indices], axis=0, weights=weights)

    # Build scores DataFrame
    scores_df = pd.DataFrame({
        "event_id": event_ids,
        "similarity_score": weighted_sim
    })

    # Penalize already interacted events slightly so they can still appear but lower
    interacted_event_ids = set(interacted_df['event_id'].dropna().astype(int).tolist())
    scores_df["similarity_score"] = scores_df.apply(
        lambda row: row["similarity_score"] * 0.3 if int(row["event_id"]) in interacted_event_ids else row["similarity_score"],
        axis=1
    )

    # Merge with event metadata
    merged_df = scores_df.merge(events_df, on="event_id", how="left")
    print(f"📈 Scored events merged with metadata: {len(merged_df)}")

    # Compute tag scores for merged events using user's tag profile
    merged_df['tags'] = merged_df['tags'].apply(lambda x: x if isinstance(x, list) else parse_tags_field(x))
    tag_scores_series = compute_tag_score_for_events(merged_df, user_tag_profile)
    merged_df['tag_score'] = tag_scores_series.values

    # Combine similarity_score and tag_score into final_score (weights are parameters)
    merged_df['final_score'] = (similarity_weight * merged_df['similarity_score']) + (tag_weight * merged_df['tag_score'])

    print(f"📈 Similarity score range: {merged_df['similarity_score'].min():.4f} .. {merged_df['similarity_score'].max():.4f}")
    print(f"📈 Tag score range: {merged_df['tag_score'].min():.4f} .. {merged_df['tag_score'].max():.4f}")
    print(f"📈 Final score range: {merged_df['final_score'].min():.4f} .. {merged_df['final_score'].max():.4f}")

    # Keep upcoming events
    today = datetime.today().date()
    upcoming_events = merged_df[merged_df['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else True)]
    if upcoming_events.empty:
        upcoming_events = merged_df

    # === Cluster-aware top K selection (diversity) ===
    top_recommendations = []
    clusters = upcoming_events['cluster'].unique()
    for cluster_id in clusters:
        cluster_events = upcoming_events[upcoming_events['cluster'] == cluster_id].sort_values(
            by="final_score", ascending=False
        )
        n = min(len(cluster_events), max_per_cluster)
        if n > 0:
            top_recommendations.extend(cluster_events.head(n).to_dict(orient='records'))
            print(f"🎯 Cluster '{cluster_id}': selected {n} events (best final_score: {cluster_events['final_score'].iloc[0]:.4f})")

    # Fill remaining slots globally by final_score
    if len(top_recommendations) < top_k:
        existing_ids = {r['event_id'] for r in top_recommendations}
        remaining_events = upcoming_events[~upcoming_events['event_id'].isin(existing_ids)].sort_values(by="final_score", ascending=False)
        remaining_needed = top_k - len(top_recommendations)
        if not remaining_events.empty:
            top_recommendations.extend(remaining_events.head(remaining_needed).to_dict(orient='records'))
            print(f"📈 Added {min(remaining_needed, len(remaining_events))} highest final_score events to reach {top_k}")

    random.shuffle(top_recommendations)
    final_recommendations = clean_recommendations(top_recommendations[:top_k])

    # Ensure required fields & types
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
        'similarity_score': 0.0,
        'tag_score': 0.0,
        'final_score': 0.0,
        'cluster': 'Other'
    }

    for rec in final_recommendations:
        for field, default_value in required_fields.items():
            if field not in rec or rec[field] is None:
                rec[field] = default_value
        # safe conversions
        try:
            rec['event_id'] = int(float(rec.get('event_id', 0)))
        except Exception:
            rec['event_id'] = 0
        try:
            rec['similarity_score'] = float(rec.get('similarity_score', 0.0))
        except Exception:
            rec['similarity_score'] = 0.0
        try:
            rec['tag_score'] = float(rec.get('tag_score', 0.0))
        except Exception:
            rec['tag_score'] = 0.0
        try:
            rec['final_score'] = float(rec.get('final_score', 0.0))
        except Exception:
            rec['final_score'] = 0.0

    print(f"🎁 Final recommendations for user {user_id}: {len(final_recommendations)} events")
    print(f"📊 Final cluster distribution: {pd.DataFrame(final_recommendations)['cluster'].value_counts().to_dict()}")

    return final_recommendations

# === Utility diagnostic callable ===
def diagnose_recommendation_issue(user_id: int):
    """Run this function separately to diagnose issues"""
    print("🔍 RUNNING COMPREHENSIVE DIAGNOSTICS")
    return diagnose_user_interactions(user_id)
