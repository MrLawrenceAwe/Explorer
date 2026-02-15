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
