import { useOutlineForm } from './useOutlineForm';

/** Outline form wrapper that wires generation callbacks. */
export function useOutlineController({
    user,
    isRunning,
    appendMessage,
    modelsPayload,
    setActiveReport,
    setIsRunning,
    setIsHomeView,
    runReportFlow,
}) {
    const outline = useOutlineForm({
        isRunning,
        appendMessage,
        models: modelsPayload,
        onGenerate: async (payload, assistantId, topicText) => {
            setActiveReport(null);
            setIsRunning(true);
            setIsHomeView(false);
            const payloadWithUser = {
                ...payload,
                user_email: user.email || undefined,
                username: user.username || undefined,
            };
            const wasSuccessful = await runReportFlow(payloadWithUser, assistantId, topicText);
            setIsRunning(false);
            if (wasSuccessful) {
                outline.resetOutlineForm();
            }
        },
    });

    const outlineHandlers = {
        handleAddSection: outline.handleAddOutlineSection,
        handleRemoveSection: outline.handleRemoveOutlineSection,
        handleSectionTitleChange: outline.handleOutlineSectionTitleChange,
        handleSubsectionChange: outline.handleOutlineSubsectionChange,
        handleAddSubsection: outline.handleAddSubsectionLine,
        handleRemoveSubsection: outline.handleRemoveSubsectionLine,
    };

    const outlineFormProps = {
        outlineTopic: outline.outlineTopic,
        setOutlineTopic: outline.setOutlineTopic,
        outlineInputMode: outline.outlineInputMode,
        setOutlineInputMode: outline.setOutlineInputMode,
        outlineSections: outline.outlineSections,
        outlineJsonInput: outline.outlineJsonInput,
        setOutlineJsonInput: outline.setOutlineJsonInput,
        error: outline.outlineError,
        jsonValidationError: outline.jsonValidationError,
        trimmedJsonInput: outline.trimmedJsonInput,
        isFormValid: outline.isOutlineFormValid,
        isRunning,
        handleSubmit: outline.handleOutlineSubmit,
        submitLabel: isRunning ? 'Working…' : 'Generate report',
        handlers: outlineHandlers,
        avoidTopics: outline.avoidTopics,
        setAvoidTopics: outline.setAvoidTopics,
        includeTopics: outline.includeTopics,
        setIncludeTopics: outline.setIncludeTopics,
    };

    return { outlineFormProps };
}
