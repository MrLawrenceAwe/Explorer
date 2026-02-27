import { useCallback } from 'react';

export function useGeneration({
    user,
    modelsPayload,
    sectionCount,
    rememberTopicTitle,
    appendMessage,
    runReportFlow,
    setActiveReport,
    setIsRunning,
    isRunning,
}) {
    const generateReportFromTopic = useCallback(
        async (topicTitle, options = {}) => {
            const normalizedTopicTitle = (topicTitle || "").trim();
            if (!normalizedTopicTitle || isRunning) return false;

            const { avoid = [], include = [] } = options;

            setActiveReport(null);
            const assistantId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            rememberTopicTitle(normalizedTopicTitle);
            appendMessage({
                id: `${assistantId}-user`,
                role: "user",
                content: normalizedTopicTitle,
                variant: "topic",
            });
            appendMessage({
                id: assistantId,
                role: "assistant",
                content: "",
                variant: "topic",
                reportTopic: normalizedTopicTitle,
            });
            setIsRunning(true);
            try {
                await runReportFlow(
                    {
                        topic: normalizedTopicTitle,
                        mode: "generate_report",
                        return: "report_with_outline",
                        sections: sectionCount || undefined,
                        models: modelsPayload,
                        user_email: user.email || undefined,
                        username: user.username || undefined,
                        subject_exclusions: avoid,
                        subject_inclusions: include,
                    },
                    assistantId,
                    normalizedTopicTitle
                );
                return true;
            } finally {
                setIsRunning(false);
            }
        },
        [appendMessage, isRunning, modelsPayload, user.email, user.username, rememberTopicTitle, runReportFlow, sectionCount, setActiveReport, setIsRunning]
    );

    return { generateReportFromTopic };
}
