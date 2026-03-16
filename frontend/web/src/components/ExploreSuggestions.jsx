import React from 'react';

export function ExploreSuggestions({
    suggestions,
    isLoading,
    selectedSuggestions,
    isSelectMode,
    selectToggleRef,
    suggestionsRef,
    onRefresh,
    onToggleSuggestion,
    onToggleSelectMode,
    handleOpenTopic,
}) {
    return (
        <section className="explore" aria-label="Explore suggestions">
            <div className="explore__header">
                <div>
                    <p className="topic-view__eyebrow">Explore</p>
                </div>
                <div className="explore__actions">
                    <button
                        type="button"
                        className="topic-view__pill topic-view__pill--action"
                        onClick={onRefresh}
                        disabled={isLoading}
                        aria-label="Regenerate suggestions"
                    >
                        {isLoading ? "…" : (
                            <svg className="pill-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20 4v6h-6l2.24-2.24A6 6 0 0 0 6 12a6 6 0 0 0 6 6 6 6 0 0 0 5.65-3.88l1.88.68A8 8 0 0 1 12 20 8 8 0 0 1 4 12a8 8 0 0 1 12.73-6.36L19 3z" />
                            </svg>
                        )}
                    </button>
                    {suggestions.length > 0 && (
                        <button
                            type="button"
                            className={`select-toggle${isSelectMode ? " select-toggle--active" : ""}`}
                            onClick={onToggleSelectMode}
                            aria-pressed={isSelectMode}
                            aria-label="Toggle select mode"
                            ref={selectToggleRef}
                        >
                            {isSelectMode && selectedSuggestions.length ? (
                                "Save"
                            ) : (
                                <svg className="pill-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M9.5 16.2 5.3 12l-1.4 1.4L9.5 19 20 8.5 18.6 7.1z" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>
            <p className="topic-view__description">
                {isLoading
                    ? "…"
                    : ``}
            </p>
            <div className="explore__grid" ref={suggestionsRef}>
                {suggestions.map((suggestion) => {
                    const isSelected = selectedSuggestions.includes(suggestion);
                    return (
                        <button
                            key={suggestion}
                            type="button"
                            className={`topic-view__pill explore__pill${isSelected ? " topic-view__pill--selected" : ""}`}
                            onClick={() => {
                                if (isSelectMode) {
                                    onToggleSuggestion(suggestion);
                                } else {
                                    handleOpenTopic(suggestion);
                                }
                            }}
                            title={isSelectMode ? "Click to select" : "Click to open"}
                        >
                            {suggestion}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
