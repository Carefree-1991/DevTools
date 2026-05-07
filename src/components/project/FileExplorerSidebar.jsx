import { useRef, useState } from 'react';
import { useProject } from './ProjectContext';

// ── Single file row ───────────────────────────────────────────────────────────

function FileRow({ name, isActive, isOnly, toolId, onLoad }) {
  const { renameFile, deleteFile } = useProject();
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState(name);
  const inputRef               = useRef(null);

  function startEdit(e) {
    e.stopPropagation();
    setDraft(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) renameFile(toolId, name, trimmed);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setEditing(false); setDraft(name); }
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteFile(toolId, name);
  }

  return (
    <div
      onClick={() => !editing && onLoad(name)}
      onDoubleClick={startEdit}
      className={`
        group flex items-center gap-1.5 px-2 py-1.5 rounded-lg mx-1 cursor-pointer
        transition-colors text-xs select-none
        ${isActive
          ? 'bg-indigo-600/25 text-indigo-300'
          : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'}
      `}
      title="Click to open · Double-click to rename"
    >
      {/* Active indicator */}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isActive ? 'bg-indigo-400' : 'bg-transparent'}`} />

      {/* File icon */}
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0 opacity-60">
        <path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6.414A2 2 0 0013.414 5L11 2.586A2 2 0 009.586 2H4zm5 0v3h3"/>
        <path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6.414A2 2 0 0013.414 5L11 2.586A2 2 0 009.586 2H4z" fillOpacity=".15" stroke="currentColor" strokeWidth=".5"/>
      </svg>

      {/* Name / inline rename */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-0 bg-gray-800 text-gray-100 text-xs rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
      ) : (
        <span className="flex-1 min-w-0 truncate">{name}</span>
      )}

      {/* Delete button — hidden until hover, disabled if last file */}
      {!editing && (
        <button
          onClick={handleDelete}
          disabled={isOnly}
          title={isOnly ? 'Cannot delete the last file' : 'Delete file'}
          className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-600 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── New-file input row ─────────────────────────────────────────────────────────

function NewFileInput({ toolId, onDone }) {
  const { createNewFile } = useProject();
  const [name, setName]   = useState('');

  function commit() {
    const trimmed = name.trim();
    if (trimmed) createNewFile(toolId, trimmed);
    onDone();
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 mx-1">
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0 text-indigo-400 opacity-80">
        <path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6.414A2 2 0 0013.414 5L11 2.586A2 2 0 009.586 2H4z" fillOpacity=".15" stroke="currentColor" strokeWidth=".5"/>
      </svg>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter')  { e.preventDefault(); commit(); }
          if (e.key === 'Escape') onDone();
        }}
        placeholder="File name…"
        className="flex-1 min-w-0 bg-gray-800 border border-indigo-600/50 text-gray-100 text-xs rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TOOL_LABELS = {
  visualizer: 'Schemas',
  wireframer:  'Wireframes',
  journey:     'Flows',
  contract:    'Contracts',
  tree:        'Trees',
  compiler:    'Configs',
};

export default function FileExplorerSidebar({ toolId }) {
  const { getToolFiles, getActiveFileName, loadFile, activeProject } = useProject();
  const [creating, setCreating] = useState(false);

  if (!activeProject) return null;

  const files      = getToolFiles(toolId);
  const activeFile = getActiveFileName(toolId);
  const label      = TOOL_LABELS[toolId] ?? 'Files';

  return (
    <div className="w-44 shrink-0 flex flex-col bg-gray-950 border-r border-gray-800 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-500">
            <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
          </svg>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-none">{label}</span>
        </div>

        {/* New file button */}
        <button
          onClick={() => setCreating(true)}
          title="New file"
          className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-indigo-400 hover:bg-gray-800 transition-colors leading-none"
        >
          +
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5">
        {creating && (
          <NewFileInput toolId={toolId} onDone={() => setCreating(false)} />
        )}

        {files.length === 0 && !creating ? (
          <p className="text-xs text-gray-700 italic px-3 py-2">No files yet</p>
        ) : (
          files.map(name => (
            <FileRow
              key={name}
              name={name}
              toolId={toolId}
              isActive={name === activeFile}
              isOnly={files.length === 1}
              onLoad={(fn) => loadFile(toolId, fn)}
            />
          ))
        )}
      </div>

      {/* Footer: active file name */}
      <div className="px-3 py-2 border-t border-gray-800 shrink-0">
        <p className="text-xs text-gray-600 truncate" title={activeFile}>
          <span className="text-indigo-500">▶ </span>{activeFile}
        </p>
      </div>
    </div>
  );
}
