import React from 'react';
import { CollectionsList } from './CollectionsList';
import { SavedTopicsList } from './SavedTopicsList';
import { ReportsList } from './ReportsList';
import { GenerationBar } from './GenerationBar';

export function Sidebar({
    savedTopics,
    savedReports,
    handleTopicRecall,
    handleTopicRemove,
    handleReportRemove,
    quickTopicInputValue,
    setQuickTopicInputValue,
    handleQuickTopicSubmit,
    onOpenSettings,
    onOpenCourses,
    onOpenExplorer,
    onReportSelect,
    onResetExplore,
    activePage = 'explore',
    isSyncing,
    savedError,
    generatingReport,
    onGeneratingReportSelect,
    // Collections props
    collections = [],
    expandedCollections = new Set(),
    isCreatingCollection = false,
    newCollectionName = '',
    editingCollectionId = null,
    onToggleCollectionExpanded,
    onCreateCollection,
    onUpdateCollection,
    onDeleteCollection,
    onStartCreatingCollection,
    onCancelCreatingCollection,
    onStartEditingCollection,
    onCancelEditingCollection,
    onNewCollectionNameChange,
    onMoveTopicToCollection,
    useCollections = false,
}) {
    return (
        <aside className="sidebar" aria-label="Saved topics and generated reports">
            <button
                type="button"
                className="sidebar__brand"
                onClick={onResetExplore}
                aria-label="Back to home"
            >
                <div className="sidebar__logo">Ex</div>
                <div>
                    <div className="sidebar__title">Explorer</div>
                </div>
            </button>
            <button type="button" className="sidebar__settings-button" onClick={onOpenSettings}>
                Settings
            </button>
            <div className="sidebar__nav">
                <button
                    type="button"
                    className={`sidebar__nav-button${activePage === 'explore' ? ' sidebar__nav-button--active' : ''}`}
                    onClick={onOpenExplorer}
                >
                    Explorer
                </button>
                <button
                    type="button"
                    className={`sidebar__nav-button${activePage === 'courses' ? ' sidebar__nav-button--active' : ''}`}
                    onClick={onOpenCourses}
                >
                    Courses
                </button>
            </div>
            {savedError ? (
                <p className="sidebar__status sidebar__status--error">{savedError}</p>
            ) : isSyncing ? (
                <p className="sidebar__status">Syncing saved items…</p>
            ) : null}
            <GenerationBar
                quickTopicInputValue={quickTopicInputValue}
                setQuickTopicInputValue={setQuickTopicInputValue}
                handleQuickTopicSubmit={handleQuickTopicSubmit}
            />
            <div className="sidebar__content">
                {useCollections ? (
                    <CollectionsList
                        collections={collections}
                        savedTopics={savedTopics}
                        expandedCollections={expandedCollections}
                        isCreating={isCreatingCollection}
                        newCollectionName={newCollectionName}
                        editingCollectionId={editingCollectionId}
                        onToggleExpanded={onToggleCollectionExpanded}
                        onCreateCollection={onCreateCollection}
                        onUpdateCollection={onUpdateCollection}
                        onDeleteCollection={onDeleteCollection}
                        onStartCreating={onStartCreatingCollection}
                        onCancelCreating={onCancelCreatingCollection}
                        onStartEditing={onStartEditingCollection}
                        onCancelEditing={onCancelEditingCollection}
                        onNewCollectionNameChange={onNewCollectionNameChange}
                        onTopicRecall={handleTopicRecall}
                        onTopicRemove={handleTopicRemove}
                        onMoveTopicToCollection={onMoveTopicToCollection}
                    />
                ) : (
                    <SavedTopicsList
                        savedTopics={savedTopics}
                        handleTopicRecall={handleTopicRecall}
                        handleTopicRemove={handleTopicRemove}
                    />
                )}
                <ReportsList
                    savedReports={savedReports}
                    generatingReport={generatingReport}
                    onGeneratingReportSelect={onGeneratingReportSelect}
                    onReportSelect={onReportSelect}
                    handleReportRemove={handleReportRemove}
                />
            </div>
        </aside>
    );
}
