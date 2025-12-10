import { useCallback } from 'react';
import { useChat } from './hooks/useChat';
import { useOutlineForm } from './hooks/useOutlineForm';
import { useSettings } from './hooks/useSettings';
import { usePersistence } from './hooks/usePersistence';
import { useExplore } from './hooks/useExplore';
import { useTopicView } from './hooks/useTopicView';
import { useGeneration } from './hooks/useGeneration';
import { useSavedData } from './hooks/useSavedData';
import { useAppState } from './hooks/useAppState';
import { useCollections } from './hooks/useCollections';
import { useMainViewState } from './hooks/useMainViewState';
import { AppLayout } from './components/AppLayout';
import { useBeforeUnloadWarning } from './hooks/useBeforeUnloadWarning';

import { MODEL_PRESET_LABELS } from './utils/modelPresets';
import { parseTopicsList } from './utils/text';

function App() {
  // Core app state
  const {
    apiBase,
    user,
    setUser,
    activeReport,
    setActiveReport,
    composerValue,
    setComposerValue,
    topicViewBarValue,
    setTopicViewBarValue,
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
    handleReportOpen: baseHandleReportOpen,
    handleReportClose,
    normalizeTopicForOpen,
    resetToHome,
  } = useAppState();

  // Settings management
  const {
    modelPresets,
    defaultPreset,
    selectedPreset,
    stageModels,
    isSettingsOpen,
    suggestionModel,
    modelsPayload,
    handleStageModelChange,
    handlePresetModelChange,
    handlePresetSelect,
    handleDefaultPresetChange,
    handleOpenSettings,
    handleCloseSettings,
    handleSuggestionModelChange,
  } = useSettings();

  usePersistence({
    modelPresets,
    defaultPreset,
    suggestionModel,
  });

  // Saved data management
  const {
    savedTopics,
    savedReports,
    isSyncing: isSyncingSaved,
    error: savedError,
    setError: setSavedError,
    rememberReport,
    forgetReport,
    rememberTopics,
    rememberTopic,
    forgetTopic,
    updateTopicCollection,
  } = useSavedData({ apiBase, user });

  const handleSavedDataError = useCallback((msg) => setSavedError(msg), [setSavedError]);

  const handleTopicMoved = useCallback((updatedTopic) => {
    updateTopicCollection(updatedTopic.id, updatedTopic.collectionId);
  }, [updateTopicCollection]);

  // Collections management
  const {
    collections,
    isLoading: isLoadingCollections,
    expandedCollections,
    editingCollectionId,
    isCreating: isCreatingCollection,
    newCollectionName,
    setNewCollectionName,
    toggleCollectionExpanded,
    handleCreateCollection,
    handleUpdateCollection,
    handleDeleteCollection,
    handleMoveTopicToCollection,
    startCreating: startCreatingCollection,
    cancelCreating: cancelCreatingCollection,
    startEditing: startEditingCollection,
    cancelEditing: cancelEditingCollection,
  } = useCollections({
    apiBase,
    user,
    onTopicMoved: handleTopicMoved,
    onError: handleSavedDataError,
  });

  // Chat management
  const {
    messages,
    isRunning,
    setMessages,
    setIsRunning,
    runReportFlow,
    appendMessage,
    stopGeneration,
  } = useChat(apiBase, rememberReport);

  // Warn on page leave during generation
  useBeforeUnloadWarning(isRunning);

  // Report deletion handler
  const handleForgetReport = useCallback(async (id) => {
    const reportToDelete = await forgetReport(id);
    if (!reportToDelete || isRunning) return;

    const assistantMsg = findLatestAssistantReportMessage(messages);
    if (assistantMsg && assistantMsg.reportTopic === reportToDelete.topic) {
      setMessages([]);
      setIsHomeView(true);
    }
  }, [forgetReport, isRunning, messages, setMessages, setIsHomeView]);

  // Generation hook
  const { runTopicPrompt } = useGeneration({
    user,
    modelsPayload,
    sectionCount,
    rememberTopic,
    appendMessage,
    runReportFlow,
    setActiveReport,
    setIsRunning,
    isRunning,
  });

  // Explore suggestions
  const {
    exploreSuggestions,
    exploreLoading,
    selectedExploreSuggestions,
    exploreSelectMode,
    exploreSelectToggleRef,
    exploreSuggestionsRef,
    handleRefreshExplore,
    handleToggleExploreSuggestion,
    handleToggleExploreSelectMode,
  } = useExplore({
    apiBase,
    savedTopics,
    savedReports,
    suggestionModel,
    rememberTopics,
  });

  // Topic view
  const {
    topicViewTopic,
    topicViewDraft,
    setTopicViewDraft,
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
    handleTopicViewGenerate,
    handleTopicViewSave,
    handleSuggestionToggle,
    handleSaveSelectedSuggestions,
    handleRefreshSuggestions,
    handleToggleTopicSelectMode,
    avoidTopics,
    setAvoidTopics,
    includeTopics,
    setIncludeTopics,
  } = useTopicView({
    apiBase,
    suggestionModel,
    rememberTopics,
    isRunning,
    runTopicPrompt,
  });

  // Handle report open (with topic view close)
  const handleReportOpen = useCallback((reportPayload) => {
    closeTopicView();
    baseHandleReportOpen(reportPayload);
  }, [closeTopicView, baseHandleReportOpen]);

  // Handle open topic
  const handleOpenTopic = useCallback((topic, options = {}) => {
    const safeTopic = normalizeTopicForOpen(topic, options);
    if (!safeTopic) return;
    openTopicView(safeTopic, { pauseSuggestions: Boolean(options.pauseSuggestions) });
  }, [normalizeTopicForOpen, openTopicView]);

  // Outline form
  const {
    outlineTopic,
    setOutlineTopic,
    outlineInputMode,
    setOutlineInputMode,
    outlineSections,
    outlineJsonInput,
    setOutlineJsonInput,
    outlineError,
    trimmedJsonInput,
    jsonValidationError,
    isOutlineFormValid,
    resetOutlineForm,
    handleAddOutlineSection,
    handleRemoveOutlineSection,
    handleOutlineSectionTitleChange,
    handleOutlineSubsectionChange,
    handleAddSubsectionLine,
    handleRemoveSubsectionLine,
    handleOutlineSubmit,
    avoidTopics: outlineAvoidTopics,
    setAvoidTopics: setOutlineAvoidTopics,
    includeTopics: outlineIncludeTopics,
    setIncludeTopics: setOutlineIncludeTopics,
  } = useOutlineForm({
    isRunning,
    appendMessage,
    models: modelsPayload,
    onGenerate: async (payload, assistantId, topicText) => {
      setActiveReport(null);
      setIsRunning(true);
      setIsHomeView(false);
      const payloadWithUser = {
        ...payload,
        user_email: user.email || undefined,
        username: user.username || undefined,
      };
      const wasSuccessful = await runReportFlow(payloadWithUser, assistantId, topicText);
      setIsRunning(false);
      if (wasSuccessful) {
        resetOutlineForm();
      }
    },
  });

  // Topic submit handler
  const handleTopicSubmit = useCallback(async (event) => {
    event.preventDefault();
    const prompt = composerValue.trim();
    if (!prompt || isRunning) return;
    setComposerValue('');
    setIsHomeView(false);
    const avoid = parseTopicsList(chatAvoidTopics);
    const include = parseTopicsList(chatIncludeTopics);
    await runTopicPrompt(prompt, { avoid, include });
    setChatAvoidTopics('');
    setChatIncludeTopics('');
  }, [composerValue, isRunning, runTopicPrompt, chatAvoidTopics, chatIncludeTopics, setComposerValue, setIsHomeView, setChatAvoidTopics, setChatIncludeTopics]);

  // Topic view bar submit handler
  const handleTopicViewBarSubmit = useCallback((event) => {
    event.preventDefault();
    const normalized = topicViewBarValue.trim();
    if (!normalized) return;
    handleOpenTopic(normalized);
    setTopicViewBarValue('');
  }, [handleOpenTopic, topicViewBarValue, setTopicViewBarValue]);

  // Topic recall handler
  const handleTopicRecall = useCallback((topic) => {
    handleOpenTopic(topic);
  }, [handleOpenTopic]);

  // Reset handler
  const handleReset = useCallback(() => {
    closeTopicView();
    resetToHome(isRunning ? null : () => setMessages([]));
  }, [closeTopicView, resetToHome, isRunning, setMessages]);

  // Generating report select handler
  const handleGeneratingReportSelect = useCallback(() => {
    setActiveReport(null);
    closeTopicView();
    setIsHomeView(false);
  }, [closeTopicView, setActiveReport, setIsHomeView]);
  const composerButtonLabel = isRunning ? 'Stop' : 'Generate Report';
  const outlineSubmitLabel = isRunning ? 'Working…' : 'Generate report';
  const presetLabel = MODEL_PRESET_LABELS[selectedPreset] || selectedPreset;
  const modelSelectionProps = {
    stageModels,
    onStageModelChange: handleStageModelChange,
    selectedPreset,
    onPresetSelect: handlePresetSelect,
    presetLabel,
  };

  const {
    isTopicViewOpen,
    isTopicSaved,
    hasCompletedReport,
    shouldShowExplore,
    generatingReport,
    chatPaneClassName,
  } = useMainViewState({
    isRunning,
    isHomeView,
    isReportViewOpen,
    messages,
    savedReports,
    savedTopics,
    topicViewTopic,
    setIsHomeView,
    setMode,
  });

  const useCollectionsFeature = Boolean(user?.email);
  const topicViewHandlers = {
    startEditing: startTopicEditing,
    cancelEditing: cancelTopicEditing,
    commitEditing: commitTopicEdit,
    handleEditSubmit: handleTopicEditSubmit,
    handleEditBlur: handleTopicEditBlur,
    handleEditKeyDown: handleTopicEditKeyDown,
    handleTitleKeyDown: handleTopicTitleKeyDown,
    handleSave: handleTopicViewSave,
    handleGenerate: handleTopicViewGenerate,
    handleClose: closeTopicView,
    handleOpenTopic,
    handleToggleSuggestion: handleSuggestionToggle,
    handleSaveSelectedSuggestions,
    handleRefreshSuggestions,
    handleToggleSelectMode: handleToggleTopicSelectMode,
    sectionCount,
    setSectionCount,
  };
  const outlineHandlers = {
    handleAddSection: handleAddOutlineSection,
    handleRemoveSection: handleRemoveOutlineSection,
    handleSectionTitleChange: handleOutlineSectionTitleChange,
    handleSubsectionChange: handleOutlineSubsectionChange,
    handleAddSubsection: handleAddSubsectionLine,
    handleRemoveSubsection: handleRemoveSubsectionLine,
  };

  const sidebarProps = {
    savedTopics,
    savedReports,
    generatingReport,
    onGeneratingReportSelect: handleGeneratingReportSelect,
    handleTopicRecall,
    handleTopicRemove: forgetTopic,
    handleReportRemove: handleForgetReport,
    topicViewBarValue,
    setTopicViewBarValue,
    handleTopicViewBarSubmit,
    onOpenSettings: handleOpenSettings,
    onReportSelect: handleReportOpen,
    onResetExplore: handleReset,
    isSyncing: isSyncingSaved || isLoadingCollections,
    savedError,
    useCollections: useCollectionsFeature,
    collections,
    expandedCollections,
    isCreatingCollection: isCreatingCollection,
    newCollectionName,
    editingCollectionId,
    onToggleCollectionExpanded: toggleCollectionExpanded,
    onCreateCollection: handleCreateCollection,
    onUpdateCollection: handleUpdateCollection,
    onDeleteCollection: handleDeleteCollection,
    onStartCreatingCollection: startCreatingCollection,
    onCancelCreatingCollection: cancelCreatingCollection,
    onStartEditingCollection: startEditingCollection,
    onCancelEditingCollection: cancelEditingCollection,
    onNewCollectionNameChange: setNewCollectionName,
    onMoveTopicToCollection: handleMoveTopicToCollection,
  };

  const exploreProps = {
    exploreSuggestions,
    exploreLoading,
    selectedExploreSuggestions,
    exploreSelectMode,
    exploreSelectToggleRef,
    exploreSuggestionsRef,
    handleRefreshExplore,
    handleToggleExploreSuggestion,
    handleToggleExploreSelectMode,
    handleOpenTopic,
  };

  const topicViewProps = {
    isOpen: isTopicViewOpen,
    topic: topicViewTopic,
    isEditing: isTopicEditing,
    draft: topicViewDraft,
    setDraft: setTopicViewDraft,
    isSaved: isTopicSaved,
    suggestions: topicSuggestions,
    suggestionsLoading: topicSuggestionsLoading,
    selectedSuggestions,
    selectMode: topicSelectMode,
    selectToggleRef: topicSelectToggleRef,
    suggestionsRef: topicSuggestionsRef,
    isRunning,
    ...modelSelectionProps,
    handlers: topicViewHandlers,
    editorRef: topicViewEditorRef,
    avoidTopics,
    setAvoidTopics,
    includeTopics,
    setIncludeTopics,
  };

  const reportViewProps = {
    isOpen: isReportViewOpen,
    report: activeReport,
    onClose: handleReportClose,
    onOpenTopic: handleOpenTopic,
  };

  const outlineFormProps = {
    outlineTopic,
    setOutlineTopic,
    outlineInputMode,
    setOutlineInputMode,
    outlineSections,
    outlineJsonInput,
    setOutlineJsonInput,
    error: outlineError,
    jsonValidationError,
    trimmedJsonInput,
    isFormValid: isOutlineFormValid,
    isRunning,
    handleSubmit: handleOutlineSubmit,
    submitLabel: outlineSubmitLabel,
    handlers: outlineHandlers,
    avoidTopics: outlineAvoidTopics,
    setAvoidTopics: setOutlineAvoidTopics,
    includeTopics: outlineIncludeTopics,
    setIncludeTopics: setOutlineIncludeTopics,
  };

  const chatPaneProps = {
    messages: isHomeView ? [] : messages,
    mode,
    setMode,
    isRunning,
    onReset: handleReset,
    composerValue,
    setComposerValue,
    handleTopicSubmit,
    handleStop: stopGeneration,
    composerButtonLabel,
    sectionCount,
    setSectionCount,
    hideComposer: !isHomeView && isRunning,
    composerLocked: !isHomeView && !isRunning && hasCompletedReport,
    onViewReport: handleReportOpen,
    avoidTopics: chatAvoidTopics,
    setAvoidTopics: setChatAvoidTopics,
    includeTopics: chatIncludeTopics,
    setIncludeTopics: setChatIncludeTopics,
    ...modelSelectionProps,
  };

  const settingsProps = {
    isOpen: isSettingsOpen,
    onClose: handleCloseSettings,
    defaultPreset,
    onDefaultPresetChange: handleDefaultPresetChange,
    modelPresets,
    onPresetModelChange: handlePresetModelChange,
    suggestionModel,
    onSuggestionModelChange: handleSuggestionModelChange,
    user,
    onUserChange: setUser,
  };

  const mainProps = {
    chatPaneClassName,
    shouldShowExplore,
    exploreProps,
    topicViewProps,
    reportViewProps,
    chatPaneProps,
    outlineFormProps,
  };

  return <AppLayout sidebarProps={sidebarProps} mainProps={mainProps} settingsProps={settingsProps} />;
}

function findLatestAssistantReportMessage(messages) {
  return [...messages].reverse().find((message) => message.role === 'assistant' && message.reportTopic);
}

export default App;
