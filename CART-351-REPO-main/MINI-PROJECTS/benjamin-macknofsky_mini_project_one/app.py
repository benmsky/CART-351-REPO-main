#*************************************************
# CLOUD READING - CART 351 Mini-Project One
# people click a cloud and say what they see in it
# every reading gets saved in data/guesses.json
#*************************************************
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import json
import os
import threading

app = Flask(__name__)

# the json file where all the readings go
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "guesses.json")

# how many clouds there are (has to match NUM_CLOUDS in clouds.js)
NUM_CLOUDS = 9

# longest a reading can be
MAX_LENGTH = 40

# makes sure only one person saves at a time,
# so two people saving at once don't erase each other
file_lock = threading.Lock()


#*************************************************
# JSON HELPERS
# the file looks like this (cloud number -> list of readings):
# { "3": [ {"text": "a dog", "time": "2026-11-14T15:02:11"} ], "5": [...] }

def load_guesses():
    # no file or empty file -> start with nothing
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


#*************************************************
# the default route (the sky page)
@app.route("/")
def index():
    return render_template("index.html")


#*************************************************
# FETCH POST: the page sends a reading here
# it looks like {"cloud": 3, "guess": "a dog"}
@app.route("/api/guess", methods=["POST"])
def add_guess():
    data = request.get_json(silent=True) or {}

    # check the cloud number is real (0 to 8)
    cloud = data.get("cloud")
    if not isinstance(cloud, int) or cloud < 0 or cloud >= NUM_CLOUDS:
        return jsonify({"error": "that cloud doesn't exist"}), 400

    # clean up extra spaces, can't be empty, cut it off if it's too long
    guess = " ".join(str(data.get("guess", "")).split())
    if guess == "":
        return jsonify({"error": "you have to see something"}), 400
    guess = guess[:MAX_LENGTH]

    reading = {
        "text": guess,
        "time": datetime.now().isoformat(timespec="seconds")
    }

    # open the file, add the reading, save it
    # (json keys have to be strings, so cloud 3 is saved as "3")
    with file_lock:
        guesses = load_guesses()
        guesses.setdefault(str(cloud), []).append(reading)
        save_guesses(guesses)
        readings_for_cloud = guesses[str(cloud)]

    # send back all the readings for that cloud
    return jsonify({"cloud": cloud, "readings": readings_for_cloud})


#*************************************************
# FETCH GET: the page asks for everyone's readings here
# sends back the whole json file
@app.route("/api/guesses")
def get_guesses():
    with file_lock:
        guesses = load_guesses()
    return jsonify(guesses)


#*************************************************
#run
app.run(debug=True)
