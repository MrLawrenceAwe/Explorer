import { useExplore } from './useExplore';

export function useExploreController({
    apiBase,
    savedTopics,
    savedReports,
    suggestionModel,
    rememberTopics,
    handleOpenTopic,
}) {
    const explore = useExplore({
        apiBase,
        savedTopics,
        savedReports,
        suggestionModel,
        rememberTopics,
    });

    return {
        exploreProps: {
            exploreSuggestions: explore.exploreSuggestions,
            exploreLoading: explore.exploreLoading,
            selectedExploreSuggestions: explore.selectedExploreSuggestions,
            exploreSelectMode: explore.exploreSelectMode,
            exploreSelectToggleRef: explore.exploreSelectToggleRef,
            exploreSuggestionsRef: explore.exploreSuggestionsRef,
            handleRefreshExplore: explore.handleRefreshExplore,
            handleToggleExploreSuggestion: explore.handleToggleExploreSuggestion,
            handleToggleExploreSelectMode: explore.handleToggleExploreSelectMode,
            handleOpenTopic,
        },
    };
}
