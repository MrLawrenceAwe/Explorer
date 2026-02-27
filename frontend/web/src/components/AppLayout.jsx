import React from "react";
import { Sidebar } from "./Sidebar";
import { ExploreSuggestions } from "./ExploreSuggestions";
import { TopicView } from "./TopicView";
import { ReportView } from "./ReportView";
import { ChatPane } from "./ChatPane";
import { OutlineForm } from "./OutlineForm";
import { SettingsModal } from "./SettingsModal";
import { CoursesView } from "./CoursesView";

export function AppLayout({ sidebarProps, mainProps, settingsProps }) {
    return (
        <div className="page">
            <Sidebar {...sidebarProps} />
            <MainContent {...mainProps} />
            <SettingsModal {...settingsProps} />
        </div>
    );
}

function MainContent({
    chatPaneClassName,
    isCoursesPage,
    coursesProps,
    shouldShowExplore,
    exploreProps,
    topicViewProps,
    reportViewProps,
    chatPaneProps,
    outlineFormProps,
}) {
    const { isOpen: isTopicOpen, ...topicProps } = topicViewProps;
    const { isOpen: isReportOpen, ...reportProps } = reportViewProps;

    return (
        <main className={isCoursesPage ? `${chatPaneClassName} chat-pane--courses` : chatPaneClassName}>
            {isCoursesPage ? (
                <CoursesView {...coursesProps} />
            ) : isTopicOpen ? (
                <TopicView {...topicProps} />
            ) : isReportOpen ? (
                <ReportView {...reportProps} />
            ) : (
                <>
                    {shouldShowExplore && <ExploreSuggestions {...exploreProps} />}
                    <ChatPane
                        {...chatPaneProps}
                        outlineForm={<OutlineForm {...outlineFormProps} />}
                    />
                </>
            )}
        </main>
    );
}
