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

// IGNORE PAGES
function shouldIgnorePage() {
    const url = window.location.href;

    if (url.includes("localhost:5000")) return true;
    if (url.startsWith("chrome://")) return true;

    //  ignore google search
    if (url.includes("google.com/search")) return true;

    return false;
}

// DETECT TYPE
function detectType(url) {
    if (url.includes("youtube.com/watch")) return "youtube";
    return "blog";
}

// CLEAN TITLE
function getCleanTitle() {
    let title = document.title || "No Title";

    if (window.location.href.includes("youtube.com")) {
        title = title.replace(" - YouTube", "");
    }

    return title;
}

// SMART CONTENT
function getContent() {
    const url = window.location.href;

    // YOUTUBE → only video title
    if (url.includes("youtube.com/watch")) {
        return document.querySelector("h1")?.innerText || getCleanTitle();
    }

    // BLOG → normal text
    const content = document.body?.innerText?.trim();
    return content ? content.slice(0, 2000) : "";
}

// ERROR FILTER
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
        content: msg.slice(0, 300),
        type: "error"
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

// MAIN CAPTURE
function captureAndSend() {
    if (shouldIgnorePage() || errorOccurred) return;

    const url = window.location.href;

    // ignore youtube homepage
    if (url.includes("youtube.com") && !url.includes("watch")) {
        console.log("Skipped: not a video page");
        return;
    }

    const content = getContent();

    if (!content || content.length < 20) {
        console.log("Skipped: content too small");
        return;
    }

    const payload = {
        url,
        title: getCleanTitle(),
        content,
        type: detectType(url)
    };

    console.log("Sending:", payload);

    sendToBackend(payload);
}

// INITIAL LOAD
setTimeout(captureAndSend, 1500);

// SPA FIX (YouTube etc)
let lastUrl = location.href;

new MutationObserver(() => {
    const url = location.href;

    if (url !== lastUrl) {
        lastUrl = url;
        console.log("URL changed:", url);

        setTimeout(captureAndSend, 1500);
    }
}).observe(document, { subtree: true, childList: true });