import { NODE_CONFIG, STATUS_CONFIG } from './JourneyNode';
import { EDGE_CONFIG } from './JourneyEdge';

// Small toggle switch component
function Toggle({ on, onToggle, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        onClick={onToggle}
        className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${on ? 'bg-indigo-600' : 'bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
      <span className="text-xs text-gray-400">{label}</span>
    </label>
  );
}

export default function MapperSidebar({
  selectedNodeType, onNodeTypeChange,
  onAddNode,
  onFitView,
  onHideUI,
  snapToGrid, onSnapToggle,
  onClear,
  nodeCount, edgeCount,
}) {
  return (
    <div className="w-60 shrink-0 bg-gray-900 border-r border-gray-700/60 flex flex-col p-4 gap-5 overflow-y-auto">

      {/* ── Brand ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white font-bold text-sm tracking-tight">Journey Mapper</h2>
        <p className="text-gray-500 text-xs mt-0.5">Map user flows & screen states</p>
      </div>

      {/* ── Add Node ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Add Node</p>
        <select
          value={selectedNodeType}
          onChange={(e) => onNodeTypeChange(e.target.value)}
          className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {Object.entries(NODE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label} — {v.desc}</option>
          ))}
        </select>
        <button
          onClick={onAddNode}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-base leading-none font-light">+</span>
          Add Node
        </button>
      </div>

      <div className="h-px bg-gray-700/60" />

      {/* ── Node type legend ───────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Node Colors</p>
        {Object.entries(NODE_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: v.dot }} />
            <span className="text-gray-300 text-xs font-medium w-16 shrink-0">{v.label}</span>
            <span className="text-gray-500 text-xs truncate">{v.desc}</span>
          </div>
        ))}
      </div>

      <div className="h-px bg-gray-700/60" />

      {/* ── Edge type legend ───────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Edge Types</p>
        <p className="text-gray-500 text-xs -mt-1">Click <span className="text-gray-300">+ action</span> on any edge to label it and change its style.</p>
        {Object.entries(EDGE_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2.5">
            <svg width="28" height="10" className="shrink-0">
              <line x1="2" y1="5" x2="26" y2="5" stroke={v.stroke} strokeWidth="2" strokeDasharray={v.dash} />
              <polygon points="24,2 28,5 24,8" fill={v.stroke} />
            </svg>
            <span className="text-gray-300 text-xs">{v.label}</span>
          </div>
        ))}
      </div>

      <div className="h-px bg-gray-700/60" />

      {/* ── Canvas controls ────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Canvas</p>
        <button
          onClick={onFitView}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-medium py-2 rounded-lg transition-colors"
        >
          Fit to Screen
        </button>
        <Toggle on={snapToGrid} onToggle={onSnapToggle} label="Snap to Grid (20px)" />
        <button
          onClick={onClear}
          className="w-full bg-red-950/50 hover:bg-red-900/40 text-red-400 border border-red-900/50 text-xs font-medium py-2 rounded-lg transition-colors"
        >
          Clear Canvas
        </button>
      </div>

      <div className="h-px bg-gray-700/60" />

      {/* ── Tips ───────────────────────────────────────────────── */}
      <div className="text-xs text-gray-500 space-y-1.5 leading-relaxed">
        <p className="text-gray-400 font-medium">Tips</p>
        <p>Drag any <span className="text-gray-300">colored dot</span> to draw a connection.</p>
        <p>Click <span className="text-gray-300">+ action</span> on an edge to add a label.</p>
        <p>Press <kbd className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono">Del</kbd> to remove selected elements.</p>
        <p>Hold <kbd className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono">Shift</kbd> to multi-select.</p>
      </div>

      {/* ── Stats + screenshot button ───────────────────────────── */}
      <div className="mt-auto space-y-3">
        <div className="flex gap-3 text-xs text-gray-500">
          <span><span className="text-gray-300 font-semibold">{nodeCount}</span> nodes</span>
          <span><span className="text-gray-300 font-semibold">{edgeCount}</span> edges</span>
        </div>
        <div className="h-px bg-gray-700/60" />
        <button
          onClick={onHideUI}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Hide UI
        </button>
        <p className="text-xs text-gray-600 text-center">Hides sidebar &amp; controls for screenshots</p>
      </div>
    </div>
  );
}
