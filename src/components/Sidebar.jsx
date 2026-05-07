export default function Sidebar({ onAddNode, onHideUI }) {
  return (
    <div className="w-60 shrink-0 bg-gray-900 border-r border-gray-700/60 flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-white font-bold text-base tracking-tight">Data Visualizer</h1>
        <p className="text-gray-500 text-xs mt-0.5">Architecture Blueprint Tool</p>
      </div>

      <div className="h-px bg-gray-700/60" />

      <button
        onClick={onAddNode}
        className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-base leading-none font-light">+</span>
        Add Table / Node
      </button>

      <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
        <p className="text-gray-400 font-medium text-xs uppercase tracking-wider">How to use</p>
        <p>Drag the <span className="text-indigo-400 font-mono">&#9679;</span> handle on a row to connect it to another table.</p>
        <p>Click any name or column to edit it inline.</p>
        <p>Press <kbd className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-xs font-mono">Del</kbd> to remove a selected node or edge.</p>
        <p>Scroll to zoom &middot; drag canvas to pan.</p>
      </div>

      <div className="mt-auto space-y-2">
        <div className="h-px bg-gray-700/60" />
        <button
          onClick={onHideUI}
          className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 border border-gray-600 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          Hide UI
        </button>
        <p className="text-xs text-gray-600 text-center">Hides sidebar &amp; controls for screenshots</p>
      </div>
    </div>
  );
}
