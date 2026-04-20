function detectType(url) {
    if (url.includes("youtube.com")) return "youtube";

    if (
        url.includes("medium.com") ||
        url.includes("dev.to") ||
        url.includes("blog") ||
        url.includes("docs")
    ) {
        return "blog";
    }

    return "other";
}

module.exports = detectType;