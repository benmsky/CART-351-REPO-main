// CLOUD READING - clouds.js
// the sky and all the clouds, drawn with p5

// 1. SETTINGS

const NUM_CLOUDS = 7;   // 7 clouds, has to match app.py
const MARGIN = 260;     // how far off screen a cloud goes before it loops back around
const SKY_SEED = 5;     // tried a bunch of seeds, 5 spreads them out the best

// every kind of cloud is the same recipe, just different numbers:
// how many puffs, how wide and tall, puff sizes, how many limbs, and the max size [width, height]
const KINDS = {
    big:       { puffs: 12, wide: 95,  tall: 24,  r: [42, 72], limbs: 0, max: [460, 190] },
    long:      { puffs: 22, wide: 190, tall: 10,  r: [24, 40], limbs: 0, max: [480, 105] },
    tower:     { puffs: 10, wide: 35,  tall: 100, r: [32, 50], limbs: 0, max: [250, 230] },
    creature:  { puffs: 6,  wide: 60,  tall: 20,  r: [36, 58], limbs: 3, max: [400, 185] },
    scattered: { puffs: 14, wide: 170, tall: 22,  r: [20, 34], limbs: 0, max: [440, 135] }
};
const SKY = ["creature", "big", "long", "tower", "creature", "scattered", "big"]; // cloud 0 is a creature, cloud 1 is big, etc

let clouds = [];
let selectedCloud = null; // whichever cloud got clicked (reading.js uses this too)


// 2. SETUP + DRAW

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent("sky");
    // sky gets clicked, reading.js handles it
    canvas.elt.addEventListener("pointerdown", e => skyClicked(e.clientX, e.clientY));

    for (let i = 0; i < NUM_CLOUDS; i++) clouds.push(makeCloud(i));
    scatterClouds();
    clouds.sort((a, b) => a.size - b.size); // small ones first so the big ones end up on top
    for (const cloud of clouds) paintCloud(cloud);
}

function draw() {
    clear(); // see-through so the css sky shows behind

    // going off the real clock so everyone sees the same sky at the same time
    const seconds = Date.now() / 1000;
    for (const cloud of clouds) {
        // slides across and comes back on the other side
        const span = width + MARGIN * 2;
        cloud.x = ((cloud.start + seconds * cloud.speed / span) % 1) * span - MARGIN;
        cloud.y = 90 + cloud.heightFrac * (height - 90);
        drawCloud(cloud, seconds);
    }

    drawWhispers(seconds);                          // everyone's readings (whispers.js)
    cursor(cloudAt(mouseX, mouseY) ? HAND : ARROW); // hand cursor over a cloud so people know to click
    updateReading();                                // reading box + floating words (reading.js)
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}


// 3. MAKING A CLOUD
// a cloud is just a bunch of circles, I'm calling them puffs
// the id is the seed so each cloud looks the same for everyone, which matters for the readings

function makeCloud(id) {
    const rand = seededRandom(id * 9973 + 17);
    const between = (min, max) => min + rand() * (max - min);
    const kind = KINDS[SKY[id]];
    let puffs = [];

    // the main body, puffs bunched up. bottom stays kinda flat like real clouds
    for (let i = 0; i < kind.puffs; i++) {
        puffs.push({ x: between(-kind.wide, kind.wide), y: between(-kind.tall, kind.tall * 0.4), r: between(kind.r[0], kind.r[1]) });
    }

    // limbs, a few puffs in a row that shrink and bend. could look like a neck or a tail or nothing
    for (let i = 0; i < kind.limbs; i++) {
        const start = puffs[Math.floor(rand() * kind.puffs)];
        let angle = between(PI * 0.85, PI * 2.15); // mostly up and sideways (negative y is up, always forget)
        let r = between(26, 40);
        let x = start.x + cos(angle) * start.r, y = start.y + sin(angle) * start.r;
        for (let j = 0; j < 4; j++) {
            puffs.push({ x: x, y: Math.min(y, 30), r: r });
            angle += between(-0.5, 0.5);
            x += cos(angle) * r;
            y += sin(angle) * r;
            r *= 0.85;
        }
    }

    // centre it and shrink it if it got too big
    const minX = Math.min(...puffs.map(p => p.x - p.r)), maxX = Math.max(...puffs.map(p => p.x + p.r));
    const minY = Math.min(...puffs.map(p => p.y - p.r)), maxY = Math.max(...puffs.map(p => p.y + p.r));
    const size = Math.min(1, kind.max[0] / (maxX - minX), kind.max[1] / (maxY - minY)) * between(0.9, 1.05);
    puffs = puffs.map(p => ({ x: (p.x - (minX + maxX) / 2) * size, y: (p.y - (minY + maxY) / 2) * size, r: p.r * size }));

    return { id: id, puffs: puffs, size: size, width: (maxX - minX) * size, height: (maxY - minY) * size };
}


// 4. SCATTERING THE CLOUDS
// random but they can't crash. main rule: same height = same speed,
// otherwise the faster one catches up and runs into the slower one

const tallness = c => (c.height + 10) / 590;  // how much of the sky it takes up, up and down
const wideness = c => (c.width + 50) / 1500;  // and side to side (a bit extra just to be safe)

