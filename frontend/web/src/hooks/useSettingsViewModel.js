import { useSettings } from './useSettings';
import { usePersistModelSettings } from './usePersistModelSettings';
import { MODEL_PRESET_LABELS } from '../utils/modelPresets';

export function useSettingsViewModel({ user, setUser }) {
    const settings = useSettings();

    usePersistModelSettings({
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
