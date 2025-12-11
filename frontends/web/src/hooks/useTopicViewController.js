import { useCallback } from 'react';
import { useTopicView } from './useTopicView';

export function useTopicViewController({
    apiBase,
    suggestionModel,
    rememberTopics,
    isRunning,
    runTopicPrompt,
    normalizeTopicForOpen,
}) {
    const topicView = useTopicView({
        apiBase,
        suggestionModel,
        rememberTopics,
        isRunning,
        runTopicPrompt,
    });

    const handleOpenTopic = useCallback(
        (topic, options = {}) => {
            const safeTopic = normalizeTopicForOpen(topic, options);
            if (!safeTopic) return;
            topicView.openTopicView(safeTopic, { pauseSuggestions: Boolean(options.pauseSuggestions) });
        },
        [normalizeTopicForOpen, topicView.openTopicView]
    );

    return {
        ...topicView,
        handleOpenTopic,
    };
}
