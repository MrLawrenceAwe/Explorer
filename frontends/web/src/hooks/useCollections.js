import { useState, useCallback, useEffect, useRef } from 'react';
import {
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    updateSavedTopic,
} from '../utils/apiClient';

/** Hook for managing topic collections (folders). */
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
    const requestIdRef = useRef(0);

    const loadCollections = useCallback(async () => {
        requestIdRef.current += 1;
        const requestId = requestIdRef.current;
        if (!user?.email) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setCollections([]);
            setIsLoading(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            const data = await fetchCollections(apiBase, user, {
                signal: controller.signal,
            });
            if (requestId !== requestIdRef.current || controller.signal.aborted) {
                return;
            }
            setCollections(data);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to load collections:', error);
                onError?.(error.message || 'Failed to load collections.');
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [apiBase, user, onError]);

    useEffect(() => {
        loadCollections();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadCollections]);

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

    const handleUpdateCollection = useCallback(async (collectionId, updates) => {
        if (!user?.email) return null;

        try {
            const updated = await updateCollection(apiBase, user, collectionId, updates);
            setCollections((prev) =>
                prev.map((collection) => (collection.id === collectionId ? updated : collection))
            );
            setEditingCollectionId(null);
            return updated;
        } catch (error) {
            console.error('Failed to update collection:', error);
            onError?.(error.message || 'Failed to update collection.');
            return null;
        }
    }, [apiBase, user, onError]);

    const handleDeleteCollection = useCallback(async (collectionId) => {
        if (!user?.email) return false;

        try {
            await deleteCollection(apiBase, user, collectionId);
            setCollections((prev) => prev.filter((collection) => collection.id !== collectionId));
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

    const handleMoveTopicToCollection = useCallback(async (topicId, collectionId) => {
        if (!user?.email) return false;

        try {
            const updated = await updateSavedTopic(apiBase, user, topicId, { collectionId });
            onTopicMoved?.(updated);

            return true;
        } catch (error) {
            console.error('Failed to move topic:', error);
            onError?.(error.message || 'Failed to move topic.');
            return false;
        }
    }, [apiBase, user, onTopicMoved, onError]);

    const startCreating = useCallback(() => {
        setIsCreating(true);
        setNewCollectionName('');
    }, []);

    const cancelCreating = useCallback(() => {
        setIsCreating(false);
        setNewCollectionName('');
    }, []);

    const startEditing = useCallback((collectionId) => {
        setEditingCollectionId(collectionId);
    }, []);

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
