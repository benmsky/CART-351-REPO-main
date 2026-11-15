#*************************************************
# CLOUD READING - CART 351 Mini-Project One
# A bright daytime sky full of drifting clouds.
# Visitors click a cloud and say what they see in it.
# Every reading is saved to a JSON file on the server,
# and everyone's readings float faintly around the clouds.
#*************************************************
from flask import Flask, render_template

app = Flask(__name__)


#*************************************************
# the default route: the sky page
@app.route("/")
def index():
    return render_template("index.html")


#*************************************************
#run
app.run(debug=True)
