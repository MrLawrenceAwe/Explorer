import { useSettings } from './useSettings';
import { usePersistence } from './usePersistence';
import { MODEL_PRESET_LABELS } from '../utils/modelPresets';

/** Settings + model selection helpers. Keeps App wiring thin. */
export function useSettingsController({ user, setUser }) {
    const settings = useSettings();

    usePersistence({
        modelPresets: settings.modelPresets,
        defaultPreset: settings.defaultPreset,
        suggestionModel: settings.suggestionModel,
    });

    const presetLabel = MODEL_PRESET_LABELS[settings.selectedPreset] || settings.selectedPreset;

    const modelSelectionProps = {
        stageModels: settings.stageModels,
        onStageModelChange: settings.handleStageModelChange,
        selectedPreset: settings.selectedPreset,
        onPresetSelect: settings.handlePresetSelect,
        presetLabel,
    };

    const settingsProps = {
        isOpen: settings.isSettingsOpen,
        onClose: settings.handleCloseSettings,
        defaultPreset: settings.defaultPreset,
        onDefaultPresetChange: settings.handleDefaultPresetChange,
        modelPresets: settings.modelPresets,
        onPresetModelChange: settings.handlePresetModelChange,
        suggestionModel: settings.suggestionModel,
        onSuggestionModelChange: settings.handleSuggestionModelChange,
        user,
        onUserChange: setUser,
    };

    return {
        modelSelectionProps,
        settingsProps,
        presetLabel,
        suggestionModel: settings.suggestionModel,
        modelsPayload: settings.modelsPayload,
        handleOpenSettings: settings.handleOpenSettings,
    };
}
