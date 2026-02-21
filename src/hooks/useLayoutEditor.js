import { useState, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

const DEFAULT_LIVE_LAYOUT = ['transcript', 'checklist', 'notes'];
const DEFAULT_REPORT_LAYOUT = [
    'summary',
    'scene_info',
    'mva_info',
    'patient_info',
    'chief_complaint',
    'timeline',
    'actions',
    'hazards',
    'neris'
];

export function useLayoutEditor(layoutType = 'live') {
    const storageKey = `layout_order_${layoutType}`;
    const defaultLayout = layoutType === 'live' ? DEFAULT_LIVE_LAYOUT : DEFAULT_REPORT_LAYOUT;

    const [isEditingLayout, setIsEditingLayout] = useState(false);
    const [layoutOrder, setLayoutOrder] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                // Merge saved layout with any new default keys that might have been added in updates
                const parsed = JSON.parse(saved);
                const merged = [...parsed];
                defaultLayout.forEach(key => {
                    if (!merged.includes(key)) merged.push(key);
                });
                return merged;
            } catch (e) {
                console.warn('Failed to parse layout from storage, reverting to default.');
            }
        }
        return defaultLayout;
    });

    const toggleEditMode = () => {
        setIsEditingLayout(prev => !prev);
    };

    const saveLayout = () => {
        localStorage.setItem(storageKey, JSON.stringify(layoutOrder));
        setIsEditingLayout(false);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setLayoutOrder((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return {
        isEditingLayout,
        layoutOrder,
        toggleEditMode,
        saveLayout,
        handleDragEnd
    };
}
