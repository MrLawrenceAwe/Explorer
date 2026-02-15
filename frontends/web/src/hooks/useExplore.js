import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTopicSuggestions } from '../utils/apiClient';

export function useExplore({
    apiBase,
    savedTopics,
    savedReports,
    suggestionModel,
    rememberTopics,
}) {
    const [exploreSuggestions, setExploreSuggestions] = useState([]);
    const [exploreLoading, setExploreLoading] = useState(false);
    const [selectedSuggestions, setSelectedSuggestions] = useState([]);
    const [exploreNonce, setExploreNonce] = useState(0);
    const [exploreSelectMode, setExploreSelectMode] = useState(false);
    const exploreSelectToggleRef = useRef(null);
    const exploreSuggestionsRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        const loadExplore = async () => {
            setExploreLoading(true);
            setSelectedSuggestions([]);
            const seeds = [
                ...savedTopics.map((entry) => entry.prompt),
                ...savedReports.map((entry) => entry.topic),
            ];
            const remote = await fetchTopicSuggestions(apiBase, {
                seeds,
                model: suggestionModel,
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setExploreSuggestions(remote || []);
            setExploreLoading(false);
        };
        loadExplore();
        return () => controller.abort();
    }, [apiBase, exploreNonce, savedReports, savedTopics, suggestionModel]);

    const handleRefreshExplore = useCallback(() => {
        setExploreNonce((value) => value + 1);
    }, []);

    const handleToggleExploreSuggestion = useCallback((title) => {
        const normalized = (title || "").trim();
        if (!normalized) return;
        setSelectedSuggestions((current) => {
            if (current.includes(normalized)) {
                return current.filter((entry) => entry !== normalized);
            }
            return [...current, normalized];
        });
    }, []);

    const saveSelectedSuggestions = useCallback(() => {
        if (!selectedSuggestions.length) return;
        rememberTopics(selectedSuggestions);
        setSelectedSuggestions([]);
        setExploreSelectMode(false);
    }, [rememberTopics, selectedSuggestions]);

    const toggleExploreSelectMode = useCallback(() => {
        if (!exploreSelectMode) {
            setSelectedSuggestions([]);
            setExploreSelectMode(true);
            return;
        }
        if (selectedSuggestions.length) {
            saveSelectedSuggestions();
            return;
        }
        setSelectedSuggestions([]);
        setExploreSelectMode(false);
    }, [exploreSelectMode, saveSelectedSuggestions, selectedSuggestions.length]);

    useEffect(() => {
        const handleGlobalClick = (event) => {
            const target = event.target;
            if (
                exploreSelectMode &&
                exploreSuggestionsRef.current &&
                !exploreSuggestionsRef.current.contains(target) &&
                !exploreSelectToggleRef.current?.contains(target)
            ) {
                setSelectedSuggestions([]);
                setExploreSelectMode(false);
            }
        };
        document.addEventListener("mousedown", handleGlobalClick);
        return () => document.removeEventListener("mousedown", handleGlobalClick);
    }, [exploreSelectMode]);

    return {
        exploreSuggestions,
        exploreLoading,
        selectedSuggestions,
        exploreSelectMode,
        exploreSelectToggleRef,
        exploreSuggestionsRef,
        handleRefreshExplore,
        handleToggleExploreSuggestion,
        toggleExploreSelectMode,
    };
}
