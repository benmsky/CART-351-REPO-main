// CLOUD READING - reading.js
// clicking a cloud and saying what you see
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

// look up or the X, either one closes the intro
document.getElementById("intro-button").addEventListener("click", function () {
    intro.classList.add("gone");
});
document.getElementById("intro-close").addEventListener("click", function () {
    intro.classList.add("gone");
});

// desktop icon brings the intro back
document.getElementById("title").addEventListener("click", function () {
    closeReading();
    intro.classList.remove("gone");
});

// X on the reading box
document.getElementById("reading-close").addEventListener("click", closeReading);

// (start button + clock are in timezone.js now)

// words that float up after you send one
let floaters = [];


// 2. OPENING + CLOSING THE BOX

// clouds.js calls this when the sky gets clicked
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
    info.textContent = cloudInfo(cloud.id); // the "read 5 times" line, from whispers.js
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
    event.preventDefault(); // don't let the page reload

    const guess = input.value.trim();
    if (guess === "" || !selectedCloud) return;

    const cloud = selectedCloud;
    closeReading();

    try {
        // send it to /api/guess in app.py
        const response = await fetch("/api/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cloud: cloud.id, guess: guess })
        });
        const result = await response.json();

        // server said no
        if (!response.ok) {
            console.log("couldn't save that reading:", result.error);
            return;
        }

        console.log("cloud " + result.cloud + " has been read " + result.readings.length + " time(s)");

        // show it in the whispers right away instead of waiting
        readingsUpdated(result.cloud, result.readings);

        // float the words up off the cloud
        floaters.push({ text: guess, cloud: cloud, age: 0 });
    } catch (error) {
        console.log("couldn't reach the server:", error);
    }
});


// 4. EVERY FRAME: MOVE THE BOX + FLOATING WORDS
// draw() in clouds.js runs this every frame

function updateReading() {
    const s = skyScale();

    // box sticks with its cloud
    if (selectedCloud) {
        const cloudTop = selectedCloud.y - (selectedCloud.height / 2 + 16) * s;
        const cloudBottom = selectedCloud.y + (selectedCloud.height / 2 + 16) * s;
        const boxHeight = form.offsetHeight;

        // keep it from going off the sides
        const half = form.offsetWidth / 2 + 12;
        form.style.left = constrain(selectedCloud.x, half, width - half) + "px";

        if (cloudTop - boxHeight > 10) {
            // room above, so it goes above
            form.style.top = (cloudTop - boxHeight) + "px";
        } else {
            // cloud's too high, so it goes under instead
            // (but not behind the taskbar)
            form.style.top = Math.min(cloudBottom, height - 44 - boxHeight) + "px";
        }
    }

    // words float up and fade out in like 4 seconds
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
    // clear out the ones that are done
    floaters = floaters.filter(f => f.age < 4);
}
