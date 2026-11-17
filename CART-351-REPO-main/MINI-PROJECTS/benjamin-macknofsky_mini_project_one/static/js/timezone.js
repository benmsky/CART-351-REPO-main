// CLOUD READING - timezone.js
// start button opens the time zone window, and the clock shows the time wherever you pick
//
// sections:
//   1. setup + the list of time zones
//   2. the clock
//   3. opening + closing the window
//   4. filling in the list


// 1. SETUP + THE LIST OF TIME ZONES

const tzWindow = document.getElementById("timezone");
const tzSelect = document.getElementById("timezone-select");
const tzPreview = document.getElementById("timezone-preview");
const startButton = document.getElementById("start-button");

// whatever time zone the computer says you're in
const MY_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// the list: [the real name, the name people actually know]
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

// remembers what you picked last time, otherwise uses yours
let shownZone = localStorage.getItem("cloudReadingZone") || MY_ZONE;


// 2. THE CLOCK

// the time somewhere, like "3:07 PM"
function timeIn(zone) {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: zone });
}

// the "UTC-05:00" part
function offsetOf(zone) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date());
    const name = parts.find(p => p.type === "timeZoneName").value; // comes back as "GMT-05:00", or just "GMT" when it's 0
    return name === "GMT" ? "UTC+00:00" : name.replace("GMT", "UTC");
}

// taskbar clock, updates every 10 seconds
function updateClock() {
    const clock = document.getElementById("clock");
    clock.textContent = timeIn(shownZone);
    clock.title = shownZone; // hover it to see which time zone
}
updateClock();
setInterval(updateClock, 10000);


// 3. OPENING + CLOSING THE WINDOW

function openTimezone() {
    fillZones(); // refresh the times
    tzSelect.value = shownZone;
    showPreview();
    tzWindow.classList.add("open");
    startButton.classList.add("pressed");
}

function closeTimezone() {
    tzWindow.classList.remove("open");
    startButton.classList.remove("pressed");
}

// start button toggles it
startButton.addEventListener("click", function () {
    if (tzWindow.classList.contains("open")) {
        closeTimezone();
    } else {
        openTimezone();
    }
});

// OK saves it, cancel and X just close
document.getElementById("timezone-ok").addEventListener("click", function () {
    shownZone = tzSelect.value;
    localStorage.setItem("cloudReadingZone", shownZone);
    updateClock();
    closeTimezone();
});
document.getElementById("timezone-cancel").addEventListener("click", closeTimezone);
document.getElementById("timezone-close").addEventListener("click", closeTimezone);

// shows the time there before you hit OK
tzSelect.addEventListener("change", showPreview);

function showPreview() {
    tzPreview.textContent = "It's " + timeIn(tzSelect.value) + " there right now.";
}


// 4. FILLING IN THE LIST

function fillZones() {
    // your time zone goes at the top
    // (and if yours isn't in the list it still gets added)
    const list = ZONES.slice();
    if (!list.some(z => z[0] === MY_ZONE)) list.unshift([MY_ZONE, MY_ZONE.replace(/_/g, " ")]);
    if (!list.some(z => z[0] === shownZone)) list.unshift([shownZone, shownZone.replace(/_/g, " ")]);

    tzSelect.innerHTML = "";
    for (const [zone, name] of list) {
        const option = document.createElement("option");
        option.value = zone;
        // "(UTC-05:00) Eastern Time..." the same way xp did it
        option.textContent = "(" + offsetOf(zone) + ") " + name + (zone === MY_ZONE ? " (yours)" : "");
        tzSelect.appendChild(option);
    }

    const mine = list.find(z => z[0] === MY_ZONE);
    document.getElementById("timezone-detected").textContent = "Your computer says: " + mine[1] + ".";
}
