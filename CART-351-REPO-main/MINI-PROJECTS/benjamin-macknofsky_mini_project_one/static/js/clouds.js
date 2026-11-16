// CLOUD READING - clouds.js
// this is where the sky happens. p5 draws all the clouds

// 1. SETTINGS

const NUM_CLOUDS = 7;   // 7 clouds. gotta remember app.py needs the same number
const MARGIN = 260;     // how far off screen a cloud drifts before I loop it back around
const SKY_SEED = 5;     // tried a bunch of seeds, 5 spreads the clouds out the nicest

// every kind of cloud is really the same recipe, I just change the numbers:
// how many puffs, how wide and tall the bunch is, how big each puff is,
// how many "limbs" poke out, and the biggest I'll let it get [width, height]
const KINDS = {
    big:       { puffs: 12, wide: 95,  tall: 24,  r: [42, 72], limbs: 0, max: [460, 190] },
    long:      { puffs: 22, wide: 190, tall: 10,  r: [24, 40], limbs: 0, max: [480, 105] },
    tower:     { puffs: 10, wide: 35,  tall: 100, r: [32, 50], limbs: 0, max: [250, 230] },
    creature:  { puffs: 6,  wide: 60,  tall: 20,  r: [36, 58], limbs: 3, max: [400, 185] },
    scattered: { puffs: 14, wide: 170, tall: 22,  r: [20, 34], limbs: 0, max: [440, 135] }
};
const SKY = ["creature", "big", "long", "tower", "creature", "scattered", "big"]; // so cloud 0 is a creature, cloud 1 is big...

let clouds = [];
let selectedCloud = null; // whichever cloud got clicked (reading.js needs this too)


// 2. SETUP + DRAW

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent("sky");
    // when someone clicks the sky, I hand it off to reading.js
    canvas.elt.addEventListener("pointerdown", e => skyClicked(e.clientX, e.clientY));

    for (let i = 0; i < NUM_CLOUDS; i++) clouds.push(makeCloud(i));
    scatterClouds();
    clouds.sort((a, b) => a.size - b.size); // small ones first so the big ones end up in front
    for (const cloud of clouds) paintCloud(cloud);
}

function draw() {
    clear(); // keep the canvas see-through so my css sky shows behind it

    // if I use the real clock, everyone sees the same sky at the same time. kinda cool
    const seconds = Date.now() / 1000;
    for (const cloud of clouds) {
        // where is this cloud right now? it slides across, and when it goes off one side it comes back on the other
        const span = width + MARGIN * 2;
        cloud.x = ((cloud.start + seconds * cloud.speed / span) % 1) * span - MARGIN;
        cloud.y = 90 + cloud.heightFrac * (height - 90);
        drawCloud(cloud, seconds);
    }

    drawWhispers(seconds);                          // everyone's readings floating around (whispers.js)
    cursor(cloudAt(mouseX, mouseY) ? HAND : ARROW); // hand cursor on a cloud so people know they can click it
    updateReading();                                // keep the reading box + floating words moving (reading.js)
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}


// 3. MAKING A CLOUD
// a cloud is just a pile of circles. I'm calling them puffs.
// using the id as the seed means cloud 3 looks the same for everybody, which I need for the readings to make sense

