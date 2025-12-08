export const DEFAULT_OUTLINE_JSON = JSON.stringify(
    {
        sections: [
            {
                title: "Introduction",
                subsections: ["Hook", "Background", "Thesis"],
            },
        ],
    },
    null,
    2
);

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

export function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

export function createEmptyOutlineSection() {
    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: "",
        subsections: [""],
    };
}

export function buildOutlineGeneratePayload(topic, sections, models) {
    const payload = {
        mode: "generate_report",
        return: "report_with_outline",
        outline: {
            report_title: topic,
            sections: sections.map((section) => ({
                title: section.title,
                subsections: section.subsections,
            })),
        },
    };
    if (models) {
        payload.models = models;
    }
    return payload;
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

export function downloadTextFile(text, filename = "report.md") {
    const safeText = text || "";
    if (!safeText) return;
    const blob = new Blob([safeText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function copyTextToClipboard(text) {
    const safeText = text || "";
    if (!safeText) return false;

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(safeText);
        return true;
    }

    if (typeof document === "undefined") {
        throw new Error("Clipboard unavailable");
    }

    const textarea = document.createElement("textarea");
    textarea.value = safeText;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!success) {
        throw new Error("Copy command failed");
    }

    return true;
}
