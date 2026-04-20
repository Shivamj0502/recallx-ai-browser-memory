function extractTimeFilter(query) {
    const now = new Date();
    query = query.toLowerCase();

    // TODAY
    if (query.includes("today")) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return { $gte: start };
    }

    // YESTERDAY (full day)
    if (query.includes("yesterday")) {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);

        return { $gte: start, $lte: end };
    }

    // 2 DAYS AGO
    if (query.includes("2 days ago")) {
        const start = new Date();
        start.setDate(start.getDate() - 2);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() - 2);
        end.setHours(23, 59, 59, 999);

        return { $gte: start, $lte: end };
    }

    // LAST WEEK
    if (query.includes("last week")) {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { $gte: start };
    }

    return null;
}

module.exports = extractTimeFilter;