import { useState, useCallback, useMemo } from 'react';
import {
    createEmptyOutlineSection,
    DEFAULT_OUTLINE_JSON,
    buildOutlineGeneratePayload,
    normalizeOutlineSections,
    parseTopicsList,
    validateOutlineJsonInput,
} from '../utils/text';

export function buildOutlinePayload({
    topicText,
    outlineInputMode,
    outlineSections,
    jsonValidation,
    models,
    avoidTopics,
    includeTopics,
}) {
    let outlineBrief = "";
    let userSummary = "";
    let outlineGeneratePayload = null;

    const subject_exclusions = parseTopicsList(avoidTopics);
    const subject_inclusions = parseTopicsList(includeTopics);

    if (outlineInputMode === "lines") {
        const normalizedSections = normalizeOutlineSections(outlineSections);
        if (!normalizedSections.length) {
            return { error: "Add at least one section." };
        }
        outlineBrief = [
            `Outline topic: ${topicText}`,
            "Structure:",
            normalizedSections
                .map(
                    (section) =>
                        `${section.title}\n${section.subsections
                            .map((entry) => `- ${entry}`)
                            .join("\n")}`
                )
                .join("\n\n"),
        ].join("\n\n");
        userSummary = outlineBrief;
        outlineGeneratePayload = buildOutlineGeneratePayload(
            topicText,
            normalizedSections,
            models
        );
        outlineGeneratePayload.subject_exclusions = subject_exclusions;
        outlineGeneratePayload.subject_inclusions = subject_inclusions;
    } else {
        const { trimmedJsonInput, sections, error } = jsonValidation || {};
        if (!trimmedJsonInput) {
            return { error: "Paste JSON with sections and subsections." };
        }
        if (error) {
            return { error };
        }
        if (!sections.length) {
            return { error: "JSON must include a sections array." };
        }
        outlineBrief = `Outline topic: ${topicText}\n\nUse this JSON:\n${trimmedJsonInput}`;
        userSummary = outlineBrief;
        outlineGeneratePayload = buildOutlineGeneratePayload(
            topicText,
            sections,
            models
        );
        outlineGeneratePayload.subject_exclusions = subject_exclusions;
        outlineGeneratePayload.subject_inclusions = subject_inclusions;
    }

    return {
        payload: outlineGeneratePayload,
        userSummary,
        error: null,
    };
}

