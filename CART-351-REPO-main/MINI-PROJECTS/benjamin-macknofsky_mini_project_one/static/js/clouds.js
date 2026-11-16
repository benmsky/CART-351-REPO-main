// CLOUD READING - clouds.js
// draws the sky and the clouds with p5.js
//
// sections:
//   1. settings
//   2. setup + draw (p5 runs these)
//   3. making a cloud (+ 3b. scattering them around the sky)
//   4. moving a cloud
//   5. drawing a cloud
//   6. clicking a cloud
//   7. little helpers


//*************************************************
// 1. SETTINGS

const NUM_CLOUDS = 7;   // how many clouds (has to match NUM_CLOUDS in app.py)
const MARGIN = 260;     // how far off screen a cloud goes before it loops back

// the slowest and fastest a cloud can drift (pixels per second)
const MIN_SPEED = 6;
const MAX_SPEED = 17;

// the random seed for where the clouds go (I tried a bunch and this one spreads them out nicely)
const SKY_SEED = 5;

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

    // make all the clouds, then scatter them around the sky
    for (let i = 0; i < NUM_CLOUDS; i++) {
        clouds.push(makeCloud(i));
    }
    scatterClouds(SKY_SEED);
    // small (far away) clouds first, so the big ones get drawn on top
    clouds.sort((a, b) => a.depth - b.depth);

    // paint each cloud once (see paintCloud in section 5)
    for (const cloud of clouds) {
        paintCloud(cloud);
    }
}

function draw() {
    clear(); // see-through canvas so the blue sky from the css shows

    // using the real clock means everyone sees the same sky at the same time
    const seconds = Date.now() / 1000;
    for (const cloud of clouds) {
        updatePosition(cloud, seconds);
        drawCloud(cloud, seconds);
    }

    // everyone's readings floating around the clouds (in whispers.js)
    drawWhispers(seconds);

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
//
// there are 6 kinds of cloud so the sky has a real mix:
//   big       - a huge billowy one
//   long      - a long thin streak
//   tower     - tall and stacked up
//   creature  - a lumpy body with "limbs" (could be a neck, tail, ear, arm... or nothing)
//   scattered - a few chunky clumps broken apart
// all random, so they kind of look like something but never one thing. people fill in the rest

// which kind each cloud is (cloud 0 is a creature, cloud 1 is big, etc.)
const KINDS = ["creature", "big", "long", "tower", "creature", "scattered", "big"];

// the biggest each kind can be [width, height] before it gets shrunk down,
// and how much its size can change [smallest, biggest]
const KIND_SIZES = {
    big:       { max: [460, 190], size: [0.92, 1.05] },
    long:      { max: [480, 105], size: [0.9, 1.05] },
    tower:     { max: [250, 230], size: [0.92, 1.05] },
    creature:  { max: [400, 185], size: [0.88, 1.05] },
    scattered: { max: [440, 135], size: [0.9, 1.05] }
};

function makeCloud(id) {
    const rand = seededRandom(id * 9973 + 17);
    const kind = KINDS[id];
    let puffs = [];

    if (kind === "big") {
        // lots of big puffs bunched together, with bumps all over the top
        addBody(puffs, rand, 9, 14, 95, 24, 42, 72);
        addLumps(puffs, rand, 5, 9);
    } else if (kind === "long") {
        // a long line of puffs, fattest in the middle and thinner at the ends
        const count = Math.floor(between(rand, 18, 26));
        for (let i = 0; i < count; i++) {
            const along = i / (count - 1) * 2 - 1;          // -1 at one end, 1 at the other
            const fat = 1 - Math.abs(along) * 0.5;          // thinner towards the ends
            puffs.push(makePuff(rand, along * 190 + between(rand, -6, 6), between(rand, -12, 8), between(rand, 28, 44) * fat));
        }
    } else if (kind === "tower") {
        // a wide base, then puffs stacked up on top of each other, leaning a bit
        addBody(puffs, rand, 3, 5, 60, 8, 40, 55);
        let x = 0, y = -26, r = between(rand, 42, 52);
        const lean = between(rand, -10, 10);
        const levels = Math.floor(between(rand, 4, 7));
        for (let i = 0; i < levels; i++) {
            puffs.push(makePuff(rand, x, y, r));
            puffs.push(makePuff(rand, x + between(rand, -r, r) * 0.6, y + between(rand, -8, 8), r * 0.7)); // a side bump
            x += lean + between(rand, -8, 8);
            y -= r * 0.75;
            r *= between(rand, 0.84, 0.95);
        }
    } else if (kind === "creature") {
        // a big lumpy body with 2 to 4 chunky limbs growing out of it
        addBody(puffs, rand, 4, 8, 60, 20, 36, 58);
        addLimbs(puffs, rand, 2, 5);
        addLumps(puffs, rand, 2, 5);
    } else {
        // scattered: 3 or 4 chunky clumps in a loose line, like a cloud that's breaking up
        const clumps = Math.floor(between(rand, 3, 5));
        for (let i = 0; i < clumps; i++) {
            const cx = (i - (clumps - 1) / 2) * between(rand, 95, 115);
            const cy = between(rand, -22, 22);
            const count = Math.floor(between(rand, 4, 7));
            for (let j = 0; j < count; j++) {
                puffs.push(makePuff(rand, cx + between(rand, -26, 26), cy + between(rand, -12, 8), between(rand, 22, 38)));
            }
        }
    }

    // find the edges of the cloud so we can centre it
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of puffs) {
        minX = Math.min(minX, p.x - p.r);
        maxX = Math.max(maxX, p.x + p.r);
        minY = Math.min(minY, p.y - p.r);
        maxY = Math.max(maxY, p.y + p.r);
    }

    // shrink it if it's too big for its kind, then give it a random size
    const limits = KIND_SIZES[kind];
    const fit = Math.min(1, limits.max[0] / (maxX - minX), limits.max[1] / (maxY - minY));
    const size = fit * between(rand, limits.size[0], limits.size[1]);

    // centre it on its own middle and apply the size
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    for (const p of puffs) {
        p.x = (p.x - midX) * size;
        p.y = (p.y - midY) * size;
        p.r = p.r * size;
    }

    return {
        id: id,
        kind: kind,
        puffs: puffs,
        depth: size,                      // bigger clouds get drawn in front
        width: (maxX - minX) * size,
        height: (maxY - minY) * size,
        speed: 0,                         // these 3 get picked in scatterClouds()
        heightFrac: 0,                    // how high up (0 = top of the screen)
        startFrac: 0,                     // where it starts across the sky
        x: 0,
        y: 0
    };
}


