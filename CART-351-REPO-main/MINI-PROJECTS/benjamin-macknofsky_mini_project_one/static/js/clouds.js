/* CLOUD READING - the sky (p5.js)
 *
 * Every cloud is built from a "seed" number (its id), so cloud #3 always
 * has exactly the same shape for every visitor. That matters later on:
 * when people say what they see in a cloud, they're all looking at the same one.
 *
 * Cloud positions come from the real clock (Date.now()), so everyone who has
 * the page open at the same moment sees the same sky drifting by.
 */

const NUM_CLOUDS = 9;   // how many clouds are in the sky
const MARGIN = 260;     // how far off screen a cloud goes before wrapping around

let clouds = [];


/* ------------------------------------------------------------------
 * seeded random: the same seed always gives the same list of "random" numbers
 * (this is a small, well-known generator called mulberry32)
 * ------------------------------------------------------------------ */
function seededRandom(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// random number between min and max, using one of the seeded generators
function between(rand, min, max) {
    return min + rand() * (max - min);
}


/* ------------------------------------------------------------------
 * build one cloud from its id
 * a cloud is just a bunch of overlapping circles ("puffs")
 * ------------------------------------------------------------------ */
function makeCloud(id) {
    const rand = seededRandom(id * 9973 + 17);

    // depth: smaller clouds feel further away, so they're slower and drawn first
    const depth = between(rand, 0.6, 1.1);

    // the cloud "grows" one puff at a time: each new puff sticks onto the side
    // of a puff that's already there. Because it's random, the clouds end up with
    // lumps, arms and heads in strange places, which gives people something to read.
    const puffs = [{ x: 0, y: 0, r: between(rand, 34, 46), phase: rand() * Math.PI * 2 }];
    const count = Math.floor(between(rand, 10, 19));

    for (let i = 1; i < count; i++) {
        const parent = puffs[Math.floor(rand() * puffs.length)];
        const r = between(rand, 12, 42);
        // mostly grow sideways and upwards (in p5, negative y is up)
        const angle = between(rand, Math.PI * 0.9, Math.PI * 2.1);
        const dist = (parent.r + r) * between(rand, 0.5, 0.8);
        puffs.push({
            x: parent.x + Math.cos(angle) * dist,
            // don't let puffs hang too far below the base, real clouds are flatter on the bottom
            y: Math.min(parent.y + Math.sin(angle) * dist, 14),
            r: r,
            phase: rand() * Math.PI * 2               // for the slow "breathing"
        });
    }

    // centre the cloud on its own middle, and scale it by its depth
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of puffs) {
        minX = Math.min(minX, p.x - p.r);
        maxX = Math.max(maxX, p.x + p.r);
        minY = Math.min(minY, p.y - p.r);
        maxY = Math.max(maxY, p.y + p.r);
    }
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
        speed: between(rand, 9, 18) * depth,          // pixels per second
        heightFrac: between(rand, 0.12, 0.62),        // how high up the sky (0 = top)
        // spread the clouds evenly across the sky, with a little wobble
        startFrac: id / NUM_CLOUDS + between(rand, -0.04, 0.04),
        x: 0,
        y: 0
    };
}


/* ------------------------------------------------------------------
 * work out where a cloud is right now, from the clock
 * ------------------------------------------------------------------ */
function updatePosition(cloud, seconds) {
    const span = width + MARGIN * 2;                  // the full loop, including off screen
    let frac = (cloud.startFrac + (seconds * cloud.speed) / span) % 1;
    if (frac < 0) frac += 1;
    cloud.x = frac * span - MARGIN;
    cloud.y = 90 + cloud.heightFrac * (height - 90);
}


/* ------------------------------------------------------------------
 * draw one cloud
 * ------------------------------------------------------------------ */
function drawCloud(cloud, seconds) {
    push();
    translate(cloud.x, cloud.y);
    scale(skyScale()); // smaller clouds on smaller screens
    noStroke();

    // soft blurry edges, so the clouds look fluffy instead of like circles
    drawingContext.shadowBlur = 26 * cloud.depth;

    // 1. a pale blue-grey underside, slightly lower, for some volume
    drawingContext.shadowColor = "rgba(170, 195, 225, 0.8)";
    fill(196, 214, 236);
    for (const p of cloud.puffs) {
        const r = p.r * breathe(p, seconds);
        circle(p.x, p.y + 7 * cloud.depth, r * 2);
    }

    // 2. the bright white body on top
    drawingContext.shadowColor = "rgba(255, 255, 255, 0.9)";
    fill(255);
    for (const p of cloud.puffs) {
        const r = p.r * breathe(p, seconds);
        circle(p.x, p.y, r * 2);
    }

    drawingContext.shadowBlur = 0;
    pop();
}

// clouds are full size on a wide screen, and shrink a bit on narrow ones
function skyScale() {
    return constrain(width / 1200, 0.75, 1.25);
}

// each puff swells and shrinks very slightly, so the sky feels alive
function breathe(puff, seconds) {
    return 1 + 0.035 * Math.sin(seconds * 0.4 + puff.phase);
}


/* ------------------------------------------------------------------
 * p5 setup and draw
 * ------------------------------------------------------------------ */
function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent("sky");

    for (let i = 0; i < NUM_CLOUDS; i++) {
        clouds.push(makeCloud(i));
    }
    // far away (small) clouds first, so the close ones are drawn over them
    clouds.sort((a, b) => a.depth - b.depth);
}

function draw() {
    clear(); // transparent canvas, so the CSS sky gradient shows through

    const seconds = Date.now() / 1000;
    for (const cloud of clouds) {
        updatePosition(cloud, seconds);
        drawCloud(cloud, seconds);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
