import React, { useState, useRef, useEffect } from 'react';

/**
 * CollectionsList component for displaying and managing topic collections in the sidebar.
 */
export function CollectionsList({
    collections,
    savedTopics,
    expandedCollections,
    isCreating,
    newCollectionName,
    editingCollectionId,
    onToggleExpanded,
    onCreateCollection,
    onUpdateCollection,
    onDeleteCollection,
    onStartCreating,
    onCancelCreating,
    onStartEditing,
    onCancelEditing,
    onNewCollectionNameChange,
    onTopicRecall,
    onTopicRemove,
    onMoveTopicToCollection,
}) {
    const [editName, setEditName] = useState('');
    const createInputRef = useRef(null);
    const editInputRef = useRef(null);

    // Focus input when creating
    useEffect(() => {
        if (isCreating && createInputRef.current) {
            createInputRef.current.focus();
        }
    }, [isCreating]);

    // Focus input when editing
    useEffect(() => {
        if (editingCollectionId && editInputRef.current) {
            const collection = collections.find((entry) => entry.id === editingCollectionId);
            if (collection) {
                setEditName(collection.name);
                editInputRef.current.focus();
                editInputRef.current.select();
            }
        }
    }, [editingCollectionId, collections]);

    // Group topics by collection
    const topicsByCollection = {};
    const uncategorizedTopics = [];

    savedTopics.forEach((topic) => {
        if (topic.collectionId) {
            if (!topicsByCollection[topic.collectionId]) {
                topicsByCollection[topic.collectionId] = [];
            }
            topicsByCollection[topic.collectionId].push(topic);
        } else {
            uncategorizedTopics.push(topic);
        }
    });

    const handleCreateSubmit = (event) => {
        event.preventDefault();
        if (newCollectionName.trim()) {
            onCreateCollection(newCollectionName.trim());
        }
    };

    const handleEditSubmit = (event) => {
        event.preventDefault();
        if (editName.trim() && editingCollectionId) {
            onUpdateCollection(editingCollectionId, { name: editName.trim() });
        }
    };

    const handleCreateKeyDown = (event) => {
        if (event.key === 'Escape') {
            onCancelCreating();
        }
    };

    const handleEditKeyDown = (event) => {
        if (event.key === 'Escape') {
            onCancelEditing();
        }
    };

    const renderTopicItem = (topic, currentCollectionId = null) => (
        <li key={topic.id} className="collections__topic-item">
            <button
                type="button"
                className="collections__topic-button"
                onClick={() => onTopicRecall(topic.prompt)}
                title={topic.prompt}
            >
                <span className="collections__topic-text">{topic.prompt}</span>
            </button>
            <button
                type="button"
                className="collections__topic-remove"
                onClick={(event) => {
                    event.stopPropagation();
                    onTopicRemove(topic.id);
                }}
                aria-label={`Remove "${topic.prompt}"`}
            >
                ×
            </button>
            <select
                className="collections__topic-move"
                aria-label={`Move "${topic.prompt}" to collection`}
                value={topic.collectionId || ""}
                onChange={(event) => {
                    event.stopPropagation();
                    const nextCollectionId = event.target.value || null;
                    if (nextCollectionId === (currentCollectionId || null)) return;
                    onMoveTopicToCollection?.(topic.id, nextCollectionId);
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <option value="">Uncategorized</option>
                {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                        {collection.name}
                    </option>
                ))}
            </select>
        </li>
    );

    return (
        <div className="collections">
            <div className="collections__header">
                <h3 className="collections__title">Topics</h3>
                <button
                    type="button"
                    className="collections__add-btn"
                    onClick={onStartCreating}
                    aria-label="Create new collection"
                    title="Create new collection"
                >
                    <svg viewBox="0 0 24 24" className="collections__icon" aria-hidden="true">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                </button>
            </div>

            {/* Create new collection form */}
            {isCreating && (
                <form className="collections__create-form" onSubmit={handleCreateSubmit}>
                    <input
                        ref={createInputRef}
                        type="text"
                        className="collections__input"
                        placeholder="Collection name..."
                        value={newCollectionName}
                        onChange={(event) => onNewCollectionNameChange(event.target.value)}
                        onKeyDown={handleCreateKeyDown}
                        onBlur={() => {
                            if (!newCollectionName.trim()) {
                                onCancelCreating();
                            }
                        }}
                    />
                    <div className="collections__form-actions">
                        <button type="submit" className="collections__form-btn collections__form-btn--save">
                            Create
                        </button>
                        <button
                            type="button"
                            className="collections__form-btn"
                            onClick={onCancelCreating}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Collections list */}
            <ul className="collections__list">
                {collections.map((collection) => {
                    const isExpanded = expandedCollections.has(collection.id);
                    const isEditing = editingCollectionId === collection.id;
                    const topics = topicsByCollection[collection.id] || [];

                    return (
                        <li key={collection.id} className="collections__item">
                            <div
                                className={`collections__folder ${isExpanded ? 'collections__folder--expanded' : ''}`}
                            >
                                {isEditing ? (
                                    <form className="collections__edit-form" onSubmit={handleEditSubmit}>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            className="collections__input collections__input--inline"
                                            value={editName}
                                            onChange={(event) => setEditName(event.target.value)}
                                            onKeyDown={handleEditKeyDown}
                                            onBlur={() => {
                                                if (editName.trim()) {
                                                    onUpdateCollection(editingCollectionId, { name: editName.trim() });
                                                } else {
                                                    onCancelEditing();
                                                }
                                            }}
                                        />
                                    </form>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="collections__folder-toggle"
                                            onClick={() => onToggleExpanded(collection.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                className={`collections__chevron ${isExpanded ? 'collections__chevron--open' : ''}`}
                                                aria-hidden="true"
                                            >
                                                <path d="M10 17l5-5-5-5v10z" />
                                            </svg>
                                            <svg viewBox="0 0 24 24" className="collections__folder-icon" aria-hidden="true">
                                                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                            </svg>
                                            <span className="collections__folder-name">{collection.name}</span>
                                            <span className="collections__folder-count">({topics.length})</span>
                                        </button>
                                        <div className="collections__folder-actions">
                                            <button
                                                type="button"
                                                className="collections__action-btn"
                                                onClick={() => onStartEditing(collection.id)}
                                                aria-label={`Edit "${collection.name}"`}
                                                title="Rename"
                                            >
                                                <svg viewBox="0 0 24 24" className="collections__action-icon" aria-hidden="true">
                                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="collections__action-btn collections__action-btn--danger"
                                                onClick={() => onDeleteCollection(collection.id)}
                                                aria-label={`Delete "${collection.name}"`}
                                                title="Delete"
                                            >
                                                <svg viewBox="0 0 24 24" className="collections__action-icon" aria-hidden="true">
                                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            {isExpanded && topics.length > 0 && (
                                <ul className="collections__topics">
                                    {topics.map((topic) => renderTopicItem(topic, collection.id))}
                                </ul>
                            )}
                            {isExpanded && topics.length === 0 && (
                                <p className="collections__empty">No topics in this collection</p>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Uncategorized topics */}
            {uncategorizedTopics.length > 0 && (
                <div className="collections__uncategorized">
                    <h4 className="collections__uncategorized-title">Uncategorized</h4>
                    <ul className="collections__topics">
                        {uncategorizedTopics.map((topic) => renderTopicItem(topic, null))}
                    </ul>
                </div>
            )}

            {savedTopics.length === 0 && collections.length === 0 && !isCreating && (
                <p className="collections__no-items">No saved topics yet</p>
            )}
        </div>
    );
}
