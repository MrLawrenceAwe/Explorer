import { useCallback } from 'react';
import { useSavedData } from './useSavedData';
import { useCollections } from './useCollections';

/** Combines saved topics/reports with collections management. */
export function useSavedCollectionsController({ apiBase, user }) {
    const savedData = useSavedData({ apiBase, user });

    const handleSavedDataError = useCallback((msg) => savedData.setError(msg), [savedData.setError]);
    const handleTopicMoved = useCallback(
        (updatedTopic) => savedData.updateTopicCollection(updatedTopic.id, updatedTopic.collectionId),
        [savedData.updateTopicCollection]
    );

    const collections = useCollections({
        apiBase,
        user,
        onTopicMoved: handleTopicMoved,
        onError: handleSavedDataError,
    });

    return {
        ...savedData,
        collections,
    };
}
