import { useEffect, useMemo } from 'react';

/** Derived UI state and layout helpers for the main app surfaces. */
export function useMainViewState({
    isRunning,
    isHomeView,
    isReportViewOpen,
    messages,
    savedReports,
    savedTopics,
    topicViewTopic,
    setIsHomeView,
    setMode,
}) {
    const hasMessages = messages.length > 0;
    const isTopicViewOpen = Boolean(topicViewTopic);

    const isTopicSaved = useMemo(
        () => savedTopics.some((entry) => entry.prompt === topicViewTopic),
        [savedTopics, topicViewTopic]
    );

    const hasCompletedReport = useMemo(
        () => messages.some((message) => message.role === "assistant" && Boolean(message.reportText)),
        [messages]
    );

    const shouldShowExplore = isHomeView || (!isTopicViewOpen && !isReportViewOpen && !hasMessages);

    const generatingReport = useMemo(() => {
        if (!isRunning && (!hasMessages || !isHomeView)) return null;
        let assistantMsg = null;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index];
            if (message.role === "assistant" && message.reportTopic) {
                assistantMsg = message;
                break;
            }
        }
        if (assistantMsg) {
            const isSaved = savedReports.some((r) => r.topic === assistantMsg.reportTopic);
            if (isSaved && !isRunning) return null;
            return {
                id: "generating",
                topic: assistantMsg.reportTopic,
                title: assistantMsg.reportTopic,
                isGenerating: isRunning,
            };
        }
        return null;
    }, [isRunning, messages, hasMessages, isHomeView, savedReports]);

    const chatPaneClasses = useMemo(() => {
        const classes = ["chat-pane"];
        if (isHomeView || (!hasMessages && !isTopicViewOpen && !isReportViewOpen)) {
            classes.push("chat-pane--empty");
        }
        if (isTopicViewOpen || isReportViewOpen) {
            classes.push("chat-pane--topic-view");
        }
        return classes.join(" ");
    }, [isHomeView, hasMessages, isTopicViewOpen, isReportViewOpen]);

    // Auto-show home when empty
    useEffect(() => {
        if (isRunning || isTopicViewOpen || isReportViewOpen || isHomeView) return;
        if (messages.length === 0) {
            setIsHomeView(true);
            setMode("topic");
        }
    }, [isRunning, isTopicViewOpen, isReportViewOpen, isHomeView, messages.length, setMode, setIsHomeView]);

    return {
        hasMessages,
        isTopicViewOpen,
        isTopicSaved,
        hasCompletedReport,
        shouldShowExplore,
        generatingReport,
        chatPaneClassName: chatPaneClasses,
    };
}
