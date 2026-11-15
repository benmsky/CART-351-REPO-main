// CLOUD READING - clouds.js
// draws the sky and the clouds with p5.js
//
// sections:
//   1. settings
//   2. setup + draw (p5 runs these)
//   3. making a cloud
//   4. moving a cloud
//   5. drawing a cloud
//   6. clicking a cloud
//   7. little helpers


//*************************************************
// 1. SETTINGS

const NUM_CLOUDS = 9;   // how many clouds (has to match NUM_CLOUDS in app.py)
const MARGIN = 260;     // how far off screen a cloud goes before it loops back

let clouds = [];
let selectedCloud = null; // the cloud someone clicked on (used in reading.js)


//*************************************************
// 2. SETUP + DRAW

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent("sky");

    // when the sky gets clicked, reading.js takes over
    canvas.elt.addEventListener("pointerdown", function (event) {
        skyClicked(event.clientX, event.clientY);
    });

    // make all the clouds
    for (let i = 0; i < NUM_CLOUDS; i++) {
        clouds.push(makeCloud(i));
    }
    // small (far away) clouds first, so the big ones get drawn on top
    clouds.sort((a, b) => a.depth - b.depth);
}

function draw() {
    clear(); // see-through canvas so the blue sky from the css shows

    // using the real clock means everyone sees the same sky at the same time
    const seconds = Date.now() / 1000;
    for (const cloud of clouds) {
        updatePosition(cloud, seconds);
        drawCloud(cloud, seconds);
    }

    // hand cursor over a cloud so people know they can click it
    cursor(cloudAt(mouseX, mouseY) ? HAND : ARROW);

    // move the reading box + floating words along with the clouds (in reading.js)
    updateReading();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}


//*************************************************
// 3. MAKING A CLOUD
// a cloud is just a bunch of circles ("puffs") squished together
// the id is used as the seed, so cloud 3 is always the same shape for everyone

function makeCloud(id) {
    const rand = seededRandom(id * 9973 + 17);

    // smaller = further away = slower
    const depth = between(rand, 0.6, 1.1);

    // start with one puff, then keep sticking new puffs onto random old ones
    // this gives the clouds weird lumps and arms, so there's stuff to see in them
    const puffs = [{ x: 0, y: 0, r: between(rand, 34, 46), phase: rand() * Math.PI * 2 }];
    const count = Math.floor(between(rand, 10, 19));

    for (let i = 1; i < count; i++) {
        const parent = puffs[Math.floor(rand() * puffs.length)];
        const r = between(rand, 12, 42);
        // grow mostly sideways and up (negative y is up in p5)
        const angle = between(rand, Math.PI * 0.9, Math.PI * 2.1);
        const dist = (parent.r + r) * between(rand, 0.5, 0.8);
        puffs.push({
            x: parent.x + Math.cos(angle) * dist,
            // keep the bottom kinda flat like real clouds
            y: Math.min(parent.y + Math.sin(angle) * dist, 14),
            r: r,
            phase: rand() * Math.PI * 2   // for the breathing (see breathe())
        });
    }

    // find the edges of the cloud so we can centre it
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of puffs) {
        minX = Math.min(minX, p.x - p.r);
        maxX = Math.max(maxX, p.x + p.r);
        minY = Math.min(minY, p.y - p.r);
        maxY = Math.max(maxY, p.y + p.r);
    }
    // centre it and shrink it if it's far away
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    for (const p of puffs) {
        p.x = (p.x - midX) * depth;
        p.y = (p.y - midY) * depth;
        p.r = p.r * depth;
    }

    return {
        id: id,
        puffs: puffs,
        depth: depth,
        width: (maxX - minX) * depth,
        speed: between(rand, 9, 18) * depth,     // pixels per second
        heightFrac: between(rand, 0.12, 0.62),   // how high up (0 = top of the screen)
        // spread the clouds out evenly, with a bit of randomness
        startFrac: id / NUM_CLOUDS + between(rand, -0.04, 0.04),
        x: 0,
        y: 0
    };
}


//*************************************************
// 4. MOVING A CLOUD
// works out where the cloud should be right now, based on the clock

function updatePosition(cloud, seconds) {
    const span = width + MARGIN * 2;   // the whole loop, including off screen
    let frac = (cloud.startFrac + (seconds * cloud.speed) / span) % 1;
    if (frac < 0) frac += 1;
    cloud.x = frac * span - MARGIN;
    cloud.y = 90 + cloud.heightFrac * (height - 90);
}


//*************************************************
// 5. DRAWING A CLOUD

function drawCloud(cloud, seconds) {
    push();
    translate(cloud.x, cloud.y);
    scale(skyScale()); // smaller on small screens
    noStroke();

    // blurry edges so it looks fluffy and not like circles
    drawingContext.shadowBlur = 26 * cloud.depth;

    // first: a light blue-grey layer a bit lower down, like a shadow underneath
    drawingContext.shadowColor = "rgba(170, 195, 225, 0.8)";
    fill(196, 214, 236);
    for (const p of cloud.puffs) {
        const r = p.r * breathe(p, seconds);
        circle(p.x, p.y + 7 * cloud.depth, r * 2);
    }

    // then: the white cloud on top
    // the cloud you clicked glows yellow so you know which one you picked
    if (selectedCloud === cloud) {
        drawingContext.shadowColor = "rgba(255, 236, 170, 1)";
        drawingContext.shadowBlur = 40 * cloud.depth;
    } else {
        drawingContext.shadowColor = "rgba(255, 255, 255, 0.9)";
    }
    fill(255);
    for (const p of cloud.puffs) {
        const r = p.r * breathe(p, seconds);
        circle(p.x, p.y, r * 2);
    }

    drawingContext.shadowBlur = 0;
    pop();
}


//*************************************************
// 6. CLICKING A CLOUD
// gives back the cloud under the mouse, or null if it's just sky
// checks the front clouds first since they're on top

function cloudAt(mx, my) {
    const s = skyScale();
    const seconds = Date.now() / 1000;
    for (let i = clouds.length - 1; i >= 0; i--) {
        const cloud = clouds[i];
        // is the mouse inside any of this cloud's puffs?
        for (const p of cloud.puffs) {
            const px = cloud.x + p.x * s;
            const py = cloud.y + p.y * s;
            const r = p.r * s * breathe(p, seconds);
            if (dist(mx, my, px, py) < r) {
                return cloud;
            }
        }
    }
    return null;
}


//*************************************************
// 7. LITTLE HELPERS

// cloud size based on the screen: full size on a big screen, a bit smaller on a small one
function skyScale() {
    return constrain(width / 1200, 0.75, 1.25);
}

// puffs grow and shrink a tiny bit so the sky feels alive
function breathe(puff, seconds) {
    return 1 + 0.035 * Math.sin(seconds * 0.4 + puff.phase);
}

// random number between min and max
function between(rand, min, max) {
    return min + rand() * (max - min);
}

// "seeded" random: the same seed always gives the same random numbers
// that's how every cloud keeps the same shape for everyone
// (it's a common little generator called mulberry32, I didn't write the math myself)
function seededRandom(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
