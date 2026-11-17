# CLOUD READING - CART 351 Mini-Project One
# the flask side. saves what people see in the clouds and hands it back
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import json
import os
import threading

app = Flask(__name__)

# where all the readings get saved
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "guesses.json")

# 7 clouds, has to match clouds.js or stuff breaks
NUM_CLOUDS = 7

# 40 letters max, that's plenty for a cloud
MAX_LENGTH = 40

# so two people saving at the same time don't wipe each other out
file_lock = threading.Lock()


# JSON HELPERS
# the file looks like this, writing it down so I don't forget:
# { "3": [ {"text": "a dog", "time": "2026-11-14T15:02:11"} ], "5": [...] }

def load_guesses():
    # no file or it's empty, just start fresh
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        text = f.read().strip()
    if text == "":
        return {}
    return json.loads(text)


def save_guesses(guesses):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(guesses, f, indent=2, ensure_ascii=False)


# main page
@app.route("/")
def index():
    return render_template("index.html")


# FETCH POST: someone saw something, it comes in here
# looks like {"cloud": 3, "guess": "a dog"}
@app.route("/api/guess", methods=["POST"])
def add_guess():
    data = request.get_json(silent=True) or {}

    # make sure it's a real cloud (0 to 6)
    cloud = data.get("cloud")
    if not isinstance(cloud, int) or cloud < 0 or cloud >= NUM_CLOUDS:
        return jsonify({"error": "that cloud doesn't exist"}), 400

    # clean it up, no empty ones, cut it off if it's too long
    guess = " ".join(str(data.get("guess", "")).split())
    if guess == "":
        return jsonify({"error": "you have to see something"}), 400
    guess = guess[:MAX_LENGTH]

    reading = {
        "text": guess,
        "time": datetime.now().isoformat(timespec="seconds")
    }

    # add it and save. json wants the key as "3" not 3, kinda annoying but ok
    with file_lock:
        guesses = load_guesses()
        guesses.setdefault(str(cloud), []).append(reading)
        save_guesses(guesses)
        readings_for_cloud = guesses[str(cloud)]

    # send back everything people said about that cloud
    return jsonify({"cloud": cloud, "readings": readings_for_cloud})


# FETCH GET: the page wants all the readings
@app.route("/api/guesses")
def get_guesses():
    with file_lock:
        guesses = load_guesses()
    return jsonify(guesses)


#run
# only runs on my laptop, pythonanywhere starts it its own way
if __name__ == "__main__":
    app.run(debug=True)
