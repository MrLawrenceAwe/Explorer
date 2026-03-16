import { useEffect } from 'react';
import {
    persistModelPresets,
    persistActiveModelPreset,
    persistSuggestionModel,
} from '../utils/modelPresets';

export function usePersistModelSettings({
    modelPresets,
    defaultPreset,
    suggestionModel,
}) {
    useEffect(() => {
        persistModelPresets(modelPresets);
    }, [modelPresets]);

    useEffect(() => {
        persistActiveModelPreset(defaultPreset);
    }, [defaultPreset]);

    useEffect(() => {
        persistSuggestionModel(suggestionModel);
    }, [suggestionModel]);
}
