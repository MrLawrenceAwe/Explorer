import { useState, useCallback, useEffect } from 'react';
import { loadApiBase, loadUserProfile, persistUserProfile } from '../utils/storage';
import { summarizeReport, cleanHeadingForTopic } from '../utils/reportTextUtils';

export function useAppState() {
    const [apiBase] = useState(loadApiBase);
    const [user, setUser] = useState(loadUserProfile);
    const [activeReport, setActiveReport] = useState(null);
    const [composerValue, setComposerValue] = useState('');
    const [quickTopicInputValue, setQuickTopicInputValue] = useState('');
    const [mode, setMode] = useState('topic');
    const [sectionCount, setSectionCount] = useState(3);
    const [chatAvoidTopics, setChatAvoidTopics] = useState('');
    const [chatIncludeTopics, setChatIncludeTopics] = useState('');
    const [isHomeView, setIsHomeView] = useState(false);

    useEffect(() => {
        persistUserProfile(user);
    }, [user]);

    const handleReportOpen = useCallback((reportPayload) => {
        if (!reportPayload) return;
        const content = reportPayload.content || reportPayload.reportText || '';
        const title =
            (reportPayload.title || reportPayload.reportTitle || reportPayload.topic || 'Explorer Report').trim() ||
            'Explorer Report';
        const topic =
            (reportPayload.topic || reportPayload.reportTopic || title).trim() || 'Explorer Report';
        const preview = reportPayload.preview || summarizeReport(content || '') || topic;
        setActiveReport({
            id: reportPayload.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title,
            topic,
            preview,
            content,
            outline: reportPayload.outline || reportPayload.sections?.outline || null,
            sections: reportPayload.sections || null,
        });
        setIsHomeView(false);
    }, []);

    const handleReportClose = useCallback(() => {
        setActiveReport(null);
    }, []);

    const normalizeTopicForOpen = useCallback((topic, options = {}) => {
        const normalized = options.normalizeHeading
            ? cleanHeadingForTopic(topic)
            : (topic || '');
        const safeTopic = (normalized || '').trim();
        if (!safeTopic) return null;
        setActiveReport(null);
        setIsHomeView(false);
        return safeTopic;
    }, []);

    const resetToHome = useCallback((clearMessages) => {
        setActiveReport(null);
        if (clearMessages) {
            clearMessages();
        }
        setIsHomeView(true);
        setMode('topic');
    }, []);

    const isReportViewOpen = Boolean(activeReport);

    return {
        apiBase,
        user,
        setUser,
        activeReport,
        setActiveReport,
        composerValue,
        setComposerValue,
        quickTopicInputValue,
        setQuickTopicInputValue,
        mode,
        setMode,
        sectionCount,
        setSectionCount,
        chatAvoidTopics,
        setChatAvoidTopics,
        chatIncludeTopics,
        setChatIncludeTopics,
        isHomeView,
        setIsHomeView,
        isReportViewOpen,
        handleReportOpen,
        handleReportClose,
        normalizeTopicForOpen,
        resetToHome,
    };
}
