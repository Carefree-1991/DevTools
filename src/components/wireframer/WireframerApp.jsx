import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import ToolboxSidebar from './ToolboxSidebar';
import WireframeCanvas from './WireframeCanvas';
import { BLOCK_DEFS, renderBlock } from './blocks';
import { useProject } from '../project/ProjectContext';

let itemCounter = 0;

export default function WireframerApp() {
  const [canvasItems, setCanvasItems] = useState([]);
  const [activeDragId, setActiveDragId] = useState(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  // ── Project save / load ──────────────────────────────────────────────────
  const { registerTool, activeProject, projects } = useProject();
  const saveRef = useRef({});
  saveRef.current = { canvasItems };

  useEffect(() => {
    // Auto-load on mount if there's a saved state for this tool
    const saved = activeProject ? projects[activeProject]?.wireframer : null;
    if (saved) loadState(saved);

    return registerTool('wireframer', () => saveRef.current, loadState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function loadState(saved) {
    itemCounter = saved?.canvasItems?.length ?? 0;
    setCanvasItems(saved?.canvasItems ?? []);
  }
  // ────────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart({ active }) {
    setActiveDragId(String(active.id));
  }

  // Real-time reorder for canvas ↔ canvas drags
  function handleDragOver({ active, over }) {
    if (!over) return;
    const activeId = String(active.id);
    const overId   = String(over.id);
    if (activeId.startsWith('tool:') || activeId === overId) return;

    setCanvasItems((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === activeId);
      const newIdx = prev.findIndex((i) => i.id === overId);
      return oldIdx !== -1 && newIdx !== -1 ? arrayMove(prev, oldIdx, newIdx) : prev;
    });
  }

  function handleDragEnd({ active, over }) {
    setActiveDragId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId   = String(over.id);
    const isTool   = activeId.startsWith('tool:');

    if (!isTool) return; // canvas reorder already done in onDragOver

    // Tool → canvas drop: insert new block
    const blockType = activeId.slice('tool:'.length);
    const newItem   = { id: `block-${++itemCounter}`, type: blockType };

    setCanvasItems((prev) => {
      const overIdx = prev.findIndex((i) => i.id === overId);
      if (overIdx !== -1) {
        // Insert after the item it landed on
        const next = [...prev];
        next.splice(overIdx + 1, 0, newItem);
        return next;
      }
      // Dropped on the canvas droppable zone (empty or below all items)
      return [...prev, newItem];
    });
  }

  // DragOverlay content
  const activeType = activeDragId?.startsWith('tool:')
    ? activeDragId.slice('tool:'.length)
    : canvasItems.find((i) => i.id === activeDragId)?.type;

  const activeDef = BLOCK_DEFS.find((b) => b.type === activeType);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full bg-gray-100">
        {!isScreenshotMode && (
          <ToolboxSidebar onHideUI={() => setIsScreenshotMode(true)} />
        )}

        <div className="flex-1 overflow-y-auto p-6 relative">
          {isScreenshotMode && (
            <button
              onClick={() => setIsScreenshotMode(false)}
              className="absolute top-4 right-4 z-50 bg-gray-800/90 text-gray-200 border border-gray-600 text-sm px-4 py-2 rounded-lg shadow-xl hover:bg-gray-700 transition-colors backdrop-blur-sm"
            >
              Show UI
            </button>
          )}
          <WireframeCanvas
            items={canvasItems}
            onRemove={(id) => setCanvasItems((prev) => prev.filter((i) => i.id !== id))}
            isScreenshotMode={isScreenshotMode}
          />
        </div>
      </div>

      {/* Floating drag preview */}
      <DragOverlay dropAnimation={null}>
        {activeDragId && activeDef && (
          <div className="pointer-events-none opacity-90 max-w-xs">
            {activeDragId.startsWith('tool:') ? (
              // Compact pill for toolbox drags
              <div className="flex items-center gap-2 bg-white border-2 border-indigo-400 rounded-lg px-4 py-2.5 shadow-2xl">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-700 font-mono">
                  {activeDef.label}
                </span>
              </div>
            ) : (
              // Scaled block preview for canvas reorders
              <div className="scale-95 origin-top-left">
                {renderBlock(activeType)}
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
