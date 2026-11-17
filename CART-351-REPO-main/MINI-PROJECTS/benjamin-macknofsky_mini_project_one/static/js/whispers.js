// CLOUD READING - whispers.js
// everyone's readings floating around the clouds
//
// sections:
//   1. setup
//   2. getting everyone's readings from the server (fetch GET)
//   3. counting the readings
//   4. drawing the whispers


// 1. SETUP

const WHISPERS_PER_CLOUD = 6;   // only the top 6, any more and it gets messy
const CHECK_EVERY = 10;         // check for new ones every 10 seconds

// my copy of guesses.json
let allReadings = {};


// 2. GETTING EVERYONE'S READINGS (fetch GET)

async function loadReadings() {
    try {
        // grab everything from /api/guesses in app.py
        const response = await fetch("/api/guesses");
        allReadings = await response.json();
        updateCount();
    } catch (error) {
        console.log("couldn't get the readings:", error);
    }
}

// once on load, then every 10 seconds so new ones pop up while you're on the page
loadReadings();
setInterval(loadReadings, CHECK_EVERY * 1000);

// reading.js calls this after someone sends one
function readingsUpdated(cloudId, readings) {
    allReadings[cloudId] = readings;
    updateCount();
}

// the count in the tray
function updateCount() {
    let total = 0;
    for (const id in allReadings) {
        total += allReadings[id].length;
    }
    const count = document.getElementById("count");
    if (total === 0) {
        count.textContent = "no one has read the sky yet";
    } else if (total === 1) {
        count.textContent = "the sky has been read 1 time";
    } else {
        count.textContent = "the sky has been read " + total + " times";
    }
}


// 3. COUNTING THE READINGS
// "a dog", "A Dog" and "a dog " all count as the same thing

// only the top ones get shown
function topReadings(cloudId) {
    return countReadings(cloudId).slice(0, WHISPERS_PER_CLOUD);
}

// count them up, most said first
function countReadings(cloudId) {
    const readings = allReadings[cloudId] || [];
    const counts = {};

    for (const r of readings) {
        const key = r.text.toLowerCase().trim();
        if (!counts[key]) {
            counts[key] = { text: r.text, count: 0 };
        }
        counts[key].count++;
    }

    return Object.values(counts).sort((a, b) => b.count - a.count);
}

// "read 12 times · 3 readings drowned out"
// the drowned out ones are still saved, they just don't show up
function cloudInfo(cloudId) {
    const total = (allReadings[cloudId] || []).length;
    const different = countReadings(cloudId);
    const hidden = different.slice(WHISPERS_PER_CLOUD);

    if (total === 0) return "no one has read this cloud yet";

    let line = "read " + total + (total === 1 ? " time" : " times");
    if (hidden.length > 0) {
        line += " · " + hidden.length + (hidden.length === 1 ? " reading" : " readings") + " drowned out";
    }
    return line;
}


// 4. DRAWING THE WHISPERS
// clouds.js calls this every frame

function drawWhispers(seconds) {
    const s = skyScale();

    push();
    textAlign(CENTER, CENTER);
    textFont("Tahoma");
    textStyle(ITALIC);
    noStroke();

    for (const cloud of clouds) {
        const top = topReadings(cloud.id);
        if (top.length === 0) continue;

        const most = top[0].count;
        // whispers get louder when you hover or click the cloud
        const looking = (selectedCloud === cloud || cloudAt(mouseX, mouseY) === cloud);

        // sort by the words so they land in the same spot for everyone
        const placed = top.slice().sort((a, b) => textToNumber(a.text) - textToNumber(b.text));

        // invisible ring around the cloud, the words sit on it
        const ovalW = cloud.width / 2 * s + 30;
        const ovalH = cloud.height / 2 * s + 22;
        const startAngle = cloud.id * 1.3; // each cloud starts the ring somewhere different

        for (let i = 0; i < placed.length; i++) {
            const w = placed[i];

            // more people said it = bigger and darker
            const strength = w.count / most;
            const size = (14 + 8 * strength) * s;
            let alpha = 70 + 110 * strength;
            if (looking) alpha = min(alpha + 70, 240);

            // spread them out evenly so they don't overlap
            const angle = startAngle + (i / placed.length) * Math.PI * 2;
            const x = cloud.x + Math.cos(angle) * ovalW;
            // little bob up and down
            const y = cloud.y + Math.sin(angle) * ovalH + Math.sin(seconds * 0.8 + i * 2) * 3;

            textSize(size);
            fill(55, 105, 165, alpha);
            text(w.text, x, y);
        }
    }

    pop();
}

// turns a word into a number so I can sort by it
function textToNumber(str) {
    let n = 0;
    for (let i = 0; i < str.length; i++) {
        n = (n * 31 + str.toLowerCase().charCodeAt(i)) | 0;
    }
    return n;
}
