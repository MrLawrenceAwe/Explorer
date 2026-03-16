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
import { useAppNavigation } from './useAppNavigation';
import {
    buildMainProps,
    buildSidebarProps,
    buildTopicViewProps,
} from '../utils/appViewModelBuilders';

export function useAppViewModel() {
    const appState = useAppState();
    const courses = useCourses();

    const settings = useSettingsViewModel({ user: appState.user, setUser: appState.setUser });
    const savedData = useSavedData({ apiBase: appState.apiBase, user: appState.user });
    const collections = useCollections({
        apiBase: appState.apiBase,
        user: appState.user,
        onTopicMoved: handleTopicMoved,
        onError: savedData.setError,
    });

    const chat = useChat(appState.apiBase, savedData.syncSavedReportsAfterGeneration);
    useBeforeUnloadWarning(chat.isRunning);

    const { generateReportFromTopic, generateReportsFromTopics, coursesGenerationProgress } = useGeneration({
        user: appState.user,
        modelsPayload: settings.modelsPayload,
        sectionCount: appState.sectionCount,
        saveTopic: savedData.saveTopic,
        appendMessage: chat.appendMessage,
        runReportFlow: chat.runReportFlow,
        setActiveReport: appState.setActiveReport,
        setIsRunning: chat.setIsRunning,
        isRunning: chat.isRunning,
    });

    const topicView = useTopicView({
        apiBase: appState.apiBase,
        suggestionModel: settings.suggestionModel,
        saveTopics: savedData.saveTopics,
        isRunning: chat.isRunning,
        generateReportFromTopic,
    });

    const exploreSuggestions = useExploreSuggestions({
        apiBase: appState.apiBase,
        savedTopics: savedData.savedTopics,
        savedReports: savedData.savedReports,
        suggestionModel: settings.suggestionModel,
        saveTopics: savedData.saveTopics,
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

    const navigation = useAppNavigation({
        appState,
        topicView,
        chat,
        deleteSavedReportEntry: savedData.deleteSavedReportEntry,
        generateReportsFromTopics,
    });

    const mainViewState = useMainViewModel({
        isRunning: chat.isRunning,
        isHomeView: appState.isHomeView,
        isReportViewOpen: appState.isReportViewOpen,
        messages: chat.messages,
        savedReports: savedData.savedReports,
        savedTopics: savedData.savedTopics,
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
        onReset: navigation.handleReset,
        stopGeneration: chat.stopGeneration,
        sectionCount: appState.sectionCount,
        setSectionCount: appState.setSectionCount,
        isHomeView: appState.isHomeView,
        hasCompletedReport: mainViewState.hasCompletedReport,
        handleReportOpen: navigation.handleReportOpen,
        modelSelectionProps: settings.modelSelectionProps,
    });

    const topicViewController = {
        ...topicView,
        handleOpenTopic: navigation.handleOpenTopic,
    };
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
        onOpenTopic: navigation.handleOpenTopic,
    };

    const sidebarProps = buildSidebarProps({
        savedTopics: savedData.savedTopics,
        savedReports: savedData.savedReports,
        deleteSavedTopicEntry: savedData.deleteSavedTopicEntry,
        isSyncing: savedData.isSyncing || collections.isLoading,
        savedError: savedData.error,
        collections,
        quickTopicInputValue: appState.quickTopicInputValue,
        setQuickTopicInputValue: appState.setQuickTopicInputValue,
        handleQuickTopicSubmit: navigation.handleQuickTopicSubmit,
        handleTopicRecall: navigation.handleTopicRecall,
        handleForgetReport: navigation.handleForgetReport,
        handleReportOpen: navigation.handleReportOpen,
        handleReset: navigation.handleReset,
        handleGeneratingReportSelect: navigation.handleGeneratingReportSelect,
        handleOpenCourses: navigation.handleOpenCourses,
        handleOpenExplorer: navigation.handleOpenExplorer,
        activePage: navigation.activePage,
        useCollectionsFeature: Boolean(appState.user?.email),
        handleOpenSettings: settings.handleOpenSettings,
        generatingReport: mainViewState.generatingReport,
    });
    const mainProps = buildMainProps({
        activePage: navigation.activePage,
        courses,
        coursesGenerationProgress,
        mainViewState,
        exploreSuggestions,
        topicViewProps,
        reportViewProps,
        chatPaneProps,
        outlineFormProps: outline.outlineFormProps,
        chat,
        navigation,
    });

    return { sidebarProps, mainProps, settingsProps: settings.settingsProps };

    function handleTopicMoved(updatedTopic) {
        savedData.updateTopicCollection(updatedTopic.id, updatedTopic.collectionId);
    }
}
