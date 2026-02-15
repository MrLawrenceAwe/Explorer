import { useCallback } from 'react';
import { useAppState } from './useAppState';
import { useSettingsController } from './useSettingsController';
import { useSavedData } from './useSavedData';
import { useCollections } from './useCollections';
import { useChat } from './useChat';
import { useBeforeUnloadWarning } from './useBeforeUnloadWarning';
import { useGeneration } from './useGeneration';
import { useTopicView } from './useTopicView';
import { useExplore } from './useExplore';
import { useOutlineController } from './useOutlineController';
import { useChatPaneController } from './useChatPaneController';
import { useMainViewState } from './useMainViewState';

export function useAppProps() {
    const appState = useAppState();

    const settings = useSettingsController({ user: appState.user, setUser: appState.setUser });

    const savedData = useSavedData({ apiBase: appState.apiBase, user: appState.user });
    const handleSavedDataError = useCallback(
        (msg) => savedData.setError(msg),
        [savedData.setError]
    );
    const handleTopicMoved = useCallback(
        (updatedTopic) => savedData.updateTopicCollection(updatedTopic.id, updatedTopic.collectionId),
        [savedData.updateTopicCollection]
    );
    const collections = useCollections({
        apiBase: appState.apiBase,
        user: appState.user,
        onTopicMoved: handleTopicMoved,
        onError: handleSavedDataError,
    });
    const saved = {
        ...savedData,
        collections,
    };

    const chat = useChat(appState.apiBase, saved.rememberReport);
    useBeforeUnloadWarning(chat.isRunning);

    const handleForgetReport = useCallback(
        async (id) => {
            const reportToDelete = await saved.forgetReport(id);
            if (!reportToDelete || chat.isRunning) return;

            const assistantMsg = findLatestAssistantReportMessage(chat.messages);
            if (assistantMsg && assistantMsg.reportTopic === reportToDelete.topic) {
                chat.setMessages([]);
                appState.setIsHomeView(true);
            }
        },
        [appState.setIsHomeView, chat.isRunning, chat.messages, chat.setMessages, saved.forgetReport]
    );

    const { runTopicPrompt } = useGeneration({
        user: appState.user,
        modelsPayload: settings.modelsPayload,
        sectionCount: appState.sectionCount,
        rememberTopic: saved.rememberTopic,
        appendMessage: chat.appendMessage,
        runReportFlow: chat.runReportFlow,
        setActiveReport: appState.setActiveReport,
        setIsRunning: chat.setIsRunning,
        isRunning: chat.isRunning,
    });

    const topicView = useTopicView({
        apiBase: appState.apiBase,
        suggestionModel: settings.suggestionModel,
        rememberTopics: saved.rememberTopics,
        isRunning: chat.isRunning,
        runTopicPrompt,
    });

    const handleOpenTopic = useCallback(
        (topic, options = {}) => {
            const safeTopic = appState.normalizeTopicForOpen(topic, options);
            if (!safeTopic) return;
            topicView.openTopicView(safeTopic, {
                pauseSuggestions: Boolean(options.pauseSuggestions),
            });
        },
        [appState.normalizeTopicForOpen, topicView.openTopicView]
    );

    const topicViewController = {
        ...topicView,
        handleOpenTopic,
    };

    const handleReportOpen = useCallback(
        (reportPayload) => {
            topicView.closeTopicView();
            appState.handleReportOpen(reportPayload);
        },
        [appState.handleReportOpen, topicView.closeTopicView]
    );

    const handleTopicViewBarSubmit = useCallback(
        (event) => {
            event.preventDefault();
            const normalized = appState.topicViewBarValue.trim();
            if (!normalized) return;
            handleOpenTopic(normalized);
            appState.setTopicViewBarValue('');
        },
        [appState.setTopicViewBarValue, appState.topicViewBarValue, handleOpenTopic]
    );

    const handleTopicRecall = useCallback((topic) => {
        handleOpenTopic(topic);
    }, [handleOpenTopic]);

    const handleReset = useCallback(() => {
        topicView.closeTopicView();
        appState.resetToHome(chat.isRunning ? null : () => chat.setMessages([]));
    }, [appState.resetToHome, chat.isRunning, chat.setMessages, topicView.closeTopicView]);

    const handleGeneratingReportSelect = useCallback(() => {
        appState.setActiveReport(null);
        topicView.closeTopicView();
        appState.setIsHomeView(false);
    }, [appState.setActiveReport, appState.setIsHomeView, topicView.closeTopicView]);

    const explore = useExplore({
        apiBase: appState.apiBase,
        savedTopics: saved.savedTopics,
        savedReports: saved.savedReports,
        suggestionModel: settings.suggestionModel,
        rememberTopics: saved.rememberTopics,
    });
    const exploreProps = {
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
    };

    const outline = useOutlineController({
        user: appState.user,
        isRunning: chat.isRunning,
        appendMessage: chat.appendMessage,
        removeMessages: chat.removeMessages,
        modelsPayload: settings.modelsPayload,
        setActiveReport: appState.setActiveReport,
        setIsRunning: chat.setIsRunning,
        setIsHomeView: appState.setIsHomeView,
        runReportFlow: chat.runReportFlow,
    });

    const mainViewState = useMainViewState({
        isRunning: chat.isRunning,
        isHomeView: appState.isHomeView,
        isReportViewOpen: appState.isReportViewOpen,
        messages: chat.messages,
        savedReports: saved.savedReports,
        savedTopics: saved.savedTopics,
        topicViewTopic: topicView.topicViewTopic,
        setIsHomeView: appState.setIsHomeView,
        setMode: appState.setMode,
    });

    const { chatPaneProps } = useChatPaneController({
        composerValue: appState.composerValue,
        setComposerValue: appState.setComposerValue,
        chatAvoidTopics: appState.chatAvoidTopics,
        chatIncludeTopics: appState.chatIncludeTopics,
        setChatAvoidTopics: appState.setChatAvoidTopics,
        setChatIncludeTopics: appState.setChatIncludeTopics,
        isRunning: chat.isRunning,
        runTopicPrompt,
        setIsHomeView: appState.setIsHomeView,
        messages: chat.messages,
        mode: appState.mode,
        setMode: appState.setMode,
        onReset: handleReset,
        stopGeneration: chat.stopGeneration,
        sectionCount: appState.sectionCount,
        setSectionCount: appState.setSectionCount,
        isHomeView: appState.isHomeView,
        hasCompletedReport: mainViewState.hasCompletedReport,
        handleReportOpen,
        modelSelectionProps: settings.modelSelectionProps,
    });

    const sidebarProps = buildSidebarProps({
        saved,
        collections: saved.collections,
        topicViewBarValue: appState.topicViewBarValue,
        setTopicViewBarValue: appState.setTopicViewBarValue,
        handleTopicViewBarSubmit,
        handleTopicRecall,
        handleForgetReport,
        handleReportOpen,
        handleReset,
        handleGeneratingReportSelect,
        useCollectionsFeature: Boolean(appState.user?.email),
        handleOpenSettings: settings.handleOpenSettings,
        generatingReport: mainViewState.generatingReport,
    });

    const topicViewProps = buildTopicViewProps({
        topicViewController,
        modelSelectionProps: settings.modelSelectionProps,
        mainViewState,
        sectionCount: appState.sectionCount,
        setSectionCount: appState.setSectionCount,
        isRunning: chat.isRunning,
    });

    const reportViewProps = {
        isOpen: appState.isReportViewOpen,
        report: appState.activeReport,
        onClose: appState.handleReportClose,
        onOpenTopic: handleOpenTopic,
    };

    const mainProps = {
        chatPaneClassName: mainViewState.chatPaneClassName,
        shouldShowExplore: mainViewState.shouldShowExplore,
        exploreProps,
        topicViewProps,
        reportViewProps,
        chatPaneProps,
        outlineFormProps: outline.outlineFormProps,
    };

    return { sidebarProps, mainProps, settingsProps: settings.settingsProps };
}