function scatterClouds() {
    const rand = seededRandom(SKY_SEED);
    const between = (min, max) => min + rand() * (max - min);
    const placed = [];

    for (const c of clouds.slice().sort((a, b) => b.height - a.height)) { // big ones first, they're hardest to fit
        // doesn't fit? shrink it a bit and try again, max 8 times so it can't get stuck
        for (let shrinks = 0; shrinks < 8 && !placeCloud(c, placed, between); shrinks++) {
            c.puffs.forEach(p => { p.x *= 0.9; p.y *= 0.9; p.r *= 0.9; });
            c.width *= 0.9; c.height *= 0.9; c.size *= 0.9;
        }
        if (c.speed) placed.push(c); // still didn't fit, just leave it out
    }
    clouds = placed;

    // space out the clouds that share a speed, random gaps so it's not a grid
    for (const speed of new Set(clouds.map(c => c.speed))) {
        const group = clouds.filter(c => c.speed === speed);
        const room = 1 - group.reduce((total, c) => total + wideness(c), 0);
        const gaps = group.map(() => between(0.2, 1));
        const gapTotal = gaps.reduce((a, b) => a + b, 0);
        let pos = rand();
        group.forEach((c, i) => {
            c.start = pos + wideness(c) / 2;
            pos += wideness(c) + room * gaps[i] / gapTotal;
        });
    }
}

// finds a height + speed for one cloud. true if it worked
function placeCloud(c, placed, between) {
    const half = tallness(c) / 2;
    for (let tries = 0; tries < 400; tries++) {
        const y = between(half - 0.07, 0.85 - half); // somewhere on screen, above the hill
        const level = placed.filter(o => Math.abs(o.heightFrac - y) < half + tallness(o) / 2);

        if (level.length === 0) {
            // nobody at this height so it gets its own speed, one that's actually different
            let speed = between(6, 17);
            for (let i = 0; i < 50 && placed.some(o => Math.abs(o.speed - speed) < 1.2); i++) speed = between(6, 17);
            c.heightFrac = y; c.speed = speed;
            return true;
        }
        // keep trying for an empty height for a bit first
        if (tries < 200) continue;

        // ok it can share, but only if everyone there has the same speed and there's room
        const speed = level[0].speed;
        const used = placed.filter(o => o.speed === speed).reduce((total, o) => total + wideness(o), wideness(c));
        if (level.every(o => o.speed === speed) && used <= 0.85) {
            c.heightFrac = y; c.speed = speed;
            return true;
        }
    }
    return false;
}


// 5. PAINTING + DRAWING A CLOUD
// fluffy clouds = tons of circles and blur, way too slow to draw every frame
// so each cloud gets painted once onto a picture and then I just move the picture

function paintCloud(cloud) {
    const rand = seededRandom(cloud.id * 31 + 5);
    const PAINT = 1.25, PAD = 50; // paint it at the biggest size it'll be, plus room for the blur
    const w = Math.ceil((cloud.width + PAD * 2) * PAINT), h = Math.ceil((cloud.height + PAD * 2) * PAINT);
    const g = createGraphics(w, h), ctx = g.drawingContext;
    g.noStroke();
    g.translate(w / 2, h / 2);
    g.scale(PAINT);

    // extra fluff, little circles around the top and sides of each puff
    const all = cloud.puffs.slice();
    for (const p of cloud.puffs) {
        for (let i = 0; i < 7; i++) {
            const angle = PI * (0.95 + rand() * 1.1);
            all.push({ x: p.x + cos(angle) * p.r * 0.78, y: p.y + sin(angle) * p.r * 0.78, r: p.r * (0.32 + rand() * 0.23) });
        }
    }

    // 1. soft blue-grey shadow underneath
    ctx.shadowBlur = 16;
    ctx.shadowColor = "rgba(150, 175, 215, 0.7)";
    g.fill(175, 195, 228);
    for (const p of all) g.circle(p.x, p.y + p.r * 0.3, p.r * 2);

    // 2. the cloud, white on top and a bit blue on the bottom
    const shade = ctx.createLinearGradient(0, -cloud.height / 2, 0, cloud.height / 2);
    shade.addColorStop(0, "white");
    shade.addColorStop(1, "rgb(212, 226, 245)");
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
    ctx.fillStyle = shade;
    for (const p of all) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TWO_PI); ctx.fill(); }

    // 3. bright spots on top like the sun's hitting it
    g.fill(255, 255, 255, 90);
    for (const p of cloud.puffs) g.circle(p.x - p.r * 0.25, p.y - p.r * 0.3, p.r * 0.9);

    // 4. blur it so you can't tell it's circles
    cloud.picture = createGraphics(w, h);
    cloud.picture.drawingContext.filter = "blur(3.5px)";
    cloud.picture.image(g, 0, 0);
    g.remove();
}

function drawCloud(cloud, seconds) {
    // grows and shrinks a tiny bit so it feels alive
    const s = skyScale() / 1.25 * (1 + 0.015 * sin(seconds * 0.4 + cloud.id * 2));
    const w = cloud.picture.width * s, h = cloud.picture.height * s;
    push();
    if (selectedCloud === cloud) { // clicked cloud glows yellow
        drawingContext.shadowColor = "rgba(255, 220, 120, 0.95)";
        drawingContext.shadowBlur = 35;
    }
    image(cloud.picture, cloud.x - w / 2, cloud.y - h / 2, w, h);
    pop();
}


// 6. HELPERS

// which cloud is the mouse on, front ones first. null if it's just sky
function cloudAt(mx, my) {
    const s = skyScale();
    for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        if (c.puffs.some(p => dist(mx, my, c.x + p.x * s, c.y + p.y * s) < p.r * s)) return c;
    }
    return null;
}

// bigger clouds on big screens, smaller on small ones
function skyScale() {
    return constrain(Math.min(width / 1100, height / 760), 0.7, 1.25);
}

// seeded random, same seed gives the same numbers every time
// that's how the clouds look the same for everyone
// (it's a common generator called mulberry32, didn't write the math myself)
function seededRandom(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
