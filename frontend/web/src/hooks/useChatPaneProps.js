import { useCallback } from 'react';
import { parseTopicsList } from '../utils/reportTextUtils';

export function useChatPaneProps({
    composerValue,
    setComposerValue,
    chatAvoidTopics,
    chatIncludeTopics,
    setChatAvoidTopics,
    setChatIncludeTopics,
    isRunning,
    generateReportFromTopic,
    setIsHomeView,
    messages,
    mode,
    setMode,
    onReset,
    stopGeneration,
    sectionCount,
    setSectionCount,
    isHomeView,
    hasCompletedReport,
    handleReportOpen,
    modelSelectionProps,
}) {
    const handleTopicSubmit = useCallback(
        async (event) => {
            event.preventDefault();
            const topicTitle = composerValue.trim();
            if (!topicTitle || isRunning) return;
            setComposerValue('');
            setIsHomeView(false);
            const avoid = parseTopicsList(chatAvoidTopics);
            const include = parseTopicsList(chatIncludeTopics);
            await generateReportFromTopic(topicTitle, { avoid, include });
            setChatAvoidTopics('');
            setChatIncludeTopics('');
        },
        [composerValue, isRunning, generateReportFromTopic, chatAvoidTopics, chatIncludeTopics, setComposerValue, setIsHomeView, setChatAvoidTopics, setChatIncludeTopics]
    );

    return {
        handleTopicSubmit,
        chatPaneProps: {
            messages: isHomeView ? [] : messages,
            mode,
            setMode,
            isRunning,
            onReset,
            composerValue,
            setComposerValue,
            handleTopicSubmit,
            handleStop: stopGeneration,
            composerButtonLabel: isRunning ? 'Stop' : 'Generate Report',
            sectionCount,
            setSectionCount,
            hideComposer: !isHomeView && isRunning,
            composerLocked: !isHomeView && !isRunning && hasCompletedReport,
            onViewReport: handleReportOpen,
            avoidTopics: chatAvoidTopics,
            setAvoidTopics: setChatAvoidTopics,
            includeTopics: chatIncludeTopics,
            setIncludeTopics: setChatIncludeTopics,
            ...modelSelectionProps,
        },
    };
}
