import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTopicSuggestions } from '../utils/apiClient';
import { parseTopicsList } from '../utils/reportTextUtils';

export function useTopicView({
    apiBase,
    suggestionModel,
    rememberTopics,
    isRunning,
    runTopicPrompt,
}) {
    const [activeTopic, setActiveTopic] = useState("");
    const [draftTopic, setDraftTopic] = useState("");
    const [isTopicEditing, setIsTopicEditing] = useState(false);
    const [topicSuggestions, setTopicSuggestions] = useState([]);
    const [topicSuggestionsLoading, setTopicSuggestionsLoading] = useState(false);
    const [topicSuggestionsNonce, setTopicSuggestionsNonce] = useState(0);
    const [selectedSuggestions, setSelectedSuggestions] = useState([]);
    const [topicSelectMode, setTopicSelectMode] = useState(false);
    const [suggestionsPaused, setSuggestionsPaused] = useState(false);
    const [avoidTopics, setAvoidTopics] = useState("");
    const [includeTopics, setIncludeTopics] = useState("");
    const topicSelectToggleRef = useRef(null);
    const topicSuggestionsRef = useRef(null);
    const topicViewEditorRef = useRef(null);
    const skipTopicCommitRef = useRef(false);



    useEffect(() => {
        if (isTopicEditing) {
            topicViewEditorRef.current?.focus();
            topicViewEditorRef.current?.select?.();
        }
    }, [isTopicEditing]);

    useEffect(() => {
        if (!activeTopic || suggestionsPaused) return;
        const controller = new AbortController();
        setTopicSuggestionsLoading(true);
        const loadSuggestions = async () => {
            const remote = await fetchTopicSuggestions(apiBase, {
                topic: activeTopic,
                seeds: [],
                includeReportHeadings: false,
                model: suggestionModel,
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setTopicSuggestions(remote || []);
            setTopicSuggestionsLoading(false);
        };
        loadSuggestions().catch(() => setTopicSuggestionsLoading(false));
        return () => controller.abort();
    }, [apiBase, topicSuggestionsNonce, activeTopic, suggestionModel, suggestionsPaused]);

    const openTopicView = useCallback((topic, options = {}) => {
        const normalized = (topic || "").trim();
        if (!normalized) return;
        const pauseSuggestions = Boolean(options.pauseSuggestions);
        setActiveTopic(normalized);
        setDraftTopic(normalized);
        setIsTopicEditing(false);
        setTopicSuggestionsLoading(!pauseSuggestions);
        setSelectedSuggestions([]);
        setTopicSelectMode(false);
        setTopicSuggestions([]);
        setSuggestionsPaused(pauseSuggestions);
    }, []);

    const closeTopicView = useCallback(() => {
        setActiveTopic("");
        setDraftTopic("");
        setIsTopicEditing(false);
        setTopicSuggestions([]);
        setSelectedSuggestions([]);
        setTopicSelectMode(false);
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
            setTopicSuggestionsLoading(true);
            setSelectedSuggestions([]);
            setTopicSelectMode(false);
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
        await runTopicPrompt(activeTopic, { avoid, include });
    }, [closeTopicView, isRunning, runTopicPrompt, activeTopic, avoidTopics, includeTopics]);

    const handleTopicViewSave = useCallback(() => {
        if (!activeTopic) return;
        rememberTopics([activeTopic]);
    }, [rememberTopics, activeTopic]);

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
        rememberTopics(selectedSuggestions);
        setSelectedSuggestions([]);
        setTopicSelectMode(false);
    }, [rememberTopics, selectedSuggestions]);

    const handleRefreshSuggestions = useCallback(() => {
        setSuggestionsPaused(false);
        setTopicSuggestionsNonce((value) => value + 1);
    }, []);

    const handleToggleTopicSelectMode = useCallback(() => {
        if (!topicSelectMode) {
            setSelectedSuggestions([]);
            setTopicSelectMode(true);
            return;
        }
        if (selectedSuggestions.length) {
            handleSaveSelectedSuggestions();
            return;
        }
        setSelectedSuggestions([]);
        setTopicSelectMode(false);
    }, [handleSaveSelectedSuggestions, selectedSuggestions.length, topicSelectMode]);

    useEffect(() => {
        const handleGlobalClick = (event) => {
            const target = event.target;
            if (
                topicSelectMode &&
                topicSuggestionsRef.current &&
                !topicSuggestionsRef.current.contains(target) &&
                !topicSelectToggleRef.current?.contains(target)
            ) {
                setSelectedSuggestions([]);
                setTopicSelectMode(false);
            }
        };
        document.addEventListener("mousedown", handleGlobalClick);
        return () => document.removeEventListener("mousedown", handleGlobalClick);
    }, [topicSelectMode]);

    return {
        activeTopic,
        draftTopic,
        setDraftTopic,
        isTopicEditing,
        topicSuggestions,
        topicSuggestionsLoading,
        selectedSuggestions,
        topicSelectMode,
        topicSelectToggleRef,
        topicSuggestionsRef,
        topicViewEditorRef,
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
