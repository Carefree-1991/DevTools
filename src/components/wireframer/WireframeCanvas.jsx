import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { renderBlock } from './blocks';

function SortableBlock({ item, onRemove, isScreenshotMode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
    >
      {/* Drop-between indicator */}
      {isOver && !isDragging && (
        <div className="h-0.5 bg-indigo-400 rounded-full mb-3 mx-2" />
      )}

      <div className="relative group">
        {/* Drag handle */}
        {!isScreenshotMode && (
          <div
            {...attributes}
            {...listeners}
            className="absolute -left-6 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Drag to reorder"
          >
            <svg viewBox="0 0 8 14" fill="#9ca3af" className="w-3 h-4">
              <circle cx="2" cy="2"  r="1.3"/>
              <circle cx="6" cy="2"  r="1.3"/>
              <circle cx="2" cy="7"  r="1.3"/>
              <circle cx="6" cy="7"  r="1.3"/>
              <circle cx="2" cy="12" r="1.3"/>
              <circle cx="6" cy="12" r="1.3"/>
            </svg>
          </div>
        )}

        {/* Remove button */}
        {!isScreenshotMode && (
          <button
            onClick={() => onRemove(item.id)}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10 bg-white rounded-full shadow-sm border border-gray-200 text-sm leading-none"
            title="Remove block"
          >
            &times;
          </button>
        )}

        {/* Block content */}
        <div className={!isScreenshotMode ? 'pl-2' : ''}>
          {renderBlock(item.type)}
        </div>
      </div>
    </div>
  );
}

export default function WireframeCanvas({ items, onRemove, isScreenshotMode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop' });

  return (
    /* Outer browser chrome */
    <div
      className={`
        bg-gray-200 rounded-xl shadow-2xl overflow-hidden w-full max-w-5xl mx-auto
        ${!isScreenshotMode ? 'border border-gray-300' : ''}
      `}
    >
      {/* Browser window header */}
      {!isScreenshotMode && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-300 border-b border-gray-400/30">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 bg-white/70 rounded-md px-3 py-1 text-xs text-gray-400 font-mono">
            localhost:3000 / my-app
          </div>
          <div className="flex gap-1.5 shrink-0">
            {['↑', '↓', '↺'].map((c) => (
              <div key={c} className="w-6 h-6 bg-white/40 rounded flex items-center justify-center text-xs text-gray-500">
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page canvas */}
      <div
        ref={setNodeRef}
        className={`bg-white min-h-[600px] transition-colors ${isOver ? 'bg-indigo-50/60' : ''}`}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-300 select-none gap-3">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 opacity-50">
              <rect x="4" y="4" width="40" height="40" rx="4" strokeDasharray="4 3"/>
              <line x1="24" y1="16" x2="24" y2="32"/>
              <line x1="16" y1="24" x2="32" y2="24"/>
            </svg>
            <p className="text-sm font-mono">Drag components from the toolbox to begin</p>
          </div>
        ) : (
          <div className={`p-6 pl-10 space-y-4 ${isScreenshotMode ? '!pl-6' : ''}`}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableBlock
                  key={item.id}
                  item={item}
                  onRemove={onRemove}
                  isScreenshotMode={isScreenshotMode}
                />
              ))}
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  );
}
