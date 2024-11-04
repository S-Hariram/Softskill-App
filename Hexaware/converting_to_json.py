import csv
import json

csv_file_path = r'C:\Hexaware\word-meaning-examples.csv'
json_file_path = r'C:\Hexaware\word-meaning-examples.json'

data = []
with open(csv_file_path, newline='', encoding='utf-8') as csvfile:  # Specify UTF-8 encoding here
    reader = csv.DictReader(csvfile)
    for row in reader:
        data.append(row)

with open(json_file_path, 'w', encoding='utf-8') as jsonfile:  # Also ensure the JSON is saved with UTF-8 encoding
    json.dump(data, jsonfile, indent=4)