//*************************************************
// 3b. SCATTERING THE CLOUDS
// every cloud gets a random height, speed and starting spot
// the only rule: if two clouds are at the same height, they have to drift at the same speed,
// otherwise the faster one would catch up and crash into the other one.
// clouds at different heights can have whatever speed they want

// a cloud's height and width as fractions of the sky
// (the numbers are safe guesses that work on small and big screens, see skyScale())
function tallness(c) { return (c.height + 10) / 590; }
function wideness(c) { return (c.width + 50) / 1500; }

function scatterClouds(seed) {
    const rand = seededRandom(seed);
    const placed = [];

    // biggest clouds first, they're the hardest to fit
    const order = clouds.slice().sort((a, b) => b.height - a.height);

    for (const c of order) {
        // try to fit it, and shrink it a little each time it doesn't fit
        // (but only a few times, otherwise it could keep trying forever and freeze the page)
        let fits = placeCloud(c, placed, rand);
        for (let shrinks = 0; !fits && shrinks < 8; shrinks++) {
            shrinkCloud(c, 0.9);
            fits = placeCloud(c, placed, rand);
        }
        if (fits) placed.push(c);
    }

    // any cloud that still didn't fit gets left out of the sky, so nothing ever overlaps
    // (with SKY_SEED set right, every cloud fits and this never happens)
    clouds = placed;

    // now spread out the clouds that share a speed, with random gaps so they never touch
    const speeds = [...new Set(clouds.map(c => c.speed))];
    for (const speed of speeds) {
        const group = clouds.filter(c => c.speed === speed);
        const room = 1 - group.reduce((total, c) => total + wideness(c), 0);
        const gaps = group.map(() => between(rand, 0.2, 1));
        const gapTotal = gaps.reduce((a, b) => a + b, 0);

        let pos = rand(); // start somewhere random
        group.forEach(function (c, i) {
            c.startFrac = pos + wideness(c) / 2;
            pos += wideness(c) + room * gaps[i] / gapTotal;
        });
    }
}