function buildSidebarProps({
    saved,
    collections,
    topicViewBarValue,
    setTopicViewBarValue,
    handleTopicViewBarSubmit,
    handleTopicRecall,
    handleForgetReport,
    handleReportOpen,
    handleReset,
    handleGeneratingReportSelect,
    useCollectionsFeature,
    handleOpenSettings,
    generatingReport,
}) {
    const { savedTopics, savedReports, forgetTopic } = saved;
    const isSyncing = saved.isSyncing || collections.isLoading;

    return {
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
        isSyncing,
        savedError: saved.error,
        useCollections: useCollectionsFeature,
        collections: collections.collections,
        expandedCollections: collections.expandedCollections,
        isCreatingCollection: collections.isCreating,
        newCollectionName: collections.newCollectionName,
        editingCollectionId: collections.editingCollectionId,
        onToggleCollectionExpanded: collections.toggleCollectionExpanded,
        onCreateCollection: collections.handleCreateCollection,
        onUpdateCollection: collections.handleUpdateCollection,
        onDeleteCollection: collections.handleDeleteCollection,
        onStartCreatingCollection: collections.startCreating,
        onCancelCreatingCollection: collections.cancelCreating,
        onStartEditingCollection: collections.startEditing,
        onCancelEditingCollection: collections.cancelEditing,
        onNewCollectionNameChange: collections.setNewCollectionName,
        onMoveTopicToCollection: collections.handleMoveTopicToCollection,
    };
}

