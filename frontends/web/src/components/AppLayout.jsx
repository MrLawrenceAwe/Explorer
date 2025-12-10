import React from "react";
import { Sidebar } from "./Sidebar";
import { ExploreSuggestions } from "./ExploreSuggestions";
import { TopicView } from "./TopicView";
import { ReportView } from "./ReportView";
import { ChatPane } from "./ChatPane";
import { OutlineForm } from "./OutlineForm";
import { SettingsModal } from "./SettingsModal";

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
        <main className={chatPaneClassName}>
            {shouldShowExplore && <ExploreSuggestions {...exploreProps} />}
            {isTopicOpen ? (
                <TopicView {...topicProps} />
            ) : isReportOpen ? (
                <ReportView {...reportProps} />
            ) : (
                <ChatPane
                    {...chatPaneProps}
                    outlineForm={<OutlineForm {...outlineFormProps} />}
                />
            )}
        </main>
    );
}