// tries to find a height + speed for one cloud. gives back true if it found one
function placeCloud(c, placed, rand) {
    const half = tallness(c) / 2;
    // which clouds would it be level with at height y?
    const levelWith = y => placed.filter(o => Math.abs(o.heightFrac - y) < half + tallness(o) / 2);

    // 1st choice: a height where it's not level with anyone, so it gets its own speed
    for (let tries = 0; tries < 300; tries++) {
        const y = between(rand, half - 0.07, 0.85 - half); // on screen and above the grass
        if (levelWith(y).length === 0) {
            c.heightFrac = y;
            c.speed = newSpeed(placed, rand);
            return true;
        }
    }

    // 2nd choice: share a height with clouds that all have the same speed (and match it)
    for (let tries = 0; tries < 300; tries++) {
        const y = between(rand, half - 0.07, 0.85 - half);
        const level = levelWith(y);

        // (if this spot happens to be empty after all, just take it with its own speed)
        if (level.length === 0) {
            c.heightFrac = y;
            c.speed = newSpeed(placed, rand);
            return true;
        }

        const speed = level[0].speed;
        if (!level.every(o => o.speed === speed)) continue;

        // there has to be room across the sky for it and the others at that speed
        const used = placed.filter(o => o.speed === speed)
                           .reduce((total, o) => total + wideness(o), wideness(c));
        if (used > 0.85) continue;

        c.heightFrac = y;
        c.speed = speed;
        return true;
    }

    return false; // no luck, it'll get shrunk and try again
}

// picks a speed that's clearly different from the other speeds already in the sky
// (so you can actually see the clouds drifting at different speeds)
function newSpeed(placed, rand) {
    let speed = between(rand, MIN_SPEED, MAX_SPEED);
    for (let tries = 0; tries < 50; tries++) {
        if (placed.every(o => Math.abs(o.speed - speed) > 1.2)) break;
        speed = between(rand, MIN_SPEED, MAX_SPEED);
    }
    return speed;
}

// makes a cloud a bit smaller (used when it can't find a spot)
function shrinkCloud(c, amount) {
    for (const p of c.puffs) {
        p.x *= amount;
        p.y *= amount;
        p.r *= amount;
    }
    c.width *= amount;
    c.height *= amount;
    c.depth *= amount;
}

// one puff: where it is, how big, and a random starting point for its breathing
function makePuff(rand, x, y, r) {
    return { x: x, y: y, r: r, phase: rand() * Math.PI * 2 };
}

// a body: some puffs bunched together
// (how many, how wide, how tall, and how small/big the puffs are)
function addBody(puffs, rand, minCount, maxCount, wide, tall, minR, maxR) {
    const count = Math.floor(between(rand, minCount, maxCount));
    for (let i = 0; i < count; i++) {
        puffs.push(makePuff(rand, between(rand, -wide, wide), between(rand, -tall, tall * 0.6), between(rand, minR, maxR)));
    }
}

// limbs: lines of puffs growing out of the body that get smaller and bend a little
function addLimbs(puffs, rand, minCount, maxCount) {
    const body = puffs.slice(); // only grow limbs out of the body, not out of other limbs
    const count = Math.floor(between(rand, minCount, maxCount));
    for (let i = 0; i < count; i++) {
        const start = body[Math.floor(rand() * body.length)];
        // point it up or sideways, sometimes a little down (negative y is up in p5)
        let angle = between(rand, Math.PI * 0.85, Math.PI * 2.15);
        let r = between(rand, 26, 40);
        let x = start.x + Math.cos(angle) * start.r * 0.9;
        let y = start.y + Math.sin(angle) * start.r * 0.9;
        const length = Math.floor(between(rand, 3, 6));

        for (let j = 0; j < length; j++) {
            puffs.push(makePuff(rand, x, Math.min(y, 30), r));
            angle += between(rand, -0.5, 0.5);
            x += Math.cos(angle) * r * 1.05;
            y += Math.sin(angle) * r * 1.05;
            r *= between(rand, 0.78, 0.94);
        }
    }
}

