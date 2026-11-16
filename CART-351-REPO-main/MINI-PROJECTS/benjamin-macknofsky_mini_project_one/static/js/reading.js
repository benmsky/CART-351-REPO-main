// CLOUD READING - reading.js
// what happens when you click a cloud and say what you see
//
// sections:
//   1. setup (+ the intro window)
//   2. opening + closing the box
//   3. sending a reading to the server (fetch POST)
//   4. every frame: move the box + floating words


// 1. SETUP

const form = document.getElementById("reading");
const input = document.getElementById("reading-input");
const info = document.getElementById("reading-info");
const intro = document.getElementById("intro");

// the intro window closes with "Look up" or the X
document.getElementById("intro-button").addEventListener("click", function () {
    intro.classList.add("gone");
});
document.getElementById("intro-close").addEventListener("click", function () {
    intro.classList.add("gone");
});

// the desktop icon opens the intro window again
document.getElementById("title").addEventListener("click", function () {
    closeReading();
    intro.classList.remove("gone");
});

// the X on the reading window closes it
document.getElementById("reading-close").addEventListener("click", closeReading);

// (the start button and the clock are in timezone.js)

// words that float up after you submit
let floaters = [];


// 2. OPENING + CLOSING THE BOX

// clouds.js calls this when the sky is clicked
function skyClicked(x, y) {
    const cloud = cloudAt(x, y);
    if (cloud) {
        openReading(cloud);
    } else {
        closeReading(); // clicked empty sky
    }
}

function openReading(cloud) {
    selectedCloud = cloud;
    input.value = "";
    info.textContent = cloudInfo(cloud.id); // "read 5 times" etc. (in whispers.js)
    form.classList.add("open");
    input.focus();
}

function closeReading() {
    selectedCloud = null;
    form.classList.remove("open");
}

// escape closes it too
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeReading();
});


// 3. SENDING A READING TO THE SERVER (fetch POST)

form.addEventListener("submit", async function (event) {
    event.preventDefault(); // stop the page from reloading

    const guess = input.value.trim();
    if (guess === "" || !selectedCloud) return;

    const cloud = selectedCloud;
    closeReading();

    try {
        // send the cloud number + what they saw to /api/guess in app.py
        const response = await fetch("/api/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cloud: cloud.id, guess: guess })
        });
        const result = await response.json();

        // the server said no (empty guess, wrong cloud, etc.)
        if (!response.ok) {
            console.log("couldn't save that reading:", result.error);
            return;
        }

        console.log("cloud " + result.cloud + " has been read " + result.readings.length + " time(s)");

        // add it to the whispers right away (in whispers.js)
        readingsUpdated(result.cloud, result.readings);

        // float their words up off the cloud
        floaters.push({ text: guess, cloud: cloud, age: 0 });
    } catch (error) {
        console.log("couldn't reach the server:", error);
    }
});


// 4. EVERY FRAME: MOVE THE BOX + FLOATING WORDS
// draw() in clouds.js calls this

function updateReading() {
    const s = skyScale();

    // keep the box next to the cloud it belongs to
    if (selectedCloud) {
        const cloudTop = selectedCloud.y - (selectedCloud.height / 2 + 16) * s;
        const cloudBottom = selectedCloud.y + (selectedCloud.height / 2 + 16) * s;
        const boxHeight = form.offsetHeight;

        // don't let it go off the left or right side of the screen
        const half = form.offsetWidth / 2 + 12;
        form.style.left = constrain(selectedCloud.x, half, width - half) + "px";

        if (cloudTop - boxHeight > 10) {
            // there's room above the cloud: put it there
            form.style.top = (cloudTop - boxHeight) + "px";
        } else {
            // the cloud is too high up: put the box under the cloud instead
            // (but never down behind the taskbar)
            form.style.top = Math.min(cloudBottom, height - 44 - boxHeight) + "px";
        }
    }

    // floating words go up and fade out over 4 seconds
    push();
    textAlign(CENTER, CENTER);
    textFont("Tahoma");
    textStyle(ITALIC);
    textSize(20);
    noStroke();
    for (const f of floaters) {
        f.age += deltaTime / 1000;
        const alpha = 255 * (1 - f.age / 4);
        fill(255, 255, 255, alpha);
        drawingContext.shadowColor = "rgba(40, 100, 170, 0.5)";
        drawingContext.shadowBlur = 8;
        text(f.text, f.cloud.x, f.cloud.y - 20 - f.age * 30);
    }
    pop();
    // get rid of the ones that faded out
    floaters = floaters.filter(f => f.age < 4);
}
