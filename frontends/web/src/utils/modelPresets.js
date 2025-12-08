import {
    MODEL_ACTIVE_PRESET_STORAGE_KEY,
    MODEL_PRESET_STORAGE_KEY,
    SUGGESTION_MODEL_STORAGE_KEY,
} from "./constants";

export const MODEL_STAGES = [
    {
        key: "outline",
        label: "Outline",
        description: "Plans the section list.",
    },
    {
        key: "writer",
        label: "Writer",
        description: "Writes each section.",
    },
    {
        key: "editor",
        label: "Editor",
        description: "Edits prose into a transcript suitable for audio format.",
    },
];

export const MODEL_PRESET_ORDER = ["fast", "slower", "slowest"];

export const MODEL_PRESET_LABELS = {
    fast: "Fast",
    slower: "Slower",
    slowest: "Slowest",
};

export const MODEL_OPTIONS = [
    { value: "gpt-4.1-nano", label: "gpt-4.1-nano (fast)" },
    { value: "gpt-4o-mini", label: "gpt-4o-mini" },
    { value: "gpt-4o", label: "gpt-4o (slower, better)" },
    { value: "gpt-5-nano", label: "gpt-5-nano" },
];

export const DEFAULT_SUGGESTION_MODEL = "gpt-4.1-nano";

export const DEFAULT_STAGE_MODELS = {
    outline: "gpt-4.1-nano",
    writer: "gpt-4.1-nano",
    editor: "gpt-4.1-nano",
};

export const DEFAULT_MODEL_PRESETS = {
    fast: {
        ...DEFAULT_STAGE_MODELS,
    },
    slower: {
        ...DEFAULT_STAGE_MODELS,
        outline: "gpt-4o",
        writer: "gpt-4o",
        editor: "gpt-4o",
    },
    slowest: {
        ...DEFAULT_STAGE_MODELS,
        outline: "gpt-4o",
        writer: "gpt-4o",
        editor: "gpt-4o",
    },
};

export function normalizePreset(preset) {
    const safePreset = preset && typeof preset === "object" ? preset : {};
    const normalized = { ...DEFAULT_STAGE_MODELS };
    MODEL_STAGES.forEach((stage) => {
        const value = (safePreset[stage.key] || "").trim();
        normalized[stage.key] = value || DEFAULT_STAGE_MODELS[stage.key];
    });
    return normalized;
}

export function normalizeModelPresets(rawPresets) {
    const safePresets = rawPresets && typeof rawPresets === "object" ? rawPresets : {};
    const normalized = {};
    MODEL_PRESET_ORDER.forEach((presetKey) => {
        normalized[presetKey] = normalizePreset(safePresets[presetKey]);
    });
    return normalized;
}

export function loadModelPresets() {
    try {
        const raw = localStorage.getItem(MODEL_PRESET_STORAGE_KEY);
        if (!raw) return DEFAULT_MODEL_PRESETS;
        const parsed = JSON.parse(raw);
        return normalizeModelPresets(parsed);
    } catch (error) {
        console.warn("Failed to parse model presets", error);
        return DEFAULT_MODEL_PRESETS;
    }
}

export function persistModelPresets(presets) {
    localStorage.setItem(
        MODEL_PRESET_STORAGE_KEY,
        JSON.stringify(normalizeModelPresets(presets))
    );
}

export function loadActiveModelPreset(presets) {
    const available = presets || DEFAULT_MODEL_PRESETS;
    const stored = localStorage.getItem(MODEL_ACTIVE_PRESET_STORAGE_KEY);
    if (stored && available[stored]) {
        return stored;
    }
    if (available.fast) return "fast";
    return Object.keys(available)[0] || "fast";
}

export function persistActiveModelPreset(preset) {
    localStorage.setItem(MODEL_ACTIVE_PRESET_STORAGE_KEY, preset);
}

export function loadSuggestionModel() {
    const stored = localStorage.getItem(SUGGESTION_MODEL_STORAGE_KEY);
    return stored || DEFAULT_SUGGESTION_MODEL;
}

export function persistSuggestionModel(model) {
    const normalized = (model || "").trim();
    localStorage.setItem(
        SUGGESTION_MODEL_STORAGE_KEY,
        normalized || DEFAULT_SUGGESTION_MODEL
    );
}

export function buildModelsPayload(stageModels) {
    const normalized = normalizePreset(stageModels);
    const payload = {};
    MODEL_STAGES.forEach((stage) => {
        const modelName = (normalized[stage.key] || "").trim();
        payload[stage.key] = { model: modelName || DEFAULT_STAGE_MODELS[stage.key] };
    });
    return payload;
}