// small bumps on top of the body so it isn't perfectly smooth
function addLumps(puffs, rand, minCount, maxCount) {
    const body = puffs.slice();
    const count = Math.floor(between(rand, minCount, maxCount));
    for (let i = 0; i < count; i++) {
        const base = body[Math.floor(rand() * body.length)];
        puffs.push(makePuff(rand, base.x + between(rand, -20, 20), base.y - base.r * 0.6, between(rand, 12, 22)));
    }
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

// to make the clouds really fluffy they need a LOT of soft circles and blur,
// which is too slow to draw 60 times a second. so each cloud gets painted once
// onto its own hidden picture (paintCloud), and then every frame we just move that picture around

const PAINT_SCALE = 1.25;  // paint them at the biggest size they'll ever be shown, so they stay sharp
const PAINT_PAD = 50;      // extra room around the edges for the blur

function paintCloud(cloud) {
    const rand = seededRandom(cloud.id * 31 + 5);

    // fluff: lots of little circles around the top and sides of every puff
    // (not the bottom, real clouds are flatter underneath)
    const fluff = [];
    for (const p of cloud.puffs) {
        const count = Math.floor(between(rand, 5, 9));
        for (let i = 0; i < count; i++) {
            const angle = between(rand, Math.PI * 0.95, Math.PI * 2.05);
            const r = p.r * between(rand, 0.32, 0.55);
            fluff.push({ x: p.x + Math.cos(angle) * p.r * 0.78, y: p.y + Math.sin(angle) * p.r * 0.78, r: r });
        }
    }
    const everything = cloud.puffs.concat(fluff);

    // how big the picture needs to be
    const w = Math.ceil((cloud.width + PAINT_PAD * 2) * PAINT_SCALE);
    const h = Math.ceil((cloud.height + PAINT_PAD * 2) * PAINT_SCALE);
    const g = createGraphics(w, h);
    const ctx = g.drawingContext;
    g.noStroke();
    g.translate(w / 2, h / 2);
    g.scale(PAINT_SCALE);

    // 1. a soft blue-grey shadow, a bit lower down, for the underside
    ctx.shadowBlur = 16;
    ctx.shadowColor = "rgba(150, 175, 215, 0.7)";
    g.fill(175, 195, 228);
    for (const p of everything) g.circle(p.x, p.y + p.r * 0.3, p.r * 2);

    // 2. the main cloud, white at the top fading to a soft blue at the bottom
    const shade = ctx.createLinearGradient(0, -cloud.height / 2, 0, cloud.height / 2);
    shade.addColorStop(0, "rgb(255, 255, 255)");
    shade.addColorStop(0.55, "rgb(250, 252, 255)");
    shade.addColorStop(1, "rgb(212, 226, 245)");
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
    for (const p of everything) {
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. bright highlights on the top left of the puffs, like the sun is hitting them
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 255, 255, 1)";
    g.fill(255, 255, 255, 90);
    for (const p of cloud.puffs) g.circle(p.x - p.r * 0.25, p.y - p.r * 0.3, p.r * 0.9);

    // 4. soften the whole thing with a blur so there are no hard circle edges
    const soft = createGraphics(w, h);
    soft.drawingContext.filter = "blur(3.5px)";
    soft.image(g, 0, 0);
    g.remove(); // don't need the sharp one anymore

    cloud.picture = soft;
}

function drawCloud(cloud, seconds) {
    const s = skyScale() / PAINT_SCALE;
    // the whole cloud swells and shrinks a tiny bit so the sky feels alive
    const swell = 1 + 0.015 * Math.sin(seconds * 0.4 + cloud.id * 2);
    const w = cloud.picture.width * s * swell;
    const h = cloud.picture.height * s * swell;

    push();
    // the cloud you clicked glows yellow so you know which one you picked
    if (selectedCloud === cloud) {
        drawingContext.shadowColor = "rgba(255, 220, 120, 0.95)";
        drawingContext.shadowBlur = 35;
    }
    image(cloud.picture, cloud.x - w / 2, cloud.y - h / 2, w, h);
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

// cloud size based on the screen: full size on a big screen, smaller on a small one
// (it checks the height too, so the rows still fit on short wide laptop screens)
function skyScale() {
    return constrain(Math.min(width / 1100, height / 760), 0.7, 1.25);
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
