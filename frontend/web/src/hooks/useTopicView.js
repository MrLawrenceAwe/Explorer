import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTopicSuggestions } from '../utils/apiClient';
import { parseTopicsList } from '../utils/reportTextUtils';

export function useTopicView({
    apiBase,
    suggestionModel,
    saveTopics,
    isRunning,
    generateReportFromTopic,
}) {
    const [activeTopic, setActiveTopic] = useState("");
    const [draftTopic, setDraftTopic] = useState("");
    const [isTopicEditing, setIsTopicEditing] = useState(false);
    const [topicSuggestions, setTopicSuggestions] = useState([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [topicSuggestionsNonce, setTopicSuggestionsNonce] = useState(0);
    const [selectedSuggestions, setSelectedSuggestions] = useState([]);
    const [isSuggestionSelectMode, setIsSuggestionSelectMode] = useState(false);
    const [suggestionsPaused, setSuggestionsPaused] = useState(false);
    const [avoidTopics, setAvoidTopics] = useState("");
    const [includeTopics, setIncludeTopics] = useState("");
    const topicSelectToggleRef = useRef(null);
    const topicSuggestionsRef = useRef(null);
    const titleEditorRef = useRef(null);
    const skipTopicCommitRef = useRef(false);
    useEffect(() => {
        if (isTopicEditing) {
            titleEditorRef.current?.focus();
            titleEditorRef.current?.select?.();
        }
    }, [isTopicEditing]);

    const loadSuggestions = useCallback(async (topic, signal) => {
        setIsSuggestionsLoading(true);
        try {
            const remote = await fetchTopicSuggestions(apiBase, {
                topic,
                seeds: [],
                includeReportHeadings: false,
                model: suggestionModel,
                signal,
            });
            if (signal.aborted) return;
            setTopicSuggestions(remote || []);
        } finally {
            if (!signal.aborted) {
                setIsSuggestionsLoading(false);
            }
        }
    }, [apiBase, suggestionModel]);

    useEffect(() => {
        if (!activeTopic || suggestionsPaused) return;
        const controller = new AbortController();
        loadSuggestions(activeTopic, controller.signal).catch(() => {
            if (!controller.signal.aborted) {
                setIsSuggestionsLoading(false);
            }
        });
        return () => controller.abort();
    }, [activeTopic, loadSuggestions, suggestionsPaused, topicSuggestionsNonce]);

    const openTopicView = useCallback((topic, options = {}) => {
        const normalized = (topic || "").trim();
        if (!normalized) return;
        const pauseSuggestions = Boolean(options.pauseSuggestions);
        setActiveTopic(normalized);
        setDraftTopic(normalized);
        setIsTopicEditing(false);
        setIsSuggestionsLoading(!pauseSuggestions);
        setSelectedSuggestions([]);
        setIsSuggestionSelectMode(false);
        setTopicSuggestions([]);
        setSuggestionsPaused(pauseSuggestions);
    }, []);

    const closeTopicView = useCallback(() => {
        setActiveTopic("");
        setDraftTopic("");
        setIsTopicEditing(false);
        setTopicSuggestions([]);
        setSelectedSuggestions([]);
        setIsSuggestionSelectMode(false);
        setSuggestionsPaused(false);
        setAvoidTopics("");
        setIncludeTopics("");
    }, []);

    const startTopicEditing = useCallback(() => {
        if (!activeTopic) return;
        skipTopicCommitRef.current = false;
        setDraftTopic(activeTopic);
        setIsTopicEditing(true);
    }, [activeTopic]);

    const cancelTopicEditing = useCallback(() => {
        skipTopicCommitRef.current = true;
        setDraftTopic(activeTopic);
        setIsTopicEditing(false);
    }, [activeTopic]);

    const commitTopicEdit = useCallback(() => {
        if (skipTopicCommitRef.current) {
            skipTopicCommitRef.current = false;
            return;
        }
        const normalized = draftTopic.trim();
        setIsTopicEditing(false);
        if (normalized && normalized !== activeTopic) {
            setActiveTopic(normalized);
            setDraftTopic(normalized);
            setIsSuggestionsLoading(true);
            setSelectedSuggestions([]);
            setIsSuggestionSelectMode(false);
        } else {
            setDraftTopic(activeTopic);
        }
    }, [draftTopic, activeTopic]);

    const handleTopicEditSubmit = useCallback(
        (event) => {
            event.preventDefault();
            commitTopicEdit();
        },
        [commitTopicEdit]
    );

    const handleTopicEditBlur = useCallback(() => {
        commitTopicEdit();
    }, [commitTopicEdit]);

    const handleTopicEditKeyDown = useCallback(
        (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                cancelTopicEditing();
            } else if (event.key === "Enter") {
                event.preventDefault();
                commitTopicEdit();
            }
        },
        [cancelTopicEditing, commitTopicEdit]
    );

    const handleTopicTitleKeyDown = useCallback(
        (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                startTopicEditing();
            }
        },
        [startTopicEditing]
    );

    const generateTopicReport = useCallback(async () => {
        if (!activeTopic || isRunning) return;
        closeTopicView();
        const avoid = parseTopicsList(avoidTopics);
        const include = parseTopicsList(includeTopics);
        await generateReportFromTopic(activeTopic, { avoid, include });
    }, [closeTopicView, isRunning, generateReportFromTopic, activeTopic, avoidTopics, includeTopics]);

    const handleTopicViewSave = useCallback(() => {
        if (!activeTopic) return;
        saveTopics([activeTopic]);
    }, [saveTopics, activeTopic]);

    const handleSuggestionToggle = useCallback((title) => {
        const normalized = (title || "").trim();
        if (!normalized) return;
        setSelectedSuggestions((current) => {
            if (current.includes(normalized)) {
                return current.filter((entry) => entry !== normalized);
            }
            return [...current, normalized];
        });
    }, []);

    const handleSaveSelectedSuggestions = useCallback(() => {
        if (!selectedSuggestions.length) return;
        saveTopics(selectedSuggestions);
        setSelectedSuggestions([]);
        setIsSuggestionSelectMode(false);
    }, [saveTopics, selectedSuggestions]);

    const handleRefreshSuggestions = useCallback(() => {
        setSuggestionsPaused(false);
        setIsSuggestionsLoading(true);
        setTopicSuggestionsNonce((value) => value + 1);
    }, []);

    const handleToggleTopicSelectMode = useCallback(() => {
        if (!isSuggestionSelectMode) {
            setSelectedSuggestions([]);
            setIsSuggestionSelectMode(true);
            return;
        }
        if (selectedSuggestions.length) {
            handleSaveSelectedSuggestions();
            return;
        }
        setSelectedSuggestions([]);
        setIsSuggestionSelectMode(false);
    }, [handleSaveSelectedSuggestions, selectedSuggestions.length, isSuggestionSelectMode]);

    useEffect(() => {
        const handleGlobalClick = (event) => {
            const target = event.target;
            if (
                isSuggestionSelectMode &&
                topicSuggestionsRef.current &&
                !topicSuggestionsRef.current.contains(target) &&
                !topicSelectToggleRef.current?.contains(target)
            ) {
                setSelectedSuggestions([]);
                setIsSuggestionSelectMode(false);
            }
        };
        document.addEventListener("mousedown", handleGlobalClick);
        return () => document.removeEventListener("mousedown", handleGlobalClick);
    }, [isSuggestionSelectMode]);

    return {
        activeTopic,
        draftTopic,
        setDraftTopic,
        isTopicEditing,
        topicSuggestions,
        suggestionsLoading: isSuggestionsLoading,
        selectedSuggestions,
        selectMode: isSuggestionSelectMode,
        selectToggleRef: topicSelectToggleRef,
        suggestionsRef: topicSuggestionsRef,
        titleEditorRef,
        openTopicView,
        closeTopicView,
        startTopicEditing,
        cancelTopicEditing,
        commitTopicEdit,
        handleTopicEditSubmit,
        handleTopicEditBlur,
        handleTopicEditKeyDown,
        handleTopicTitleKeyDown,
        generateTopicReport,
        handleTopicViewSave,
        handleSuggestionToggle,
        handleSaveSelectedSuggestions,
        handleRefreshSuggestions,
        handleToggleTopicSelectMode,
        avoidTopics,
        setAvoidTopics,
        includeTopics,
        setIncludeTopics,
    };
}
