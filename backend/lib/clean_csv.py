import csv
from datetime import datetime

# Open the original and cleaned CSV files
with open('events.csv', 'r', encoding='utf-8') as infile, open('events_cleaned.csv', 'w', newline='', encoding='utf-8') as outfile:
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()

    for row in reader:
        for col in ['start_date', 'end_date']:
            val = row[col].strip()

            # Clean dates that are not "To be decided" or empty
            if val.lower() != 'to be decided' and val != '':
                try:
                    # Convert format like "Thu Aug 08 2025" to "2025-08-08"
                    parsed_date = datetime.strptime(val, "%a %b %d %Y")
                    row[col] = parsed_date.strftime("%Y-%m-%d")
                except ValueError:
                    row[col] = ''  # fallback for invalid formats
            else:
                row[col] = ''  # blank out undecided/empty

        writer.writerow(row)

print("✅ Cleaned CSV saved to 'events_cleaned.csv'")
