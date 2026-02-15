const SUMMARY_MAX_LENGTH = 120;
const SUMMARY_MIN_SEARCH = 80;
const SUMMARY_MAX_CUTOFF = 160;
const SUMMARY_FALLBACK_LENGTH = 140;

export function summarizeReport(text) {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= SUMMARY_MAX_LENGTH) return clean;
    const cutoff = clean.indexOf(". ", SUMMARY_MIN_SEARCH);
    if (cutoff > 0 && cutoff < SUMMARY_MAX_CUTOFF) {
        return `${clean.slice(0, cutoff + 1)}…`;
    }
    return `${clean.slice(0, SUMMARY_FALLBACK_LENGTH)}…`;
}

export function cleanHeadingForTopic(heading) {
    const original = (heading || "").trim();
    if (!original) return "";
    let cleaned = original.replace(/^(section|chapter)\s+\d+\s*[:.)-]?\s*/i, "");
    cleaned = cleaned.replace(/^\d+\s*[:.)-]?\s*/, "");
    cleaned = cleaned.replace(/^(introduction|background)\s*[:.)-]?\s*/i, "");
    cleaned = cleaned.replace(/^[\-\u2022*]\s*/, "");
    cleaned = cleaned.trim();
    return cleaned || original;
}

export function parseTopicsList(value) {
    return (value || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
