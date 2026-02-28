import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const VIEWPORT_MARGIN = 16;

export function RefineToggle({
    avoidTopics,
    setAvoidTopics,
    includeTopics,
    setIncludeTopics,
    isRunning,
}) {
    const toggleRef = useRef(null);
    const popoverRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState('top');
    const [alignment, setAlignment] = useState('left');
    const [popoverMaxHeight, setPopoverMaxHeight] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                !open ||
                popoverRef.current?.contains(event.target) ||
                toggleRef.current?.contains(event.target)
            ) {
                return;
            }
            setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    useLayoutEffect(() => {
        if (!open || !toggleRef.current || !popoverRef.current) {
            return undefined;
        }

        const updatePopoverLayout = () => {
            const toggleRect = toggleRef.current.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
            const spaceAbove = toggleRect.top - VIEWPORT_MARGIN;
            const spaceBelow = viewportHeight - toggleRect.bottom - VIEWPORT_MARGIN;
            const nextPlacement =
                spaceAbove >= popoverRect.height || spaceAbove >= spaceBelow ? 'top' : 'bottom';
            const availableHeight =
                nextPlacement === 'top' ? spaceAbove : spaceBelow;
            const maxHeight = Math.floor(
                Math.max(0, Math.min(availableHeight, viewportHeight - VIEWPORT_MARGIN * 2))
            );

            const canAlignLeft = toggleRect.left + popoverRect.width <= viewportWidth - VIEWPORT_MARGIN;
            const canAlignRight = toggleRect.right - popoverRect.width >= VIEWPORT_MARGIN;

            setPlacement(nextPlacement);
            setAlignment(canAlignLeft || !canAlignRight ? 'left' : 'right');
            setPopoverMaxHeight(maxHeight > 0 ? `${maxHeight}px` : null);
        };

        updatePopoverLayout();

        window.addEventListener('resize', updatePopoverLayout);
        window.addEventListener('scroll', updatePopoverLayout, true);

        return () => {
            window.removeEventListener('resize', updatePopoverLayout);
            window.removeEventListener('scroll', updatePopoverLayout, true);
        };
    }, [open, avoidTopics, includeTopics]);

    return (
        <div className="refine-toggle" ref={toggleRef}>
            <button
                type="button"
                className={`refine-toggle__button${open ? ' refine-toggle__button--active' : ''}`}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                aria-label="Refine generation topics"
                title="Avoid or include specific topics"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: 'var(--color-text-primary)' }}>
                    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                </svg>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: (avoidTopics && avoidTopics.trim()) ? '#ef4444' : 'var(--color-text-tertiary)' }}>
                    Avoid
                    {avoidTopics && avoidTopics.trim() && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    )}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)' }}> / </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: (includeTopics && includeTopics.trim()) ? '#3b82f6' : 'var(--color-text-tertiary)' }}>
                    Include
                    {includeTopics && includeTopics.trim() && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                    )}
                </span>
            </button>
            {open && (
                <div
                    className={`refine-popover refine-popover--${placement} refine-popover--align-${alignment}`}
                    ref={popoverRef}
                    style={{ maxHeight: popoverMaxHeight ?? undefined }}
                >
                    <div className="refine-field">
                        <label className="refine-field__label">Avoid</label>
                        <input
                            className="refine-field__input"
                            placeholder="e.g. politics, sports"
                            value={avoidTopics}
                            onChange={(event) => setAvoidTopics(event.target.value)}
                            disabled={isRunning}
                        />
                    </div>
                    <div className="refine-field">
                        <label className="refine-field__label">Include</label>
                        <input
                            className="refine-field__input"
                            placeholder="e.g. history, science"
                            value={includeTopics}
                            onChange={(event) => setIncludeTopics(event.target.value)}
                            disabled={isRunning}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
