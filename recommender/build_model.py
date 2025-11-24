import pandas as pd
import psycopg2
import json
import random
import math
import numpy as np
from datetime import datetime
from collections import defaultdict, Counter

# =========================
#  CONFIG & CONSTANTS
# =========================

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


# =========================
#  LOW-LEVEL HELPERS
# =========================

def safe_parse_meta(m):
    """Parse meta field which may be dict, JSON string, or NULL."""
    if m is None or (isinstance(m, float) and math.isnan(m)):
        return {}
    if isinstance(m, dict):
        return m
    try:
        return json.loads(m)
    except Exception:
        try:
            return eval(m)
        except Exception:
            return {}


def parse_tags_field(val):
    """Parse event.tags field from DB (Postgres array style or list)."""
    if isinstance(val, list):
        return val
    if pd.isna(val) or val is None:
        return []
    s = str(val).strip()
    # Postgres text array string like '{Ai,Blockchain}'
    if s.startswith("{") and s.endswith("}"):
        items = [t.strip() for t in s[1:-1].split(",") if t.strip()]
        return items
    # Maybe JSON array
    try:
        parsed = json.loads(s)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except Exception:
        # last fallback: comma split
        return [t.strip() for t in s.split(",") if t.strip()]


def assign_cluster_from_tags(tags):
    """Return first matching cluster for a list of tags; fallback 'Other'."""
    for tag in tags:
        cluster = TAG_CLUSTER_MAP.get(tag)
        if cluster:
            return cluster
    return "Other"


def compute_tag_score_for_events(events_df: pd.DataFrame, user_tag_profile: Counter):
    """
    Compute normalized tag score per event based on overlap of event tags with user_tag_profile.
    Returns a pandas Series aligned with events_df.index.
    """
    if not user_tag_profile:
        return pd.Series(0.0, index=events_df.index)

    user_tag_weights = dict(user_tag_profile)
    max_possible = sum(user_tag_weights.values()) or 1.0

    scores = []
    for tags in events_df['tags']:
        s = 0.0
        for t in tags:
            s += user_tag_weights.get(t, 0.0)
        scores.append(s / max_possible)
    return pd.Series(scores, index=events_df.index)


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


# =========================
#  DATABASE CONFIG & REPOS
# =========================

class DatabaseConfig:
    def __init__(self, host="localhost", database="eventdb", user="postgres", password="postgres"):
        self.host = host
        self.database = database
        self.user = user
        self.password = password

    def get_connection(self):
        return psycopg2.connect(
            host=self.host,
            database=self.database,
            user=self.user,
            password=self.password
        )


class EventRepository:
    def __init__(self, db_config: DatabaseConfig):
        self.db_config = db_config

    def load_events(self) -> pd.DataFrame:
        conn = self.db_config.get_connection()
        df = pd.read_sql('SELECT * FROM public."Event";', conn)
        conn.close()

        print(f"✅ Loaded {len(df)} events from database")

        # Parse tags
        df['tags'] = df['tags'].apply(parse_tags_field)

        # Fill and convert columns
        df['end_date'] = pd.to_datetime(df['end_date'], errors='coerce')
        df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
        df['image'] = df['image'].fillna("")
        df['price'] = df['price'].fillna("Free")
        df['location'] = df['location'].fillna("")
        df['url'] = df['url'].fillna("")

        # Mark expired
        today = datetime.today().date()
        df['is_expired'] = df['end_date'].apply(lambda d: d.date() < today if pd.notna(d) else False)

        # Cluster
        if 'cluster' not in df.columns:
            df['cluster'] = df['tags'].apply(assign_cluster_from_tags)
        else:
            df['cluster'] = df.apply(
                lambda r: r['cluster'] if pd.notna(r.get('cluster')) and r.get('cluster') != '' else assign_cluster_from_tags(r['tags']),
                axis=1
            )

        print(f"📊 Cluster distribution: {df['cluster'].value_counts().to_dict()}")
        return df


