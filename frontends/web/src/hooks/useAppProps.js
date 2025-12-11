import { useCallback } from 'react';
import { useAppState } from './useAppState';
import { useSettingsController } from './useSettingsController';
import { useSavedCollectionsController } from './useSavedCollectionsController';
import { useChatController } from './useChatController';
import { useGeneration } from './useGeneration';
import { useTopicViewController } from './useTopicViewController';
import { useExploreController } from './useExploreController';
import { useOutlineController } from './useOutlineController';
import { useChatPaneController } from './useChatPaneController';
import { useMainViewState } from './useMainViewState';

export function useAppProps() {
    const appState = useAppState();

    const settings = useSettingsController({ user: appState.user, setUser: appState.setUser });

    const saved = useSavedCollectionsController({ apiBase: appState.apiBase, user: appState.user });

    const chat = useChatController({
        apiBase: appState.apiBase,
        rememberReport: saved.rememberReport,
        forgetReport: saved.forgetReport,
        setIsHomeView: appState.setIsHomeView,
    });

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

    const topicViewController = useTopicViewController({
        apiBase: appState.apiBase,
        suggestionModel: settings.suggestionModel,
        rememberTopics: saved.rememberTopics,
        isRunning: chat.isRunning,
        runTopicPrompt,
        normalizeTopicForOpen: appState.normalizeTopicForOpen,
    });

    const handleReportOpen = useCallback(
        (reportPayload) => {
            topicViewController.closeTopicView();
            appState.handleReportOpen(reportPayload);
        },
        [appState, topicViewController]
    );

    const handleTopicViewBarSubmit = useCallback(
        (event) => {
            event.preventDefault();
            const normalized = appState.topicViewBarValue.trim();
            if (!normalized) return;
            topicViewController.handleOpenTopic(normalized);
            appState.setTopicViewBarValue('');
        },
        [appState, topicViewController]
    );

    const handleTopicRecall = useCallback((topic) => {
        topicViewController.handleOpenTopic(topic);
    }, [topicViewController]);

    const handleReset = useCallback(() => {
        topicViewController.closeTopicView();
        appState.resetToHome(chat.isRunning ? null : () => chat.setMessages([]));
    }, [appState, chat, topicViewController]);

    const handleGeneratingReportSelect = useCallback(() => {
        appState.setActiveReport(null);
        topicViewController.closeTopicView();
        appState.setIsHomeView(false);
    }, [appState, topicViewController]);

    const explore = useExploreController({
        apiBase: appState.apiBase,
        savedTopics: saved.savedTopics,
        savedReports: saved.savedReports,
        suggestionModel: settings.suggestionModel,
        rememberTopics: saved.rememberTopics,
        handleOpenTopic: topicViewController.handleOpenTopic,
    });

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
        topicViewTopic: topicViewController.topicViewTopic,
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
        handleForgetReport: chat.handleForgetReport,
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
        onOpenTopic: topicViewController.handleOpenTopic,
    };

    const mainProps = {
        chatPaneClassName: mainViewState.chatPaneClassName,
        shouldShowExplore: mainViewState.shouldShowExplore,
        exploreProps: explore.exploreProps,
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
