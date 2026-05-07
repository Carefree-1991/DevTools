import { useDraggable } from '@dnd-kit/core';
import { BLOCK_DEFS } from './blocks';

// Small icon SVGs for each block type
const ICONS = {
  navbar:  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><rect x="1" y="3" width="18" height="4" rx="1"/><rect x="1" y="9" width="10" height="2" rx="1" opacity=".4"/></svg>,
  sidebar: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><rect x="1" y="1" width="5" height="18" rx="1"/><rect x="8" y="1" width="11" height="4" rx="1" opacity=".4"/><rect x="8" y="7" width="11" height="2" rx="1" opacity=".4"/></svg>,
  table:   <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><rect x="1" y="1" width="18" height="4" rx="1"/><rect x="1" y="7" width="18" height="2" rx="1" opacity=".4"/><rect x="1" y="11" width="18" height="2" rx="1" opacity=".4"/><rect x="1" y="15" width="18" height="2" rx="1" opacity=".4"/></svg>,
  form:    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><rect x="1" y="3" width="5" height="2" rx="1" opacity=".5"/><rect x="8" y="2" width="11" height="4" rx="1"/><rect x="1" y="9" width="5" height="2" rx="1" opacity=".5"/><rect x="8" y="8" width="11" height="4" rx="1"/><rect x="7" y="15" width="6" height="3" rx="1"/></svg>,
  button:  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><rect x="1" y="6" width="8" height="8" rx="2"/><rect x="11" y="6" width="8" height="8" rx="2" opacity=".4"/></svg>,
  image:   <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="1" y="1" width="18" height="18" rx="2"/><line x1="1" y1="1" x2="19" y2="19"/><line x1="19" y1="1" x2="1" y2="19"/></svg>,
  chart:   <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><rect x="1" y="12" width="3" height="7" rx="1"/><rect x="6" y="8"  width="3" height="11" rx="1" opacity=".7"/><rect x="11" y="5" width="3" height="14" rx="1" opacity=".5"/><rect x="16" y="2" width="3" height="17" rx="1" opacity=".4"/></svg>,
};

function ToolItem({ block }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tool:${block.type}`,
    data: { type: block.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200
        cursor-grab active:cursor-grabbing
        hover:border-indigo-400 hover:shadow-sm
        transition-all select-none
        ${isDragging ? 'opacity-40 shadow-lg scale-95' : ''}
      `}
    >
      <span className="text-gray-500 shrink-0">{ICONS[block.type]}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-700 leading-tight">{block.label}</p>
        <p className="text-xs text-gray-400 leading-tight truncate">{block.description}</p>
      </div>
    </div>
  );
}

export default function ToolboxSidebar({ onHideUI }) {
  return (
    <div className="w-56 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col p-4 gap-3 overflow-y-auto">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">Component Toolbox</h2>
        <p className="text-xs text-gray-400 mt-0.5">Drag blocks onto the canvas</p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="flex flex-col gap-2">
        {BLOCK_DEFS.map((block) => (
          <ToolItem key={block.type} block={block} />
        ))}
      </div>

      <div className="mt-auto pt-2 space-y-2">
        <div className="h-px bg-gray-200" />
        <div className="text-xs text-gray-400 space-y-1 leading-relaxed">
          <p>Drag items onto the canvas below.</p>
          <p>Drag the <span className="font-mono text-gray-500">&#9776;</span> handle to reorder.</p>
          <p>Hover a block &rarr; click <span className="text-red-400">&times;</span> to remove.</p>
        </div>
        <div className="h-px bg-gray-200" />
        <button
          onClick={onHideUI}
          className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 text-xs font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Hide UI
        </button>
        <p className="text-xs text-gray-400 text-center">For clean screenshots</p>
      </div>
    </div>
  );
}
