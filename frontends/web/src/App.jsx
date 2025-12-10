import { useCallback, useMemo, useEffect } from 'react';
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

import { Sidebar } from './components/Sidebar';
import { ChatPane } from './components/ChatPane';
import { TopicView } from './components/TopicView';
import { OutlineForm } from './components/OutlineForm';
import { ReportView } from './components/ReportView';
import { ExploreSuggestions } from './components/ExploreSuggestions';
import { SettingsModal } from './components/SettingsModal';

import { MODEL_PRESET_LABELS } from './utils/modelPresets';

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
    setSavedTopics,
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
    loadCollections,
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
  useEffect(() => {
    if (!isRunning) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = 'A report is still generating. Leaving will stop it.';
      return event.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning]);

  // Report deletion handler
  const handleForgetReport = useCallback(async (id) => {
    const reportToDelete = await forgetReport(id);
    if (reportToDelete && !isRunning) {
      const assistantMsg = [...messages].reverse().find((m) => m.role === 'assistant' && m.reportTopic);
      if (assistantMsg && assistantMsg.reportTopic === reportToDelete.topic) {
        setMessages([]);
        setIsHomeView(true);
      }
    }
  }, [forgetReport, messages, isRunning, setMessages, setIsHomeView]);

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
    const avoid = chatAvoidTopics.split(',').map((s) => s.trim()).filter(Boolean);
    const include = chatIncludeTopics.split(',').map((s) => s.trim()).filter(Boolean);
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

  // Computed values
  const composerButtonLabel = isRunning ? 'Stop' : 'Generate Report';
  const outlineSubmitLabel = isRunning ? 'Working…' : 'Generate report';
  const presetLabel = MODEL_PRESET_LABELS[selectedPreset] || selectedPreset;

  const normalizedOutlineTopic = outlineTopic.trim();
  const lineModeValidity = outlineSections.every((section) => section.title.trim());
  const isLineModeValid = Boolean(normalizedOutlineTopic && lineModeValidity);

  const trimmedJsonInput = outlineJsonInput.trim();
  let jsonValidationError = '';
  if (outlineInputMode === 'json' && trimmedJsonInput) {
    try {
      const parsed = JSON.parse(trimmedJsonInput);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sections)) {
        jsonValidationError = 'JSON outline must contain a sections array.';
      } else if (
        !parsed.sections.length ||
        !parsed.sections.every(
          (section) =>
            section &&
            typeof section.title === 'string' &&
            section.title.trim() &&
            Array.isArray(section.subsections)
        )
      ) {
        jsonValidationError = 'Each JSON section needs a title.';
      }
    } catch (error) {
      jsonValidationError = error.message || 'Enter valid JSON.';
    }
  }

  const isJsonModeValid = Boolean(normalizedOutlineTopic && trimmedJsonInput && !jsonValidationError);
  const isOutlineFormValid = outlineInputMode === 'lines' ? isLineModeValid : isJsonModeValid;

  const hasMessages = messages.length > 0;
  const isTopicViewOpen = Boolean(topicViewTopic);

  const isTopicSaved = useMemo(
    () => savedTopics.some((entry) => entry.prompt === topicViewTopic),
    [savedTopics, topicViewTopic]
  );

  const hasCompletedReport = useMemo(
    () => messages.some((message) => message.role === 'assistant' && Boolean(message.reportText)),
    [messages]
  );

  const shouldShowExplore = isHomeView || (!isTopicViewOpen && !isReportViewOpen && !hasMessages);

  const generatingReport = useMemo(() => {
    if (!isRunning && (!hasMessages || !isHomeView)) return null;
    const assistantMsg = [...messages].reverse().find((m) => m.role === 'assistant' && m.reportTopic);
    if (assistantMsg) {
      const isSaved = savedReports.some((r) => r.topic === assistantMsg.reportTopic);
      if (isSaved && !isRunning) return null;
      return {
        id: 'generating',
        topic: assistantMsg.reportTopic,
        title: assistantMsg.reportTopic,
        isGenerating: isRunning,
      };
    }
    return null;
  }, [isRunning, messages, hasMessages, isHomeView, savedReports]);

  // Chat pane classes
  const chatPaneClasses = ['chat-pane'];
  if (isHomeView || (!hasMessages && !isTopicViewOpen && !isReportViewOpen)) {
    chatPaneClasses.push('chat-pane--empty');
  }
  if (isTopicViewOpen || isReportViewOpen) {
    chatPaneClasses.push('chat-pane--topic-view');
  }
  const chatPaneClassName = chatPaneClasses.join(' ');

  // Auto-show home when empty
  useEffect(() => {
    if (isRunning || isTopicViewOpen || isReportViewOpen || isHomeView) return;
    if (messages.length === 0) {
      setIsHomeView(true);
      setMode('topic');
    }
  }, [isRunning, isTopicViewOpen, isReportViewOpen, isHomeView, messages.length, setMode, setIsHomeView]);

  // Feature flag for collections (enable for users with email set)
  const useCollectionsFeature = Boolean(user?.email);

  return (
    <div className="page">
      <Sidebar
        savedTopics={savedTopics}
        savedReports={savedReports}
        generatingReport={generatingReport}
        onGeneratingReportSelect={handleGeneratingReportSelect}
        handleTopicRecall={handleTopicRecall}
        handleTopicRemove={forgetTopic}
        handleReportRemove={handleForgetReport}
        topicViewBarValue={topicViewBarValue}
        setTopicViewBarValue={setTopicViewBarValue}
        handleTopicViewBarSubmit={handleTopicViewBarSubmit}
        onOpenSettings={handleOpenSettings}
        onReportSelect={handleReportOpen}
        onResetExplore={handleReset}
        isSyncing={isSyncingSaved || isLoadingCollections}
        savedError={savedError}
        // Collections props
        useCollections={useCollectionsFeature}
        collections={collections}
        expandedCollections={expandedCollections}
        isCreatingCollection={isCreatingCollection}
        newCollectionName={newCollectionName}
        editingCollectionId={editingCollectionId}
        onToggleCollectionExpanded={toggleCollectionExpanded}
        onCreateCollection={handleCreateCollection}
        onUpdateCollection={handleUpdateCollection}
        onDeleteCollection={handleDeleteCollection}
        onStartCreatingCollection={startCreatingCollection}
        onCancelCreatingCollection={cancelCreatingCollection}
        onStartEditingCollection={startEditingCollection}
        onCancelEditingCollection={cancelEditingCollection}
        onNewCollectionNameChange={setNewCollectionName}
        onMoveTopicToCollection={handleMoveTopicToCollection}
      />
      <main className={chatPaneClassName}>
        {shouldShowExplore && (
          <ExploreSuggestions
            exploreSuggestions={exploreSuggestions}
            exploreLoading={exploreLoading}
            selectedExploreSuggestions={selectedExploreSuggestions}
            exploreSelectMode={exploreSelectMode}
            exploreSelectToggleRef={exploreSelectToggleRef}
            exploreSuggestionsRef={exploreSuggestionsRef}
            handleRefreshExplore={handleRefreshExplore}
            handleToggleExploreSuggestion={handleToggleExploreSuggestion}
            handleToggleExploreSelectMode={handleToggleExploreSelectMode}
            handleOpenTopic={handleOpenTopic}
          />
        )}
        {isTopicViewOpen ? (
          <TopicView
            topic={topicViewTopic}
            isEditing={isTopicEditing}
            draft={topicViewDraft}
            setDraft={setTopicViewDraft}
            isSaved={isTopicSaved}
            suggestions={topicSuggestions}
            suggestionsLoading={topicSuggestionsLoading}
            selectedSuggestions={selectedSuggestions}
            selectMode={topicSelectMode}
            presetLabel={presetLabel}
            stageModels={stageModels}
            onStageModelChange={handleStageModelChange}
            selectedPreset={selectedPreset}
            onPresetSelect={handlePresetSelect}
            selectToggleRef={topicSelectToggleRef}
            suggestionsRef={topicSuggestionsRef}
            isRunning={isRunning}
            handlers={{
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
            }}
            editorRef={topicViewEditorRef}
            avoidTopics={avoidTopics}
            setAvoidTopics={setAvoidTopics}
            includeTopics={includeTopics}
            setIncludeTopics={setIncludeTopics}
          />
        ) : isReportViewOpen ? (
          <ReportView
            report={activeReport}
            onClose={handleReportClose}
            onOpenTopic={handleOpenTopic}
          />
        ) : (
          <ChatPane
            messages={isHomeView ? [] : messages}
            mode={mode}
            setMode={setMode}
            isRunning={isRunning}
            onReset={handleReset}
            composerValue={composerValue}
            setComposerValue={setComposerValue}
            handleTopicSubmit={handleTopicSubmit}
            handleStop={stopGeneration}
            composerButtonLabel={composerButtonLabel}
            sectionCount={sectionCount}
            setSectionCount={setSectionCount}
            presetLabel={presetLabel}
            outlineForm={
              <OutlineForm
                outlineTopic={outlineTopic}
                setOutlineTopic={setOutlineTopic}
                outlineInputMode={outlineInputMode}
                setOutlineInputMode={setOutlineInputMode}
                outlineSections={outlineSections}
                outlineJsonInput={outlineJsonInput}
                setOutlineJsonInput={setOutlineJsonInput}
                error={outlineError}
                jsonValidationError={jsonValidationError}
                trimmedJsonInput={trimmedJsonInput}
                isFormValid={isOutlineFormValid}
                isRunning={isRunning}
                handleSubmit={handleOutlineSubmit}
                submitLabel={outlineSubmitLabel}
                handlers={{
                  handleAddSection: handleAddOutlineSection,
                  handleRemoveSection: handleRemoveOutlineSection,
                  handleSectionTitleChange: handleOutlineSectionTitleChange,
                  handleSubsectionChange: handleOutlineSubsectionChange,
                  handleAddSubsection: handleAddSubsectionLine,
                  handleRemoveSubsection: handleRemoveSubsectionLine,
                }}
                avoidTopics={outlineAvoidTopics}
                setAvoidTopics={setOutlineAvoidTopics}
                includeTopics={outlineIncludeTopics}
                setIncludeTopics={setOutlineIncludeTopics}
              />
            }
            stageModels={stageModels}
            onStageModelChange={handleStageModelChange}
            selectedPreset={selectedPreset}
            onPresetSelect={handlePresetSelect}
            hideComposer={!isHomeView && isRunning}
            composerLocked={!isHomeView && !isRunning && hasCompletedReport}
            onViewReport={handleReportOpen}
            avoidTopics={chatAvoidTopics}
            setAvoidTopics={setChatAvoidTopics}
            includeTopics={chatIncludeTopics}
            setIncludeTopics={setChatIncludeTopics}
          />
        )}
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        defaultPreset={defaultPreset}
        onDefaultPresetChange={handleDefaultPresetChange}
        modelPresets={modelPresets}
        onPresetModelChange={handlePresetModelChange}
        suggestionModel={suggestionModel}
        onSuggestionModelChange={handleSuggestionModelChange}
        user={user}
        onUserChange={setUser}
      />
    </div>
  );
}

export default App;