export function useOutlineForm({ isRunning, appendMessage, removeMessages, onGenerate, models }) {
    const [outlineTopic, setOutlineTopic] = useState("");
    const [outlineInputMode, setOutlineInputMode] = useState("lines");
    const [outlineSections, setOutlineSections] = useState(() => [
        createEmptyOutlineSection(),
    ]);
    const [outlineJsonInput, setOutlineJsonInput] = useState(DEFAULT_OUTLINE_JSON);
    const [outlineError, setOutlineError] = useState("");
    const [avoidTopics, setAvoidTopics] = useState("");
    const [includeTopics, setIncludeTopics] = useState("");

    const jsonValidation = useMemo(
        () => validateOutlineJsonInput(outlineJsonInput),
        [outlineJsonInput]
    );

    const jsonValidationError = outlineInputMode === "json" ? jsonValidation.error : "";
    const trimmedJsonInput = jsonValidation.trimmedJsonInput;
    const normalizedOutlineTopic = outlineTopic.trim();
    const lineModeValidity = outlineSections.every((section) => section.title.trim());
    const isLineModeValid = Boolean(normalizedOutlineTopic && lineModeValidity);
    const isJsonModeValid = Boolean(normalizedOutlineTopic && trimmedJsonInput && !jsonValidationError);
    const isOutlineFormValid = outlineInputMode === "lines" ? isLineModeValid : isJsonModeValid;

    const clearOutlineError = useCallback(() => setOutlineError(""), []);

    const updateSections = useCallback(
        (updater) => {
            clearOutlineError();
            setOutlineSections((current) => updater(current));
        },
        [clearOutlineError, setOutlineSections]
    );

    const resetOutlineForm = useCallback(() => {
        clearOutlineError();
        setOutlineTopic("");
        setOutlineSections([createEmptyOutlineSection()]);
        setOutlineJsonInput(DEFAULT_OUTLINE_JSON);
        setAvoidTopics("");
        setIncludeTopics("");
    }, [clearOutlineError]);

    const handleAddOutlineSection = useCallback(() => {
        updateSections((current) => [...current, createEmptyOutlineSection()]);
    }, [updateSections]);

    const handleRemoveOutlineSection = useCallback((sectionId) => {
        updateSections((current) =>
            current.length === 1
                ? current
                : current.filter((section) => section.id !== sectionId)
        );
    }, [updateSections]);

    const handleOutlineSectionTitleChange = useCallback((sectionId, value) => {
        updateSections((current) =>
            current.map((section) =>
                section.id === sectionId ? { ...section, title: value } : section
            )
        );
    }, [updateSections]);

    const handleOutlineSubsectionChange = useCallback((sectionId, index, value) => {
        updateSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section;
                const updated = [...section.subsections];
                updated[index] = value;
                return { ...section, subsections: updated };
            })
        );
    }, [updateSections]);

    const handleAddSubsectionLine = useCallback((sectionId) => {
        updateSections((current) =>
            current.map((section) =>
                section.id === sectionId
                    ? { ...section, subsections: [...section.subsections, ""] }
                    : section
            )
        );
    }, [updateSections]);

    const handleRemoveSubsectionLine = useCallback((sectionId, index) => {
        updateSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section;
                const updated = section.subsections.filter((_, idx) => idx !== index);
                return { ...section, subsections: updated };
            })
        );
    }, [updateSections]);

    const appendOutlineMessages = useCallback(
        (assistantId, userSummary, topicText) => {
            appendMessage({
                id: `${assistantId}-user`,
                role: "user",
                content: userSummary,
                variant: "outline",
            });
            appendMessage({
                id: assistantId,
                role: "assistant",
                content: "",
                variant: "outline",
                reportTopic: topicText,
            });
        },
        [appendMessage]
    );

    const handleOutlineSubmit = useCallback(
        async (event) => {
            event.preventDefault();
            if (isRunning) return;

            const topicText = outlineTopic.trim();
            if (!topicText) {
                setOutlineError("Add a topic first.");
                return;
            }

            const { payload, userSummary, error } = buildOutlinePayload({
                topicText,
                outlineInputMode,
                outlineSections,
                jsonValidation,
                models,
                avoidTopics,
                includeTopics,
            });

            if (error) {
                setOutlineError(error);
                return;
            }

            if (!payload) {
                setOutlineError("Unable to prepare the outline request.");
                return;
            }

            const assistantId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            appendOutlineMessages(assistantId, userSummary, topicText);
            setOutlineError("");

            let wasSuccessful = true;
            try {
                if (onGenerate) {
                    wasSuccessful = await onGenerate(payload, assistantId, topicText);
                }
            } catch (generateError) {
                console.error(generateError);
                setOutlineError(generateError.message || "Unable to prepare the outline request.");
                wasSuccessful = false;
            }

            if (!wasSuccessful && removeMessages) {
                setOutlineError((current) => current || "Report generation did not finish.");
                removeMessages([`${assistantId}-user`, assistantId]);
            }
        },
        [
            isRunning,
            outlineInputMode,
            jsonValidation,
            outlineSections,
            outlineTopic,
            onGenerate,
            models,
            avoidTopics,
            includeTopics,
            appendOutlineMessages,
            removeMessages,
        ]
    );

    const setOutlineTopicSafe = useCallback((value) => {
        clearOutlineError();
        setOutlineTopic(value);
    }, [clearOutlineError]);

    const setOutlineInputModeSafe = useCallback((value) => {
        clearOutlineError();
        setOutlineInputMode(value);
    }, [clearOutlineError]);

    const setOutlineJsonInputSafe = useCallback((value) => {
        clearOutlineError();
        setOutlineJsonInput(value);
    }, [clearOutlineError]);

    return {
        outlineTopic,
        setOutlineTopic: setOutlineTopicSafe,
        outlineInputMode,
        setOutlineInputMode: setOutlineInputModeSafe,
        outlineSections,
        setOutlineSections,
        outlineJsonInput,
        setOutlineJsonInput: setOutlineJsonInputSafe,
        outlineError,
        setOutlineError,
        trimmedJsonInput,
        jsonValidationError,
        isOutlineFormValid,
        resetOutlineForm,
        handleAddOutlineSection,
        handleRemoveOutlineSection,
        handleOutlineSectionTitleChange,
        handleOutlineSubsectionChange,
        handleAddSubsectionLine,
        handleRemoveSubsectionLine,
        handleOutlineSubmit,
        avoidTopics,
        setAvoidTopics,
        includeTopics,
        setIncludeTopics,
    };
}
