import { useState, useCallback, useEffect } from 'react';
import {
    MAX_SAVED_TOPICS,
    MAX_SAVED_REPORTS,
} from '../utils/constants';
import {
    fetchSavedTopics,
    createSavedTopic,
    deleteSavedTopic,
    fetchSavedReports,
    deleteSavedReport,
} from '../utils/apiClient';
import { summarizeReport } from '../utils/reportTextUtils';

export function useSavedData({ apiBase, user }) {
    const [savedTopics, setSavedTopics] = useState([]);
    const [savedReports, setSavedReports] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    const loadTopics = useCallback(async () => {
        if (!user?.email) {
            setSavedTopics([]);
            return [];
        }
        const topics = await fetchSavedTopics(apiBase, user);
        const limited = topics.slice(0, MAX_SAVED_TOPICS);
        setSavedTopics(limited);
        return limited;
    }, [apiBase, user]);

    const loadReports = useCallback(async () => {
        if (!user?.email) {
            setSavedReports([]);
            return [];
        }
        const reports = await fetchSavedReports(apiBase, user, { includeContent: true });
        const limited = reports.slice(0, MAX_SAVED_REPORTS);
        setSavedReports(limited);
        return limited;
    }, [apiBase, user]);

    const refreshSavedData = useCallback(async () => {
        if (!user?.email) {
            setSavedTopics([]);
            setSavedReports([]);
            setError(null);
            setIsSyncing(false);
            return;
        }
        setIsSyncing(true);
        try {
            await Promise.all([loadTopics(), loadReports()]);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to sync saved items.');
        } finally {
            setIsSyncing(false);
        }
    }, [loadReports, loadTopics, user?.email]);

    useEffect(() => {
        refreshSavedData();
    }, [refreshSavedData]);

    const rememberReport = useCallback(async (topic, content, title, outline = null) => {
        const safeContent = content || '';
        const normalizedTitle = (title || topic || 'Explorer Report').trim() || 'Explorer Report';
        const normalizedTopic = (topic || normalizedTitle).trim();
        const summary = summarizeReport(safeContent || normalizedTitle);

        if (!user?.email) {
            setSavedReports((current) => [
                {
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    topic: normalizedTopic,
                    title: normalizedTitle,
                    content: safeContent,
                    outline,
                    preview: summary,
                },
                ...current,
            ].slice(0, MAX_SAVED_REPORTS));
            return;
        }

        try {
            await loadReports();
            setError(null);
        } catch (err) {
            console.error('Failed to refresh reports', err);
            setSavedReports((current) => [
                {
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    topic: normalizedTopic,
                    title: normalizedTitle,
                    content: safeContent,
                    outline,
                    preview: summary,
                },
                ...current,
            ].slice(0, MAX_SAVED_REPORTS));
            setError(err.message || 'Failed to refresh saved reports.');
        }
    }, [loadReports, user?.email]);

    const forgetReport = useCallback(async (id) => {
        if (!id) return null;

        const reportToDelete = savedReports.find((report) => report.id === id);

        if (!user?.email) {
            setSavedReports((current) => current.filter((entry) => entry.id !== id));
        } else {
            try {
                await deleteSavedReport(apiBase, user, id);
                setSavedReports((current) => current.filter((entry) => entry.id !== id));
            } catch (err) {
                console.error('Failed to delete report', err);
                setError(err.message || 'Failed to delete report.');
            }
        }

        return reportToDelete;
    }, [apiBase, user, savedReports]);

    const rememberTopics = useCallback(async (titles) => {
        const normalizedTitles = (Array.isArray(titles) ? titles : [titles])
            .map((entry) => (entry || '').trim())
            .filter(Boolean);
        if (!normalizedTitles.length) return;

        if (!user?.email) {
            setError('Set a user email in Settings to save topics.');
            return;
        }

        try {
            const created = await Promise.all(
                normalizedTitles.map((title) =>
                    createSavedTopic(apiBase, user, title).catch((err) => {
                        console.error('Failed to save topic', title, err);
                        return null;
                    })
                )
            );
            const valid = created.filter(Boolean);
            if (valid.length) {
                setSavedTopics((current) => {
                    const existingIds = new Set(current.map((entry) => entry.id));
                    const merged = [
                        ...valid.filter((topic) => !existingIds.has(topic.id)),
                        ...current.filter(
                            (entry) => !valid.some((topic) => topic.title === entry.title)
                        ),
                    ];
                    return merged.slice(0, MAX_SAVED_TOPICS);
                });
            } else {
                await loadTopics();
            }
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to save topics.');
        }
    }, [apiBase, loadTopics, user]);

    const rememberTopicTitle = useCallback(
        (title) => rememberTopics([title]),
        [rememberTopics]
    );

    const forgetTopic = useCallback(async (id) => {
        if (!id) return;
        if (!user?.email) {
            setSavedTopics((current) => current.filter((entry) => entry.id !== id));
            return;
        }
        try {
            await deleteSavedTopic(apiBase, user, id);
            setSavedTopics((current) => current.filter((entry) => entry.id !== id));
            setError(null);
        } catch (err) {
            console.error('Failed to delete topic', err);
            setError(err.message || 'Failed to delete topic.');
        }
    }, [apiBase, user]);

    const updateTopicCollection = useCallback((topicId, collectionId) => {
        setSavedTopics((current) =>
            current.map((topic) =>
                topic.id === topicId
                    ? { ...topic, collectionId }
                    : topic
            )
        );
    }, []);

    return {
        savedTopics,
        savedReports,
        isSyncing,
        error,
        setError,
        setSavedTopics,
        setSavedReports,
        loadTopics,
        loadReports,
        refreshSavedData,
        rememberReport,
        forgetReport,
        rememberTopics,
        rememberTopicTitle,
        forgetTopic,
        updateTopicCollection,
    };
}
