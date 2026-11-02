from flask import Flask,render_template,request,redirect,url_for
import requests
app = Flask(__name__)


# the default route
@app.route("/")
def index():
      return render_template("index.html")

#*************************************************
#Task-1: GET REQUEST
@app.route("/t1")
def t1():
    return render_template("t1.html",have_results=False)
#*************************************************
@app.route("/getSearchCriteria")
def getSearchCriteria():
    # get the user input from the form (GET request -> request.args)
    searchTerm = request.args.get("search", "").strip()

    # build the url for the NASA Image API
    url = "https://images-api.nasa.gov/search?q=" + searchTerm + "&media_type=image"
    response = requests.get(url)
    data = response.json()

    # the results are a list of items (each one is a dictionary)
    items = data.get("collection", {}).get("items", [])

    # nothing found (or an empty search) -> go back to the page with a message
    if not searchTerm or len(items) == 0:
        return render_template("t1.html",
                               have_results = False,
                               no_results = True,
                               searchTerm = searchTerm)

    # the first item in the list
    firstItem = items[0]
    # first image href from the links key
    imgFromNasa = firstItem["links"][0]["href"]
    # first description from the data key
    description = firstItem["data"][0]["description"]

    #replace the empty space to be url encoded
    imgFromNasa = imgFromNasa.replace(' ', '%20')
    return render_template("t1.html",
                              have_results = True,
                              description=description,
                              imgPath = imgFromNasa

                           )

#*************************************************
# #Task-2: GET REQUEST
@app.route("/t2")
def t2():
    return render_template("t2.html")
#*************************************************
@app.route("/getSearchCriteria_adv")
def getSearchCriteria_adv():
    # get the user input from the form (GET request -> request.args)
    searchTerm = request.args.get("search", "").strip()

    # build the url for the NASA Image API
    url = "https://images-api.nasa.gov/search?q=" + searchTerm + "&media_type=image"
    response = requests.get(url)
    data = response.json()

    # the results are a list of items (each one is a dictionary)
    items = data.get("collection", {}).get("items", [])

    encodedImageLinks = []
    for item in items:
        # skip any item that has no image links
        if "links" not in item:
            continue
        # first image href from the links key
        singleImage = item["links"][0]["href"]
        # url encode the spaces and add it to the list
        encodedImageLinks.append(singleImage.replace(' ', '%20'))

    return render_template("t2.html",images=encodedImageLinks)
#*************************************************

#run
app.run(debug=True)