function makeCloud(id) {
    const rand = seededRandom(id * 9973 + 17);
    const between = (min, max) => min + rand() * (max - min);
    const kind = KINDS[SKY[id]];
    let puffs = [];

    // the body first, a bunch of puffs squished together. keeping the bottom kinda flat like real clouds
    for (let i = 0; i < kind.puffs; i++) {
        puffs.push({ x: between(-kind.wide, kind.wide), y: between(-kind.tall, kind.tall * 0.4), r: between(kind.r[0], kind.r[1]) });
    }

    // then limbs: a few puffs in a row that shrink and bend. could look like a neck, an ear, a tail... or nothing, that's the point
    for (let i = 0; i < kind.limbs; i++) {
        const start = puffs[Math.floor(rand() * kind.puffs)];
        let angle = between(PI * 0.85, PI * 2.15); // mostly up and sideways (negative y is up, always forget that)
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

    // find the middle so I can centre it, and shrink it if it got too big for its kind
    const minX = Math.min(...puffs.map(p => p.x - p.r)), maxX = Math.max(...puffs.map(p => p.x + p.r));
    const minY = Math.min(...puffs.map(p => p.y - p.r)), maxY = Math.max(...puffs.map(p => p.y + p.r));
    const size = Math.min(1, kind.max[0] / (maxX - minX), kind.max[1] / (maxY - minY)) * between(0.9, 1.05);
    puffs = puffs.map(p => ({ x: (p.x - (minX + maxX) / 2) * size, y: (p.y - (minY + maxY) / 2) * size, r: p.r * size }));

    return { id: id, puffs: puffs, size: size, width: (maxX - minX) * size, height: (maxY - minY) * size };
}


// 4. SCATTERING THE CLOUDS
// I want them random, but they can't crash into each other.
// so the one rule: if two clouds are at the same height, they HAVE to move at the same speed,
// otherwise the faster one catches up and smashes into the slower one

const tallness = c => (c.height + 10) / 590;  // how much of the sky a cloud takes up
const wideness = c => (c.width + 50) / 1500;  // (playing it safe so it works on small and big screens)

function scatterClouds() {
    const rand = seededRandom(SKY_SEED);
    const between = (min, max) => min + rand() * (max - min);
    const placed = [];

    for (const c of clouds.slice().sort((a, b) => b.height - a.height)) { // big ones first, they're the hardest to fit
        // if it doesn't fit, shrink it a little and try again. only 8 times though, or it could get stuck forever
        for (let shrinks = 0; shrinks < 8 && !placeCloud(c, placed, between); shrinks++) {
            c.puffs.forEach(p => { p.x *= 0.9; p.y *= 0.9; p.r *= 0.9; });
            c.width *= 0.9; c.height *= 0.9; c.size *= 0.9;
        }
        if (c.speed) placed.push(c); // if it STILL didn't fit, I just leave it out. better than overlapping
    }
    clouds = placed;

    // clouds that share a speed need spacing out, random gaps so it doesn't look like a grid
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

// looking for a height + speed for one cloud. true if I found one, false if not
function placeCloud(c, placed, between) {
    const half = tallness(c) / 2;
    for (let tries = 0; tries < 400; tries++) {
        const y = between(half - 0.07, 0.85 - half); // somewhere on screen, above the hill
        const level = placed.filter(o => Math.abs(o.heightFrac - y) < half + tallness(o) / 2);

        if (level.length === 0) {
            // nobody else up here, so it gets its own speed. making sure it's actually different from the others
            let speed = between(6, 17);
            for (let i = 0; i < 50 && placed.some(o => Math.abs(o.speed - speed) < 1.2); i++) speed = between(6, 17);
            c.heightFrac = y; c.speed = speed;
            return true;
        }
        // I'd rather it had its own height, so I keep looking for a while first
        if (tries < 200) continue;

        // ok fine, it can share. but only if everyone at this height has the same speed, and there's room
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
// fluffy clouds = tons of soft circles + blur, and that's way too slow to draw every single frame.
// so I paint each cloud ONCE onto a hidden picture, then just move the picture around

function paintCloud(cloud) {
    const rand = seededRandom(cloud.id * 31 + 5);
    const PAINT = 1.25, PAD = 50; // paint it at the biggest it'll ever get, plus room for the blur
    const w = Math.ceil((cloud.width + PAD * 2) * PAINT), h = Math.ceil((cloud.height + PAD * 2) * PAINT);
    const g = createGraphics(w, h), ctx = g.drawingContext;
    g.noStroke();
    g.translate(w / 2, h / 2);
    g.scale(PAINT);

    // extra fluff, little circles around the top and sides of every puff
    const all = cloud.puffs.slice();
    for (const p of cloud.puffs) {
        for (let i = 0; i < 7; i++) {
            const angle = PI * (0.95 + rand() * 1.1);
            all.push({ x: p.x + cos(angle) * p.r * 0.78, y: p.y + sin(angle) * p.r * 0.78, r: p.r * (0.32 + rand() * 0.23) });
        }
    }

    // 1. a soft blue-grey shadow underneath, gives it some weight
    ctx.shadowBlur = 16;
    ctx.shadowColor = "rgba(150, 175, 215, 0.7)";
    g.fill(175, 195, 228);
    for (const p of all) g.circle(p.x, p.y + p.r * 0.3, p.r * 2);

    // 2. the actual cloud, white on top fading to a soft blue on the bottom
    const shade = ctx.createLinearGradient(0, -cloud.height / 2, 0, cloud.height / 2);
    shade.addColorStop(0, "white");
    shade.addColorStop(1, "rgb(212, 226, 245)");
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
    ctx.fillStyle = shade;
    for (const p of all) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TWO_PI); ctx.fill(); }

    // 3. some bright spots on top, like the sun's hitting it
    g.fill(255, 255, 255, 90);
    for (const p of cloud.puffs) g.circle(p.x - p.r * 0.25, p.y - p.r * 0.3, p.r * 0.9);

    // 4. blur everything so you can't tell it's made of circles
    cloud.picture = createGraphics(w, h);
    cloud.picture.drawingContext.filter = "blur(3.5px)";
    cloud.picture.image(g, 0, 0);
    g.remove();
}

function drawCloud(cloud, seconds) {
    // tiny bit of swelling in and out, makes the sky feel alive
    const s = skyScale() / 1.25 * (1 + 0.015 * sin(seconds * 0.4 + cloud.id * 2));
    const w = cloud.picture.width * s, h = cloud.picture.height * s;
    push();
    if (selectedCloud === cloud) { // the clicked one glows yellow so you know which one you picked
        drawingContext.shadowColor = "rgba(255, 220, 120, 0.95)";
        drawingContext.shadowBlur = 35;
    }
    image(cloud.picture, cloud.x - w / 2, cloud.y - h / 2, w, h);
    pop();
}


// 6. HELPERS

// which cloud is the mouse on? checking the front ones first. null means it's just sky
function cloudAt(mx, my) {
    const s = skyScale();
    for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        if (c.puffs.some(p => dist(mx, my, c.x + p.x * s, c.y + p.y * s) < p.r * s)) return c;
    }
    return null;
}

// bigger clouds on a big screen, smaller on a small one
function skyScale() {
    return constrain(Math.min(width / 1100, height / 760), 0.7, 1.25);
}

// "seeded" random: same seed, same random numbers, every time.
// that's the trick that keeps each cloud the same shape for everyone
// (it's a common little generator called mulberry32, I didn't come up with the math)
function seededRandom(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
