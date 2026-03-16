import { useState } from 'react';
import { useAppState } from './useAppState';
import { useSettingsViewModel } from './useSettingsViewModel';
import { useSavedData } from './useSavedData';
import { useCollections } from './useCollections';
import { useChat } from './useChat';
import { useBeforeUnloadWarning } from './useBeforeUnloadWarning';
import { useGeneration } from './useGeneration';
import { useTopicView } from './useTopicView';
import { useExploreSuggestions } from './useExploreSuggestions';
import { useOutlineController } from './useOutlineController';
import { useChatPaneProps } from './useChatPaneProps';
import { useMainViewModel } from './useMainViewModel';
import { useCourses } from './useCourses';

export function useAppViewModel() {
    const appState = useAppState();
    const [activePage, setActivePage] = useState('explore');
    const courses = useCourses();

    const settings = useSettingsViewModel({ user: appState.user, setUser: appState.setUser });
    const savedData = useSavedData({ apiBase: appState.apiBase, user: appState.user });
    const collections = useCollections({
        apiBase: appState.apiBase,
        user: appState.user,
        onTopicMoved: handleTopicMoved,
        onError: savedData.setError,
    });
    const saved = {
        ...savedData,
        collections,
    };

    const chat = useChat(appState.apiBase, saved.syncSavedReportsAfterGeneration);
    useBeforeUnloadWarning(chat.isRunning);

    const { generateReportFromTopic, generateReportsFromTopics, coursesGenerationProgress } = useGeneration({
        user: appState.user,
        modelsPayload: settings.modelsPayload,
        sectionCount: appState.sectionCount,
        saveTopic: saved.saveTopic,
        appendMessage: chat.appendMessage,
        runReportFlow: chat.runReportFlow,
        setActiveReport: appState.setActiveReport,
        setIsRunning: chat.setIsRunning,
        isRunning: chat.isRunning,
    });

    const topicView = useTopicView({
        apiBase: appState.apiBase,
        suggestionModel: settings.suggestionModel,
        saveTopics: saved.saveTopics,
        isRunning: chat.isRunning,
        generateReportFromTopic,
    });

    const exploreSuggestions = useExploreSuggestions({
        apiBase: appState.apiBase,
        savedTopics: saved.savedTopics,
        savedReports: saved.savedReports,
        suggestionModel: settings.suggestionModel,
        saveTopics: saved.saveTopics,
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

    const mainViewState = useMainViewModel({
        isRunning: chat.isRunning,
        isHomeView: appState.isHomeView,
        isReportViewOpen: appState.isReportViewOpen,
        messages: chat.messages,
        savedReports: saved.savedReports,
        savedTopics: saved.savedTopics,
        activeTopic: topicView.activeTopic,
        setIsHomeView: appState.setIsHomeView,
        setMode: appState.setMode,
    });

    const { chatPaneProps } = useChatPaneProps({
        composerValue: appState.composerValue,
        setComposerValue: appState.setComposerValue,
        chatAvoidTopics: appState.chatAvoidTopics,
        chatIncludeTopics: appState.chatIncludeTopics,
        setChatAvoidTopics: appState.setChatAvoidTopics,
        setChatIncludeTopics: appState.setChatIncludeTopics,
        isRunning: chat.isRunning,
        generateReportFromTopic,
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

    const topicViewController = {
        ...topicView,
        handleOpenTopic,
    };
    const sidebarProps = buildSidebarProps({
        saved,
        collections: saved.collections,
        quickTopicInputValue: appState.quickTopicInputValue,
        setQuickTopicInputValue: appState.setQuickTopicInputValue,
        handleQuickTopicSubmit,
        handleTopicRecall,
        handleForgetReport,
        handleReportOpen,
        handleReset,
        handleGeneratingReportSelect,
        handleOpenCourses,
        handleOpenExplorer,
        activePage,
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
    const exploreProps = {
        suggestions: exploreSuggestions.suggestions,
        isLoading: exploreSuggestions.isLoading,
        selectedSuggestions: exploreSuggestions.selectedSuggestions,
        isSelectMode: exploreSuggestions.isSelectMode,
        selectToggleRef: exploreSuggestions.selectToggleRef,
        suggestionsRef: exploreSuggestions.suggestionsRef,
        onRefresh: exploreSuggestions.refreshSuggestions,
        onToggleSuggestion: exploreSuggestions.toggleSuggestionSelection,
        onToggleSelectMode: exploreSuggestions.toggleSelectMode,
        handleOpenTopic,
    };
    const mainProps = {
        chatPaneClassName: mainViewState.chatPaneClassName,
        isCoursesPage: activePage === 'courses',
        coursesProps: {
            courses: courses.courses,
            onAddCourse: courses.addCourse,
            onDeleteCourse: courses.deleteCourse,
            onDeleteModule: courses.deleteModuleFromCourse,
            onDeleteTopic: courses.deleteTopicFromModule,
            onToggleModule: courses.toggleModule,
            onToggleTopic: courses.toggleTopic,
            onAddTopicToModule: courses.addTopicToModule,
            onAddModuleToCourse: courses.addModuleToCourse,
            onGenerateTopicReport: handleGenerateTopicFromCourses,
            onGenerateModuleReports: handleGenerateModuleFromCourses,
            onGenerateCourseReports: handleGenerateCourseFromCourses,
            onCancelGeneration: chat.stopGeneration,
            generationProgress: coursesGenerationProgress,
            isRunning: chat.isRunning,
        },
        shouldShowExplore: mainViewState.shouldShowExplore,
        exploreProps,
        topicViewProps,
        reportViewProps,
        chatPaneProps,
        outlineFormProps: outline.outlineFormProps,
    };

    return { sidebarProps, mainProps, settingsProps: settings.settingsProps };

    function handleTopicMoved(updatedTopic) {
        savedData.updateTopicCollection(updatedTopic.id, updatedTopic.collectionId);
    }

    async function handleForgetReport(reportId) {
        const reportToDelete = await saved.deleteSavedReportEntry(reportId);
        if (!reportToDelete || chat.isRunning) return;

        const assistantMsg = findLatestAssistantReportMessage(chat.messages);
        if (assistantMsg && assistantMsg.reportTopic === reportToDelete.topic) {
            chat.setMessages([]);
            appState.setIsHomeView(true);
            setActivePage('explore');
        }
    }

    function handleOpenTopic(topic, options = {}) {
        const safeTopic = appState.normalizeTopicForOpen(topic, options);
        if (!safeTopic) return;
        setActivePage('explore');
        topicView.openTopicView(safeTopic, {
            pauseSuggestions: Boolean(options.pauseSuggestions),
        });
    }

    function handleReportOpen(reportPayload) {
        topicView.closeTopicView();
        setActivePage('explore');
        appState.handleReportOpen(reportPayload);
    }

    function handleQuickTopicSubmit(event) {
        event.preventDefault();
        const normalized = appState.quickTopicInputValue.trim();
        if (!normalized) return;
        handleOpenTopic(normalized);
        appState.setQuickTopicInputValue('');
    }

    function handleTopicRecall(topic) {
        handleOpenTopic(topic);
    }

    function handleReset() {
        setActivePage('explore');
        topicView.closeTopicView();
        appState.resetToHome(chat.isRunning ? null : () => chat.setMessages([]));
    }

    function handleGeneratingReportSelect() {
        setActivePage('explore');
        appState.setActiveReport(null);
        topicView.closeTopicView();
        appState.setIsHomeView(false);
    }

    function handleOpenCourses() {
        topicView.closeTopicView();
        appState.setActiveReport(null);
        appState.setIsHomeView(false);
        setActivePage('courses');
    }

    function handleOpenExplorer() {
        setActivePage('explore');
    }

    async function handleGenerateTopicFromCourses(topicTitle) {
        await generateReportsFromTopics([topicTitle], {
            scopeType: 'topic',
            scopeTitle: topicTitle,
        });
    }

    async function handleGenerateModuleFromCourses(moduleTitle, topics) {
        await generateReportsFromTopics(
            topics.map((topic) => topic.title),
            {
                scopeType: 'module',
                scopeTitle: moduleTitle,
            }
        );
    }

    async function handleGenerateCourseFromCourses(courseTitle, modules) {
        const topicTitles = modules.flatMap((module) => module.topics.map((topic) => topic.title));
        await generateReportsFromTopics(topicTitles, {
            scopeType: 'course',
            scopeTitle: courseTitle,
        });
    }
}

function buildSidebarProps({
    saved,
    collections,
    quickTopicInputValue,
    setQuickTopicInputValue,
    handleQuickTopicSubmit,
    handleTopicRecall,
    handleForgetReport,
    handleReportOpen,
    handleReset,
    handleGeneratingReportSelect,
    handleOpenCourses,
    handleOpenExplorer,
    activePage,
    useCollectionsFeature,
    handleOpenSettings,
    generatingReport,
}) {
    const { savedTopics, savedReports, deleteSavedTopicEntry } = saved;
    const isSyncing = saved.isSyncing || collections.isLoading;

    return {
        savedTopics,
        savedReports,
        generatingReport,
        onGeneratingReportSelect: handleGeneratingReportSelect,
        handleTopicRecall,
        handleTopicRemove: deleteSavedTopicEntry,
        handleReportRemove: handleForgetReport,
        quickTopicInputValue,
        setQuickTopicInputValue,
        handleQuickTopicSubmit,
        onOpenSettings: handleOpenSettings,
        onOpenCourses: handleOpenCourses,
        onOpenExplorer: handleOpenExplorer,
        activePage,
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

function buildTopicViewProps({
    topicViewController,
    modelSelectionProps,
    mainViewState,
    sectionCount,
    setSectionCount,
    isRunning,
}) {
    return {
        isOpen: mainViewState.isTopicViewOpen,
        topic: topicViewController.activeTopic,
        isEditing: topicViewController.isTopicEditing,
        draft: topicViewController.draftTopic,
        setDraft: topicViewController.setDraftTopic,
        isSaved: mainViewState.isTopicSaved,
        suggestions: topicViewController.topicSuggestions,
        suggestionsLoading: topicViewController.suggestionsLoading,
        selectedSuggestions: topicViewController.selectedSuggestions,
        selectMode: topicViewController.selectMode,
        selectToggleRef: topicViewController.selectToggleRef,
        suggestionsRef: topicViewController.suggestionsRef,
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
            handleGenerate: topicViewController.generateTopicReport,
            handleClose: topicViewController.closeTopicView,
            handleOpenTopic: topicViewController.handleOpenTopic,
            handleToggleSuggestion: topicViewController.handleSuggestionToggle,
            handleSaveSelectedSuggestions: topicViewController.handleSaveSelectedSuggestions,
            handleRefreshSuggestions: topicViewController.handleRefreshSuggestions,
            handleToggleSelectMode: topicViewController.handleToggleTopicSelectMode,
            sectionCount,
            setSectionCount,
        },
        editorRef: topicViewController.titleEditorRef,
        avoidTopics: topicViewController.avoidTopics,
        setAvoidTopics: topicViewController.setAvoidTopics,
        includeTopics: topicViewController.includeTopics,
        setIncludeTopics: topicViewController.setIncludeTopics,
    };
}

function findLatestAssistantReportMessage(messages) {
    return [...messages].reverse().find((message) => message.role === 'assistant' && message.reportTopic);
}
