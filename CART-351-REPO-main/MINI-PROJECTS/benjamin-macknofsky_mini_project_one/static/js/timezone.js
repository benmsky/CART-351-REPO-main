// CLOUD READING - timezone.js
// the start button opens a "Time Zone" window that asks what time zone you're in,
// and lets you swap to a different one. the clock in the taskbar shows the time there.
//
// sections:
//   1. setup + the list of time zones
//   2. the clock
//   3. opening + closing the window
//   4. filling in the list


//**
// 1. SETUP + THE LIST OF TIME ZONES

const tzWindow = document.getElementById("timezone");
const tzSelect = document.getElementById("timezone-select");
const tzPreview = document.getElementById("timezone-preview");
const startButton = document.getElementById("start-button");

// the time zone your computer says you're in, like "America/Toronto"
const MY_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// time zones you can swap to: [the real name, a nicer name to show]
const ZONES = [
    ["Pacific/Honolulu", "Hawaii"],
    ["America/Anchorage", "Alaska"],
    ["America/Los_Angeles", "Pacific Time (Vancouver, Los Angeles)"],
    ["America/Denver", "Mountain Time (Calgary, Denver)"],
    ["America/Chicago", "Central Time (Winnipeg, Chicago)"],
    ["America/Toronto", "Eastern Time (Montreal, Toronto, New York)"],
    ["America/Halifax", "Atlantic Time (Halifax)"],
    ["America/St_Johns", "Newfoundland"],
    ["America/Sao_Paulo", "Brasilia"],
    ["Atlantic/Reykjavik", "Reykjavik"],
    ["Europe/London", "London, Dublin, Lisbon"],
    ["Europe/Paris", "Paris, Berlin, Rome"],
    ["Africa/Cairo", "Cairo"],
    ["Europe/Istanbul", "Istanbul"],
    ["Asia/Dubai", "Dubai"],
    ["Asia/Kolkata", "India"],
    ["Asia/Bangkok", "Bangkok, Jakarta"],
    ["Asia/Shanghai", "Beijing, Hong Kong, Singapore"],
    ["Asia/Tokyo", "Tokyo, Seoul"],
    ["Australia/Sydney", "Sydney, Melbourne"],
    ["Pacific/Auckland", "Auckland"]
];

// the time zone the clock is showing right now
// (it remembers what you picked last time, otherwise it uses your computer's)
let shownZone = localStorage.getItem("cloudReadingZone") || MY_ZONE;


//**
// 2. THE CLOCK

// the time in a time zone, like "3:07 PM"
function timeIn(zone) {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: zone });
}

// the offset from UTC for a time zone right now, like "UTC-05:00"
function offsetOf(zone) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date());
    const name = parts.find(p => p.type === "timeZoneName").value; // like "GMT-05:00" ("GMT" when it's 0)
    return name === "GMT" ? "UTC+00:00" : name.replace("GMT", "UTC");
}

// the taskbar clock, checked every 10 seconds
function updateClock() {
    const clock = document.getElementById("clock");
    clock.textContent = timeIn(shownZone);
    clock.title = shownZone; // hover over the clock to see which time zone it is
}
updateClock();
setInterval(updateClock, 10000);


//**
// 3. OPENING + CLOSING THE WINDOW

function openTimezone() {
    fillZones(); // refresh the times in the list
    tzSelect.value = shownZone;
    showPreview();
    tzWindow.classList.add("open");
    startButton.classList.add("pressed");
}

function closeTimezone() {
    tzWindow.classList.remove("open");
    startButton.classList.remove("pressed");
}

// the start button opens and closes it
startButton.addEventListener("click", function () {
    if (tzWindow.classList.contains("open")) {
        closeTimezone();
    } else {
        openTimezone();
    }
});

// OK saves the time zone you picked, Cancel and the X just close it
document.getElementById("timezone-ok").addEventListener("click", function () {
    shownZone = tzSelect.value;
    localStorage.setItem("cloudReadingZone", shownZone);
    updateClock();
    closeTimezone();
});
document.getElementById("timezone-cancel").addEventListener("click", closeTimezone);
document.getElementById("timezone-close").addEventListener("click", closeTimezone);

// picking a different one shows what time it is there before you hit OK
tzSelect.addEventListener("change", showPreview);

function showPreview() {
    tzPreview.textContent = "It's " + timeIn(tzSelect.value) + " there right now.";
}


//**
// 4. FILLING IN THE LIST

function fillZones() {
    // your computer's time zone goes at the top, then the rest
    // (if yours isn't in the list, it still gets added at the top)
    const list = ZONES.slice();
    if (!list.some(z => z[0] === MY_ZONE)) list.unshift([MY_ZONE, MY_ZONE.replace(/_/g, " ")]);
    if (!list.some(z => z[0] === shownZone)) list.unshift([shownZone, shownZone.replace(/_/g, " ")]);

    tzSelect.innerHTML = "";
    for (const [zone, name] of list) {
        const option = document.createElement("option");
        option.value = zone;
        // like "(UTC-05:00) Eastern Time (Montreal, Toronto, New York)", the way xp shows them
        option.textContent = "(" + offsetOf(zone) + ") " + name + (zone === MY_ZONE ? " (yours)" : "");
        tzSelect.appendChild(option);
    }

    const mine = list.find(z => z[0] === MY_ZONE);
    document.getElementById("timezone-detected").textContent = "Your computer says: " + mine[1] + ".";
}
