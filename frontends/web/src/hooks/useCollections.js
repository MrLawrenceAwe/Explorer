import { useState, useCallback, useEffect, useRef } from 'react';
import {
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    updateSavedTopic,
} from '../utils/helpers';

/**
 * Hook for managing topic collections (folders).
 * 
 * @param {object} options
 * @param {string} options.apiBase - Base URL for API calls
 * @param {object} options.user - Current user object with email and username
 * @param {function} options.onTopicMoved - Callback when a topic is moved to a collection
 * @param {function} options.onError - Callback for error handling
 */
export function useCollections({
    apiBase,
    user,
    onTopicMoved,
    onError,
}) {
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedCollections, setExpandedCollections] = useState(new Set());
    const [editingCollectionId, setEditingCollectionId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const abortControllerRef = useRef(null);

    // Load collections from API
    const loadCollections = useCallback(async () => {
        if (!user?.email) {
            setCollections([]);
            return;
        }

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        try {
            const data = await fetchCollections(apiBase, user, {
                signal: abortControllerRef.current.signal,
            });
            setCollections(data);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to load collections:', error);
                onError?.(error.message || 'Failed to load collections.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [apiBase, user, onError]);

    // Initial load
    useEffect(() => {
        loadCollections();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadCollections]);

    // Toggle collection expanded/collapsed state
    const toggleCollectionExpanded = useCallback((collectionId) => {
        setExpandedCollections((prev) => {
            const next = new Set(prev);
            if (next.has(collectionId)) {
                next.delete(collectionId);
            } else {
                next.add(collectionId);
            }
            return next;
        });
    }, []);

    // Create a new collection
    const handleCreateCollection = useCallback(async (name) => {
        if (!user?.email) {
            onError?.('Set a user email in Settings to create collections.');
            return null;
        }

        const normalizedName = (name || newCollectionName || '').trim();
        if (!normalizedName) {
            onError?.('Collection name is required.');
            return null;
        }

        try {
            const collection = await createCollection(apiBase, user, { name: normalizedName });
            setCollections((prev) => [...prev, collection]);
            setNewCollectionName('');
            setIsCreating(false);
            // Auto-expand the new collection
            setExpandedCollections((prev) => new Set([...prev, collection.id]));
            return collection;
        } catch (error) {
            console.error('Failed to create collection:', error);
            onError?.(error.message || 'Failed to create collection.');
            return null;
        }
    }, [apiBase, user, newCollectionName, onError]);

    // Update a collection
    const handleUpdateCollection = useCallback(async (collectionId, updates) => {
        if (!user?.email) return null;

        try {
            const updated = await updateCollection(apiBase, user, collectionId, updates);
            setCollections((prev) =>
                prev.map((c) => (c.id === collectionId ? updated : c))
            );
            setEditingCollectionId(null);
            return updated;
        } catch (error) {
            console.error('Failed to update collection:', error);
            onError?.(error.message || 'Failed to update collection.');
            return null;
        }
    }, [apiBase, user, onError]);

    // Delete a collection
    const handleDeleteCollection = useCallback(async (collectionId) => {
        if (!user?.email) return false;

        try {
            await deleteCollection(apiBase, user, collectionId);
            setCollections((prev) => prev.filter((c) => c.id !== collectionId));
            setExpandedCollections((prev) => {
                const next = new Set(prev);
                next.delete(collectionId);
                return next;
            });
            return true;
        } catch (error) {
            console.error('Failed to delete collection:', error);
            onError?.(error.message || 'Failed to delete collection.');
            return false;
        }
    }, [apiBase, user, onError]);

    // Move a topic to a collection
    const handleMoveTopicToCollection = useCallback(async (topicId, collectionId) => {
        if (!user?.email) return false;

        try {
            const updated = await updateSavedTopic(apiBase, user, topicId, { collectionId });
            onTopicMoved?.(updated);

            // Update collection topic counts
            setCollections((prev) =>
                prev.map((c) => {
                    if (c.id === collectionId) {
                        return { ...c, topicCount: c.topicCount + 1 };
                    }
                    return c;
                })
            );

            return true;
        } catch (error) {
            console.error('Failed to move topic:', error);
            onError?.(error.message || 'Failed to move topic.');
            return false;
        }
    }, [apiBase, user, onTopicMoved, onError]);

    // Start creating a new collection
    const startCreating = useCallback(() => {
        setIsCreating(true);
        setNewCollectionName('');
    }, []);

    // Cancel creating a new collection
    const cancelCreating = useCallback(() => {
        setIsCreating(false);
        setNewCollectionName('');
    }, []);

    // Start editing a collection
    const startEditing = useCallback((collectionId) => {
        setEditingCollectionId(collectionId);
    }, []);

    // Cancel editing
    const cancelEditing = useCallback(() => {
        setEditingCollectionId(null);
    }, []);

    return {
        collections,
        isLoading,
        expandedCollections,
        editingCollectionId,
        isCreating,
        newCollectionName,
        setNewCollectionName,
        loadCollections,
        toggleCollectionExpanded,
        handleCreateCollection,
        handleUpdateCollection,
        handleDeleteCollection,
        handleMoveTopicToCollection,
        startCreating,
        cancelCreating,
        startEditing,
        cancelEditing,
    };
}
