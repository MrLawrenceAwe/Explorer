import { useCallback, useState } from 'react';

function makeRunId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTopics(topics) {
    const seen = new Set();

    return (Array.isArray(topics) ? topics : [])
        .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
        .filter((topic) => {
            if (!topic) return false;
            const key = topic.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function getTopicStageProgress(status) {
    switch (status) {
        case 'started':
            return 0.05;
        case 'generating_outline':
            return 0.2;
        case 'outline_ready':
            return 0.35;
        case 'begin_sections':
            return 0.45;
        case 'writing_section':
            return 0.65;
        case 'writer_model_fallback':
            return 0.72;
        case 'editing_section':
            return 0.82;
        case 'section_complete':
            return 0.92;
        case 'complete':
            return 1;
        default:
            return 0;
    }
}

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
    const [coursesGenerationProgress, setCoursesGenerationProgress] = useState(null);

    const updateCoursesGenerationProgress = useCallback((runId, updater) => {
        setCoursesGenerationProgress((current) => {
            if (!current || current.runId !== runId) {
                return current;
            }

            return typeof updater === 'function'
                ? updater(current)
                : { ...current, ...updater };
        });
    }, []);

    const runSingleTopicReport = useCallback(
        async (topicTitle, options = {}, runtime = {}) => {
            const normalizedTopicTitle = (topicTitle || '').trim();
            const {
                avoid = [],
                include = [],
            } = options;
            const {
                manageRunningState = true,
                onEvent,
            } = runtime;

            if (!normalizedTopicTitle) return false;
            if (manageRunningState && isRunning) return false;

            setActiveReport(null);

            const assistantId = makeRunId();
            rememberTopicTitle(normalizedTopicTitle);
            appendMessage({
                id: `${assistantId}-user`,
                role: 'user',
                content: normalizedTopicTitle,
                variant: 'topic',
            });
            appendMessage({
                id: assistantId,
                role: 'assistant',
                content: '',
                variant: 'topic',
                reportTopic: normalizedTopicTitle,
            });

            if (manageRunningState) {
                setIsRunning(true);
            }

            try {
                return await runReportFlow(
                    {
                        topic: normalizedTopicTitle,
                        mode: 'generate_report',
                        return: 'report_with_outline',
                        sections: sectionCount || undefined,
                        models: modelsPayload,
                        user_email: user.email || undefined,
                        username: user.username || undefined,
                        subject_exclusions: avoid,
                        subject_inclusions: include,
                    },
                    assistantId,
                    normalizedTopicTitle,
                    { onEvent }
                );
            } finally {
                if (manageRunningState) {
                    setIsRunning(false);
                }
            }
        },
        [
            appendMessage,
            isRunning,
            modelsPayload,
            rememberTopicTitle,
            runReportFlow,
            sectionCount,
            setActiveReport,
            setIsRunning,
            user.email,
            user.username,
        ]
    );

    const generateReportFromTopic = useCallback(
        async (topicTitle, options = {}) => runSingleTopicReport(topicTitle, options),
        [runSingleTopicReport]
    );

    const generateReportsFromTopics = useCallback(
        async (topics, scope = {}) => {
            const normalizedTopics = normalizeTopics(topics);
            if (!normalizedTopics.length || isRunning) return false;

            const runId = makeRunId();
            const scopeType = scope.scopeType || 'selection';
            const scopeTitle = (scope.scopeTitle || '').trim();

            setCoursesGenerationProgress({
                runId,
                scopeType,
                scopeTitle,
                totalTopics: normalizedTopics.length,
                completedTopics: 0,
                currentIndex: 1,
                currentTopic: normalizedTopics[0],
                currentStatus: 'Starting…',
                currentTopicProgress: 0.05,
                state: 'running',
                errorMessage: '',
            });

            setActiveReport(null);
            setIsRunning(true);

            try {
                for (let index = 0; index < normalizedTopics.length; index += 1) {
                    const topicTitle = normalizedTopics[index];

                    updateCoursesGenerationProgress(runId, {
                        currentIndex: index + 1,
                        currentTopic: topicTitle,
                        currentStatus: 'Starting…',
                        currentTopicProgress: 0.05,
                        errorMessage: '',
                    });

                    const wasSuccessful = await runSingleTopicReport(
                        topicTitle,
                        {},
                        {
                            manageRunningState: false,
                            onEvent: (event, meta) => {
                                updateCoursesGenerationProgress(runId, {
                                    completedTopics: index,
                                    currentIndex: index + 1,
                                    currentTopic: topicTitle,
                                    currentStatus: meta.statusText || 'Working…',
                                    currentTopicProgress: getTopicStageProgress(event.status),
                                });
                            },
                        }
                    );

                    if (!wasSuccessful) {
                        updateCoursesGenerationProgress(runId, {
                            state: 'error',
                            currentIndex: index + 1,
                            currentTopic: topicTitle,
                            currentStatus: 'Generation stopped.',
                            currentTopicProgress: 0,
                            errorMessage: `Stopped before finishing "${topicTitle}".`,
                        });
                        return false;
                    }
                }

                updateCoursesGenerationProgress(runId, (current) => ({
                    ...current,
                    completedTopics: current.totalTopics,
                    currentIndex: current.totalTopics,
                    currentStatus: 'All reports generated.',
                    currentTopicProgress: 1,
                    state: 'complete',
                    errorMessage: '',
                }));

                return true;
            } finally {
                setIsRunning(false);
            }
        },
        [isRunning, runSingleTopicReport, setActiveReport, setIsRunning, updateCoursesGenerationProgress]
    );

    return {
        generateReportFromTopic,
        generateReportsFromTopics,
        coursesGenerationProgress,
    };
}
