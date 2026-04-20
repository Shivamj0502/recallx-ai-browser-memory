let errorOccurred = false;
let lastSentKey = null;

// COMMON SEND
function sendToBackend(payload) {
    const key = payload.url + payload.title + payload.content;

    if (key === lastSentKey) return;
    lastSentKey = key;

    fetch("http://localhost:5000/api/activity", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => console.log("Saved:", res))
    .catch(() => console.log("Send failed"));
}

// ignore unwanted pages
function shouldIgnorePage() {
    const url = window.location.href;

    if (url.includes("localhost:5000")) return true;
    if (url.startsWith("chrome://")) return true;

    return false;
}

// FILTER USELESS ERRORS
function isUsefulError(msg) {
    if (!msg) return false;

    const ignoreList = [
        "ResizeObserver loop",
        "Script error",
        "chrome-extension"
    ];

    return !ignoreList.some(x => msg.includes(x));
}

// ERROR SENDER
function sendError(msg) {
    if (shouldIgnorePage()) return;
    if (!isUsefulError(msg)) return;

    errorOccurred = true;

    sendToBackend({
        url: window.location.href,
        title: "Frontend Error",
        content: msg.slice(0, 300) // limit
    });
}

// runtime errors
window.onerror = function (message) {
    sendError(message);
};

// console errors
const originalError = console.error;

console.error = function (...args) {
    sendError(args.join(" "));
    originalError.apply(console, args);
};

// NORMAL DATA
setTimeout(() => {
    if (shouldIgnorePage() || errorOccurred) return;

    const content = document.body?.innerText?.trim();

    // HARD FILTER
    if (!content || content.length < 30) {
        console.log("❌ Skipped: content too small");
        return;
    }

    const payload = {
        url: window.location.href,
        title: document.title || "No Title",
        content: content.slice(0, 300)
    };

    sendToBackend(payload);

}, 1500);