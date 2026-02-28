import React from 'react';
import { QUICK_TOPIC_INPUT_ID } from '../utils/constants';

export function GenerationBar({
    quickTopicInputValue,
    setQuickTopicInputValue,
    handleQuickTopicSubmit,
}) {
    return (
        <section className="sidebar-section sidebar-section--topic-bar">
            <form className="topic-view-bar" onSubmit={handleQuickTopicSubmit}>
                <label htmlFor={QUICK_TOPIC_INPUT_ID} className="topic-view-bar__label">
                    Topic View
                </label>
                <input
                    id={QUICK_TOPIC_INPUT_ID}
                    type="text"
                    value={quickTopicInputValue}
                    placeholder="e.g. Microplastics In Oceans"
                    onChange={(event) => setQuickTopicInputValue(event.target.value)}
                    autoComplete="off"
                />
            </form>
        </section>
    );
}
