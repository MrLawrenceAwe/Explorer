import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTopicSuggestions } from '../utils/apiClient';

export function useExploreSuggestions({
    apiBase,
    savedTopics,
    savedReports,
    suggestionModel,
    saveTopics,
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSuggestions, setSelectedSuggestions] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const selectToggleRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        const loadSuggestions = async () => {
            setIsLoading(true);
            setSelectedSuggestions([]);
            const seeds = [
                ...savedTopics.map((entry) => entry.title),
                ...savedReports.map((entry) => entry.topic),
            ];
            const remote = await fetchTopicSuggestions(apiBase, {
                seeds,
                model: suggestionModel,
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setSuggestions(remote || []);
            setIsLoading(false);
        };
        loadSuggestions();
        return () => controller.abort();
    }, [apiBase, refreshKey, savedReports, savedTopics, suggestionModel]);

    const refreshSuggestions = useCallback(() => {
        setRefreshKey((value) => value + 1);
    }, []);

    const toggleSuggestionSelection = useCallback((title) => {
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
        saveTopics(selectedSuggestions);
        setSelectedSuggestions([]);
        setIsSelectMode(false);
    }, [saveTopics, selectedSuggestions]);

    const toggleSelectMode = useCallback(() => {
        if (!isSelectMode) {
            setSelectedSuggestions([]);
            setIsSelectMode(true);
            return;
        }
        if (selectedSuggestions.length) {
            saveSelectedSuggestions();
            return;
        }
        setSelectedSuggestions([]);
        setIsSelectMode(false);
    }, [isSelectMode, saveSelectedSuggestions, selectedSuggestions.length]);

    useEffect(() => {
        const handleGlobalClick = (event) => {
            const target = event.target;
            if (
                isSelectMode &&
                suggestionsRef.current &&
                !suggestionsRef.current.contains(target) &&
                !selectToggleRef.current?.contains(target)
            ) {
                setSelectedSuggestions([]);
                setIsSelectMode(false);
            }
        };
        document.addEventListener("mousedown", handleGlobalClick);
        return () => document.removeEventListener("mousedown", handleGlobalClick);
    }, [isSelectMode]);

    return {
        suggestions,
        isLoading,
        selectedSuggestions,
        isSelectMode,
        selectToggleRef,
        suggestionsRef,
        refreshSuggestions,
        toggleSuggestionSelection,
        toggleSelectMode,
    };
}
