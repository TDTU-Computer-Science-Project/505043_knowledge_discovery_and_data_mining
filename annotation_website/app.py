import json
import os
from flask import Flask, render_template, request, jsonify # type: ignore
from collections import Counter, defaultdict

app = Flask(__name__)

INPUT_DATA = 'dataset.jsonl'
OUTPUT_DATA = "reannotated_dataset.jsonl"

ASPECTS = [
    "SCREEN", "CAMERA", "BATTERY_CHARGER", "PERFORMANCE", "SOFTWARE",
    "STORAGE", "DESIGN_BUILD", "AUDIO", "CONNECTIVITY", "SECURITY", "PRICE", "GENERAL", "SER&ACC"
]
SENTIMENTS = ["POSITIVE", "NEGATIVE", "NEUTRAL"]

def load_data():
    data = []
    if os.path.exists(OUTPUT_DATA):
            file_to_read = OUTPUT_DATA
            source_type = 'output'
    else:
        file_to_read = INPUT_DATA
        source_type = 'input'

    if not os.path.exists(file_to_read):
        return []

    with open(file_to_read, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            line = line.strip()
            if line:
                try:
                    item = json.loads(line)

                    if source_type == 'input' and 'id' not in item:
                        item['id'] = idx

                    if 'id' not in item:
                        item['id'] = idx

                    data.append(item)
                except json.JSONDecodeError:
                    continue
    return data

def save_data(data):
    with open(OUTPUT_DATA, 'w', encoding='utf-8') as f:
        for item in data:
            line = json.dumps(item, ensure_ascii=False)
            f.write(line + '\n')
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/config')
def get_config():
    return jsonify({"aspects": ASPECTS, "sentiments": SENTIMENTS})

@app.route('/api/data', methods=['GET'])
def get_dataset():
    data = load_data()
    return jsonify(data)

@app.route('/api/update', methods=['POST'])
def update_item():
    req_data = request.json
    item_id = req_data.get('id')
    new_text = req_data.get('text')
    new_labels = req_data.get('labels')

    all_data = load_data()
    found = False
    for item in all_data:
        if int(item.get('id')) == int(item_id):
            item['text'] = new_text
            item['labels'] = new_labels
            found = True
            break

    if found:
        save_data(all_data)
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "error", "message": "ID not found"}), 404

@app.route('/api/annotated-count')
def get_annotated_count():
    if not os.path.exists(OUTPUT_DATA):
        return jsonify({"count": 0})
    count = 0
    with open(OUTPUT_DATA, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    item = json.loads(line)
                    if item.get('labels') and len(item['labels']) > 0:
                        count += 1
                except json.JSONDecodeError:
                    continue
    return jsonify({"count": count})

@app.route('/api/reset-all', methods=['POST'])
def reset_all_labels():
    all_data = load_data()

    for item in all_data:
        item['labels'] = []

    save_data(all_data)
    return jsonify({"status": "success", "message": "All labels cleared"})

@app.route('/api/stats')
def get_stats():
    data = load_data()

    stats = {
        "total_sentences": len(data),
        "annotated_count": 0,
        "aspect_counts": defaultdict(int),
        "sentiment_counts": defaultdict(int),
        "breakdown": defaultdict(lambda: {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0})
    }

    for item in data:
        labels = item.get('labels', [])
        if labels:
            stats["annotated_count"] += 1
            for _, _, tag in labels:
                if '#' in tag:
                    aspect, sentiment = tag.split('#')
                    stats["aspect_counts"][aspect] += 1
                    stats["sentiment_counts"][sentiment] += 1
                    stats["breakdown"][aspect][sentiment] += 1

    return jsonify(stats)

if __name__ == '__main__':
    if not os.path.exists(INPUT_DATA) and not os.path.exists(OUTPUT_DATA):
        print(f"Cảnh báo: Không tìm thấy file {INPUT_DATA}")

    app.run(debug=True, port=5000)