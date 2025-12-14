import pandas as pd

df = pd.read_csv('events.csv')

# Convert start_date and end_date, invalid dates become NaT
df['start_date'] = pd.to_datetime(df['start_date'], dayfirst=True, errors='coerce')
df['end_date'] = pd.to_datetime(df['end_date'], dayfirst=True, errors='coerce')

# Format as YYYY-MM-DD, keeping NaT as empty strings
df['start_date'] = df['start_date'].dt.strftime('%Y-%m-%d')
df['end_date'] = df['end_date'].dt.strftime('%Y-%m-%d')

# Optional: replace NaT/NaN with empty string for CSV import
df['start_date'] = df['start_date'].fillna('')
df['end_date'] = df['end_date'].fillna('')

# Save cleaned CSV
df.to_csv('events_clean.csv', index=False)