class UserInteractionRepository:
    def __init__(self, db_config: DatabaseConfig):
        self.db_config = db_config

    def _safe_int(self, x):
        try:
            return int(x)
        except Exception:
            return None

    def load_all(self) -> pd.DataFrame:
        conn = self.db_config.get_connection()
        df = pd.read_sql('SELECT * FROM public."User_Event";', conn)
        conn.close()

        print(f"✅ Loaded {len(df)} user interactions from database")

        # event_id to int
        if 'event_id' in df.columns:
            df["event_id"] = df["event_id"].apply(self._safe_int)

        # parse meta
        if 'meta' in df.columns:
            df['meta_parsed'] = df['meta'].apply(safe_parse_meta)
        else:
            df['meta_parsed'] = [{} for _ in range(len(df))]

        # normalize interaction_type
        if 'interaction_type' in df.columns:
            df['interaction_type'] = df['interaction_type'].astype(str).str.lower()
        else:
            df['interaction_type'] = ''

        return df

    def load_for_user(self, user_id: int) -> pd.DataFrame:
        all_df = self.load_all()
        return all_df[all_df["user_id"] == user_id]


# =========================
#  USER PROFILE & MODEL
# =========================

class UserProfiler:
    def __init__(self, tag_click_weight: float = 2.0):
        self.tag_click_weight = tag_click_weight

    def build_tag_profile(self, interactions_df: pd.DataFrame, user_id: int) -> Counter:
        user_inter = interactions_df[interactions_df['user_id'] == user_id]
        tags_counter = Counter()

        tag_clicks = user_inter[user_inter['interaction_type'] == 'tag_click']
        for _, row in tag_clicks.iterrows():
            meta = row.get('meta_parsed', {}) or {}
            tags = meta.get('tags') or meta.get('tag') or meta.get('clicked_tags') or []
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",") if t.strip()]
            for t in tags:
                if t:
                    tags_counter[t] += self.tag_click_weight

        view_events = user_inter[user_inter['interaction_type'].isin(['view', 'register'])]
        for _, row in view_events.iterrows():
            event_tags = row.get('meta_parsed', {}).get('tags')
            if isinstance(event_tags, list):
                for t in event_tags:
                    tags_counter[t] += 1.0

        return tags_counter


class SimilarityModel:
    def __init__(self, model_path: str = "models/similarity_model.json"):
        self.model_path = model_path
        self.event_ids = None
        self.similarity_matrix = None
        self.event_id_to_index = None
        self.loaded = False

    def load(self):
        try:
            with open(self.model_path, "r") as f:
                model = json.load(f)
            self.event_ids = [int(eid) for eid in model["event_ids"]]
            self.similarity_matrix = np.array(model["similarity_matrix"])
            self.event_id_to_index = {eid: idx for idx, eid in enumerate(self.event_ids)}
            self.loaded = True
            print("✅ Similarity model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load similarity model: {e}")
            self.loaded = False

    def is_loaded(self) -> bool:
        return self.loaded


# =========================
#  RECOMMENDATION ENGINE
# =========================