function buildTopicViewProps({ topicViewController, modelSelectionProps, mainViewState, sectionCount, setSectionCount, isRunning }) {
    return {
        isOpen: mainViewState.isTopicViewOpen,
        topic: topicViewController.topicViewTopic,
        isEditing: topicViewController.isTopicEditing,
        draft: topicViewController.topicViewDraft,
        setDraft: topicViewController.setTopicViewDraft,
        isSaved: mainViewState.isTopicSaved,
        suggestions: topicViewController.topicSuggestions,
        suggestionsLoading: topicViewController.topicSuggestionsLoading,
        selectedSuggestions: topicViewController.selectedSuggestions,
        selectMode: topicViewController.topicSelectMode,
        selectToggleRef: topicViewController.topicSelectToggleRef,
        suggestionsRef: topicViewController.topicSuggestionsRef,
        isRunning,
        ...modelSelectionProps,
        handlers: {
            startEditing: topicViewController.startTopicEditing,
            cancelEditing: topicViewController.cancelTopicEditing,
            commitEditing: topicViewController.commitTopicEdit,
            handleEditSubmit: topicViewController.handleTopicEditSubmit,
            handleEditBlur: topicViewController.handleTopicEditBlur,
            handleEditKeyDown: topicViewController.handleTopicEditKeyDown,
            handleTitleKeyDown: topicViewController.handleTopicTitleKeyDown,
            handleSave: topicViewController.handleTopicViewSave,
            handleGenerate: topicViewController.handleTopicViewGenerate,
            handleClose: topicViewController.closeTopicView,
            handleOpenTopic: topicViewController.handleOpenTopic,
            handleToggleSuggestion: topicViewController.handleSuggestionToggle,
            handleSaveSelectedSuggestions: topicViewController.handleSaveSelectedSuggestions,
            handleRefreshSuggestions: topicViewController.handleRefreshSuggestions,
            handleToggleSelectMode: topicViewController.handleToggleTopicSelectMode,
            sectionCount,
            setSectionCount,
        },
        editorRef: topicViewController.topicViewEditorRef,
        avoidTopics: topicViewController.avoidTopics,
        setAvoidTopics: topicViewController.setAvoidTopics,
        includeTopics: topicViewController.includeTopics,
        setIncludeTopics: topicViewController.setIncludeTopics,
    };
}

function findLatestAssistantReportMessage(messages) {
    return [...messages].reverse().find((message) => message.role === 'assistant' && message.reportTopic);
}
