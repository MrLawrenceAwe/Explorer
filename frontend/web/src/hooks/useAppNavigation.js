import { useCallback, useState } from 'react';

export function useAppNavigation({
    appState,
    topicView,
    chat,
    deleteSavedReportEntry,
    generateReportsFromTopics,
}) {
    const [activePage, setActivePage] = useState('explore');
    const { isRunning, messages, setMessages } = chat;

    const handleOpenTopic = useCallback((topic, options = {}) => {
        const safeTopic = appState.normalizeTopicForOpen(topic, options);
        if (!safeTopic) return;
        setActivePage('explore');
        topicView.openTopicView(safeTopic, {
            pauseSuggestions: Boolean(options.pauseSuggestions),
        });
    }, [appState, topicView]);

    const handleReportOpen = useCallback((reportPayload) => {
        topicView.closeTopicView();
        setActivePage('explore');
        appState.handleReportOpen(reportPayload);
    }, [appState, topicView]);

    const handleQuickTopicSubmit = useCallback((event) => {
        event.preventDefault();
        const normalized = appState.quickTopicInputValue.trim();
        if (!normalized) return;
        handleOpenTopic(normalized);
        appState.setQuickTopicInputValue('');
    }, [appState, handleOpenTopic]);

    const handleTopicRecall = useCallback((topic) => {
        handleOpenTopic(topic);
    }, [handleOpenTopic]);

    const handleReset = useCallback(() => {
        setActivePage('explore');
        topicView.closeTopicView();
        appState.resetToHome(isRunning ? null : () => setMessages([]));
    }, [appState, isRunning, setMessages, topicView]);

    const handleGeneratingReportSelect = useCallback(() => {
        setActivePage('explore');
        appState.setActiveReport(null);
        topicView.closeTopicView();
        appState.setIsHomeView(false);
    }, [appState, topicView]);

    const handleOpenCourses = useCallback(() => {
        topicView.closeTopicView();
        appState.setActiveReport(null);
        appState.setIsHomeView(false);
        setActivePage('courses');
    }, [appState, topicView]);

    const handleOpenExplorer = useCallback(() => {
        setActivePage('explore');
    }, []);

    const handleForgetReport = useCallback(async (reportId) => {
        const reportToDelete = await deleteSavedReportEntry(reportId);
        if (!reportToDelete || isRunning) return;

        const assistantMsg = findLatestAssistantReportMessage(messages);
        if (assistantMsg && assistantMsg.reportTopic === reportToDelete.topic) {
            setMessages([]);
            appState.setIsHomeView(true);
            setActivePage('explore');
        }
    }, [appState, deleteSavedReportEntry, isRunning, messages, setMessages]);

    const handleGenerateTopicFromCourses = useCallback(async (topicTitle) => {
        await generateReportsFromTopics([topicTitle], {
            scopeType: 'topic',
            scopeTitle: topicTitle,
        });
    }, [generateReportsFromTopics]);

    const handleGenerateModuleFromCourses = useCallback(async (moduleTitle, topics) => {
        await generateReportsFromTopics(
            topics.map((topic) => topic.title),
            {
                scopeType: 'module',
                scopeTitle: moduleTitle,
            }
        );
    }, [generateReportsFromTopics]);

    const handleGenerateCourseFromCourses = useCallback(async (courseTitle, modules) => {
        const topicTitles = modules.flatMap((module) => module.topics.map((topic) => topic.title));
        await generateReportsFromTopics(topicTitles, {
            scopeType: 'course',
            scopeTitle: courseTitle,
        });
    }, [generateReportsFromTopics]);

    return {
        activePage,
        handleForgetReport,
        handleGenerateCourseFromCourses,
        handleGenerateModuleFromCourses,
        handleGenerateTopicFromCourses,
        handleGeneratingReportSelect,
        handleOpenCourses,
        handleOpenExplorer,
        handleOpenTopic,
        handleQuickTopicSubmit,
        handleReportOpen,
        handleReset,
        handleTopicRecall,
    };
}

function findLatestAssistantReportMessage(messages) {
    return [...messages].reverse().find((message) => message.role === 'assistant' && message.reportTopic);
}
