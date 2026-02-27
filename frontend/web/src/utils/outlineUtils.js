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

export function normalizeOutlineSections(outlineCandidate) {
    const sections = Array.isArray(outlineCandidate?.sections)
        ? outlineCandidate.sections
        : Array.isArray(outlineCandidate)
            ? outlineCandidate
            : [];
    const seen = new Set();
    return sections
        .map((section) => {
            const title = (section?.title || "").trim();
            if (!title) return null;
            const subsections = Array.isArray(section?.subsections)
                ? section.subsections.map((entry) => (entry || "").trim()).filter(Boolean)
                : [];
            return { title, subsections };
        })
        .filter((section) => {
            if (!section) return false;
            const key = section.title.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

export function validateOutlineJsonInput(outlineJsonInput) {
    const trimmedJsonInput = (outlineJsonInput || "").trim();
    if (!trimmedJsonInput) {
        return { trimmedJsonInput, sections: [], error: "" };
    }
    try {
        const parsed = JSON.parse(trimmedJsonInput);
        const sections = normalizeOutlineSections(parsed?.sections);
        if (!Array.isArray(parsed?.sections) || !parsed.sections.length || !sections.length) {
            return { trimmedJsonInput, sections: [], error: "JSON must include a sections array." };
        }
        const invalidSection = parsed.sections.find(
            (section) =>
                !section ||
                typeof section.title !== "string" ||
                !section.title.trim() ||
                !Array.isArray(section.subsections)
        );
        if (invalidSection) {
            return { trimmedJsonInput, sections: [], error: "Each JSON section needs a title." };
        }
        return { trimmedJsonInput, sections, error: "" };
    } catch (error) {
        console.error(error);
        return { trimmedJsonInput, sections: [], error: error.message || "Enter valid JSON." };
    }
}
