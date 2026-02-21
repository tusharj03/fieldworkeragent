import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal } from 'lucide-react';

export function SortableItem({ id, isEditing, children, className = '' }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    if (!isEditing) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div ref={setNodeRef} style={style} className={`relative ${className} ring-2 ring-blue-500/50 rounded-2xl bg-slate-900/80 backdrop-blur-md shadow-2xl`}>
            {/* Overlay to prevent interactions while dragging */}
            <div className="absolute inset-0 z-10 bg-slate-950/20 rounded-2xl pointer-events-none"></div>

            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white p-1 rounded-full shadow-lg cursor-grab active:cursor-grabbing z-20 flex items-center gap-1 px-3 border border-blue-400/30"
            >
                <GripHorizontal size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Drag to Move</span>
            </div>

            {/* Scale down the content slightly so it looks "picked up" */}
            <div className="opacity-70 scale-[0.98] pointer-events-none transition-transform duration-200">
                {children}
            </div>
        </div>
    );
}
