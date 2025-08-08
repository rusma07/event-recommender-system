import pickle
import os

# Use absolute path to avoid path issues
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "similarity_model.pkl")

with open(MODEL_PATH, 'rb') as f:
    data = pickle.load(f)

# Inspect contents
print("✅ Keys in pickle:", data.keys())
print("✅ Similarity matrix shape:", data['similarity_matrix'].shape)
print("✅ First 10 event IDs:", data['event_ids'][:10])
