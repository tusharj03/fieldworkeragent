import React, { useRef, useState, useEffect } from 'react';
import { ProgressiveActionItem } from './ProgressiveActionItem';

export const EmsActionItems = ({ items, onAccept, onDismiss }) => {
    const containerRef = useRef(null);
    const [isUserScrolled, setIsUserScrolled] = useState(false);

    // Auto-scroll when new items arrive
    useEffect(() => {
        if (!isUserScrolled && containerRef.current) {
            const { scrollHeight, clientHeight } = containerRef.current;
            containerRef.current.scrollTop = scrollHeight - clientHeight;
        }
    }, [items, isUserScrolled]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // If we are within 20px of the bottom, we consider it "at bottom"
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 20;
        setIsUserScrolled(!isNearBottom);
    };

    if (!items || items.length === 0) return null;

    // Filter out logically completed items from this live view
    const pendingItems = items.filter(item => typeof item === 'string' ? true : !item.isCompleted);

    if (pendingItems.length === 0) return null;

    return (
        <div className="bg-slate-900/50 rounded-xl border border-blue-900/50 h-full overflow-hidden flex flex-col">
            <div className="p-4 shrink-0 border-b border-white/5 bg-slate-900/50">
                <h3 className="text-blue-400 text-xs font-bold uppercase tracking-wider">
                    Possible Clinical Considerations
                </h3>
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[150px] max-h-[500px]"
            >
                <div className="space-y-3">
                    {pendingItems.map((item, index) => (
                        <ProgressiveActionItem
                            key={item.id || index}
                            item={item}
                            onAccept={onAccept}
                            onDismiss={onDismiss}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