class RecommendationEngine:
    def __init__(
        self,
        db_config: DatabaseConfig,
        similarity_model_path: str = "models/similarity_model.json",
        similarity_weight: float = 0.75,
        tag_weight: float = 0.25
    ):
        self.db_config = db_config
        self.event_repo = EventRepository(db_config)
        self.inter_repo = UserInteractionRepository(db_config)
        self.profiler = UserProfiler()
        self.model = SimilarityModel(similarity_model_path)
        self.similarity_weight = similarity_weight
        self.tag_weight = tag_weight

    # ----- Public API -----

    def recommend_events(self, user_id: int, top_k: int = 15, max_per_cluster: int = 5):
        print(f"🚀 Starting recommendations for user {user_id}, top_k={top_k}, max_per_cluster={max_per_cluster}")

        events_df = self.event_repo.load_events()
        interactions_df = self.inter_repo.load_all()

        user_tag_profile = self.profiler.build_tag_profile(interactions_df, user_id)
        print(f"🧾 User tag profile (top 10): {user_tag_profile.most_common(10)}")

        can_proceed = self._diagnose_user_interactions(user_id, interactions_df)
        if not can_proceed:
            print("❌ Not enough interaction data for similarity model")
            if user_tag_profile:
                return self._tag_only_recommendations(events_df, user_tag_profile, top_k)
            return self._recommend_new_user(events_df, top_k, max_per_cluster)

        # Load similarity model
        self.model.load()
        if not self.model.is_loaded():
            if user_tag_profile:
                return self._tag_only_recommendations(events_df, user_tag_profile, top_k)
            return self._recommend_new_user(events_df, top_k, max_per_cluster)

        # Use hybrid similarity + tag scoring
        return self._hybrid_recommendations(
            user_id=user_id,
            events_df=events_df,
            interactions_df=interactions_df,
            user_tag_profile=user_tag_profile,
            top_k=top_k,
            max_per_cluster=max_per_cluster
        )

    # ----- Internal helpers -----

    def _diagnose_user_interactions(self, user_id: int, interactions_df: pd.DataFrame) -> bool:
        print(f"\n🔍 DIAGNOSING USER {user_id} INTERACTIONS (OOP)")
        user_interactions = interactions_df[interactions_df["user_id"] == user_id]

        print(f"📋 All interactions for user {user_id}:")
        if user_interactions.empty:
            print("  (no interactions found)")
        else:
            print(user_interactions[['event_id', 'interaction_type', 'meta_parsed']].to_string())

        try:
            # Try to see overlap with model if possible
            with open(self.model.model_path, "r") as f:
                model = json.load(f)

            model_event_ids = [int(eid) for eid in model["event_ids"]]
            user_event_ids = user_interactions['event_id'].dropna().astype(int).tolist()

            overlap = set(user_event_ids) & set(model_event_ids)
            print(f"✅ Overlap between user events and model: {overlap}")

            valid_types = ["view", "register", "tag_click"]
            valid_interactions = user_interactions[user_interactions['interaction_type'].isin(valid_types)]
            has_tag_click = any(user_interactions['interaction_type'] == 'tag_click')

            return (len(overlap) > 0 and len(valid_interactions) >= 3) or has_tag_click

        except Exception as e:
            print(f"❌ Error loading model in diagnostics: {e}")
            has_tag_click = any(user_interactions['interaction_type'] == 'tag_click')
            return has_tag_click

    def _tag_only_recommendations(self, events_df: pd.DataFrame, user_tag_profile: Counter, top_k: int):
        print("⚠️ Using tag-only ranking")
        tag_scores = compute_tag_score_for_events(events_df, user_tag_profile)
        events_df = events_df.copy()
        events_df['tag_score'] = tag_scores
        events_df['final_score'] = events_df['tag_score']

        today = datetime.today().date()
        ranked = events_df.sort_values(by='final_score', ascending=False)
        upcoming = ranked[ranked['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else True)]
        recs = upcoming.head(top_k).to_dict(orient='records')
        return self._finalize_recommendations(recs)

    def _recommend_new_user(self, events_df: pd.DataFrame, top_k=15, max_per_cluster=2):
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
                sampled = cluster_events.sample(n).to_dict(orient='records')
                recommendations.extend(sampled)
                print(f"🎯 Cluster '{cluster_id}': selected {n} events")

        random.shuffle(recommendations)

        if len(recommendations) < top_k:
            existing_ids = {r.get("event_id") for r in recommendations}
            remaining_events = upcoming_events[~upcoming_events['event_id'].isin(existing_ids)]
            remaining_needed = top_k - len(recommendations)
            if not remaining_events.empty:
                additional_events = remaining_events.sample(min(remaining_needed, len(remaining_events))).to_dict(orient='records')
                recommendations.extend(additional_events)
                print(f"📈 Added {len(additional_events)} events to reach {top_k}")

        return self._finalize_recommendations(recommendations[:top_k])

    def _hybrid_recommendations(
        self,
        user_id: int,
        events_df: pd.DataFrame,
        interactions_df: pd.DataFrame,
        user_tag_profile: Counter,
        top_k: int,
        max_per_cluster: int
    ):
        print("🔄 Computing hybrid (similarity + tag) recommendations")

        event_ids = self.model.event_ids
        similarity_matrix = self.model.similarity_matrix
        event_id_to_index = self.model.event_id_to_index

        user_interactions = interactions_df[interactions_df["user_id"] == user_id].copy()
        valid_types = ["view", "register", "tag_click"]
        interacted_df = user_interactions[user_interactions["interaction_type"].isin(valid_types)].copy()

        interaction_weights = {"view": 1, "tag_click": 2, "register": 5}
        interacted_df["weight"] = interacted_df["interaction_type"].map(interaction_weights).fillna(1.0)

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
            print("❌ No matching interacted events in similarity model, falling back to tag/new-user")
            if user_tag_profile:
                return self._tag_only_recommendations(events_df, user_tag_profile, top_k)
            return self._recommend_new_user(events_df, top_k, max_per_cluster)

        weighted_sim = np.average(similarity_matrix[interacted_indices], axis=0, weights=weights)

        scores_df = pd.DataFrame({
            "event_id": event_ids,
            "similarity_score": weighted_sim
        })

        interacted_event_ids = set(interacted_df['event_id'].dropna().astype(int).tolist())
        scores_df["similarity_score"] = scores_df.apply(
            lambda row: row["similarity_score"] * 0.3 if int(row["event_id"]) in interacted_event_ids else row["similarity_score"],
            axis=1
        )

        merged_df = scores_df.merge(events_df, on="event_id", how="left")
        merged_df['tags'] = merged_df['tags'].apply(lambda x: x if isinstance(x, list) else parse_tags_field(x))

        tag_scores_series = compute_tag_score_for_events(merged_df, user_tag_profile)
        merged_df['tag_score'] = tag_scores_series.values

        merged_df['final_score'] = (
            self.similarity_weight * merged_df['similarity_score'] +
            self.tag_weight * merged_df['tag_score']
        )

        today = datetime.today().date()
        upcoming_events = merged_df[merged_df['end_date'].apply(lambda d: d.date() >= today if pd.notna(d) else True)]
        if upcoming_events.empty:
            upcoming_events = merged_df

        top_recommendations = []
        clusters = upcoming_events['cluster'].unique()
        for cluster_id in clusters:
            cluster_events = upcoming_events[upcoming_events['cluster'] == cluster_id].sort_values(
                by="final_score", ascending=False
            )
            n = min(len(cluster_events), max_per_cluster)
            if n > 0:
                top_recommendations.extend(cluster_events.head(n).to_dict(orient='records'))

        if len(top_recommendations) < top_k:
            existing_ids = {r['event_id'] for r in top_recommendations}
            remaining_events = upcoming_events[~upcoming_events['event_id'].isin(existing_ids)].sort_values(
                by="final_score", ascending=False
            )
            remaining_needed = top_k - len(top_recommendations)
            if not remaining_events.empty:
                top_recommendations.extend(remaining_events.head(remaining_needed).to_dict(orient='records'))

        random.shuffle(top_recommendations)
        return self._finalize_recommendations(top_recommendations[:top_k])

    def _finalize_recommendations(self, recs_raw):
        recs = clean_recommendations(recs_raw)

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

        for rec in recs:
            for field, default_value in required_fields.items():
                if field not in rec or rec[field] is None:
                    rec[field] = default_value
            try:
                rec['event_id'] = int(float(rec.get('event_id', 0)))
            except Exception:
                rec['event_id'] = 0
            for field in ['similarity_score', 'tag_score', 'final_score']:
                try:
                    rec[field] = float(rec.get(field, 0.0))
                except Exception:
                    rec[field] = 0.0

        print(f"🎁 Final recommendations returned: {len(recs)} events")
        return recs
