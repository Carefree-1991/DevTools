import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import FieldRow from './FieldRow';
import {
  newField,
  nextId,
  updateInTree,
  deleteFromTree,
  addChildInTree,
  fieldsToJSON,
  fieldsToTypeScript,
  fieldsToOpenAPI,
  jsonToFields,
  highlightJSON,
  highlightTS,
  PRESETS,
} from './codeGen';
import { useProject } from '../project/ProjectContext';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLOR = {
  GET:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  POST:   'text-blue-400    bg-blue-400/10    border-blue-400/30',
  PUT:    'text-amber-400   bg-amber-400/10   border-amber-400/30',
  PATCH:  'text-purple-400  bg-purple-400/10  border-purple-400/30',
  DELETE: 'text-red-400     bg-red-400/10     border-red-400/30',
};

const OUTPUT_TABS = [
  { id: 'json',       label: 'JSON Payload' },
  { id: 'typescript', label: 'TypeScript'   },
  { id: 'openapi',    label: 'OpenAPI Schema' },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function JsonContractApp() {
  // ── Builder state ──────────────────────────────────────────
  const [fields,     setFields]     = useState([]);
  const [method,     setMethod]     = useState('POST');
  const [path,       setPath]       = useState('/api/v1/endpoint');
  const [schemaName, setSchemaName] = useState('RequestPayload');
  const [description, setDescription] = useState('');

  // ── UI state ───────────────────────────────────────────────
  const [outputTab, setOutputTab]   = useState('json');
  const [copied,    setCopied]      = useState(false);

  // ── Import panel state ─────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const previewRef = useRef(null);

  // ── Project save / load ──────────────────────────────────────────────────
  const { registerTool, activeProject, projects } = useProject();
  const saveRef = useRef({});
  saveRef.current = { fields, method, path, schemaName, description };

  useEffect(() => {
    const saved = activeProject ? projects[activeProject]?.contract : null;
    if (saved) loadState(saved);
    return registerTool('contract', () => saveRef.current, loadState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function restampIds(fs) {
    return (fs ?? []).map((f) => ({ ...f, id: nextId(), children: restampIds(f.children) }));
  }

  function loadState(saved) {
    setFields(restampIds(saved?.fields ?? []));
    setMethod(saved?.method ?? 'POST');
    setPath(saved?.path ?? '/api/v1/endpoint');
    setSchemaName(saved?.schemaName ?? 'RequestPayload');
    setDescription(saved?.description ?? '');
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── Field tree operations ──────────────────────────────────
  const onUpdate    = useCallback((id, patch)    => setFields((f) => updateInTree(f, id, patch)),    []);
  const onDelete    = useCallback((id)           => setFields((f) => deleteFromTree(f, id)),         []);
  const onAddChild  = useCallback((parentId)     => setFields((f) => addChildInTree(f, parentId, newField())), []);
  const addTopField = useCallback(()             => setFields((f) => [...f, newField()]),             []);

  // ── Load preset ────────────────────────────────────────────
  function loadPreset(key) {
    if (!key) return;
    const p = PRESETS[key];
    if (!p) return;
    setFields([...p.fields]);
    setMethod(p.method);
    setPath(p.path);
    setSchemaName(p.schemaName);
    setDescription('');
  }

  // ── Import JSON ────────────────────────────────────────────
  function handleImport() {
    setImportError('');
    try {
      const parsed = JSON.parse(importText.trim());
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setImportError('Top-level value must be a JSON object { … }');
        return;
      }
      setFields(jsonToFields(parsed));
      setImportText('');
      setShowImport(false);
    } catch (e) {
      setImportError(`Invalid JSON: ${e.message}`);
    }
  }

  // ── Generate output ────────────────────────────────────────
  const rawOutput = useMemo(() => {
    switch (outputTab) {
      case 'json':
        return JSON.stringify(fieldsToJSON(fields), null, 2);
      case 'typescript': {
        const header = description
          ? `/**\n * ${method} ${path}\n * ${description}\n */\n`
          : `// ${method} ${path}\n`;
        return header + fieldsToTypeScript(fields, schemaName);
      }
      case 'openapi':
        return JSON.stringify(
          {
            ...(description ? { description } : {}),
            ...fieldsToOpenAPI(fields),
          },
          null, 2
        );
      default:
        return '';
    }
  }, [fields, outputTab, schemaName, method, path, description]);

  const highlightedOutput = useMemo(() => {
    if (outputTab === 'typescript') return highlightTS(rawOutput);
    return highlightJSON(rawOutput);
  }, [rawOutput, outputTab]);

  const lineCount = rawOutput.split('\n').length;

  // ── Copy ───────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(rawOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden text-sm">

      {/* ════════════════════ LEFT: Builder ════════════════════ */}
      <div className="w-[460px] shrink-0 flex flex-col border-r border-gray-700/60 overflow-hidden bg-gray-900">

        {/* ── Top toolbar ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/60 shrink-0">
          <div>
            <h2 className="text-white font-bold text-sm leading-tight tracking-tight">Contract Builder</h2>
            <p className="text-gray-500 text-xs">Build JSON schemas visually</p>
          </div>
          <div className="flex-1" />

          {/* Template preset */}
          <select
            onChange={(e) => { loadPreset(e.target.value); e.target.value = ''; }}
            defaultValue=""
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer hover:border-gray-600"
          >
            <option value="" disabled>Templates…</option>
            {Object.entries(PRESETS).map(([k, p]) => (
              <option key={k} value={k}>{p.label}</option>
            ))}
          </select>

          {/* Import JSON */}
          <button
            onClick={() => { setShowImport((v) => !v); setImportError(''); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              showImport
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-600/50'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
            }`}
          >
            Import JSON
          </button>
        </div>

        {/* ── Import panel ─────────────────────────────────────── */}
        {showImport && (
          <div className="border-b border-gray-700/60 p-3 bg-gray-800/50 shrink-0">
            <p className="text-xs text-gray-400 mb-2">Paste existing JSON to auto-populate the builder:</p>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(''); }}
              placeholder={'{\n  "key": "value"\n}'}
              rows={5}
              spellCheck={false}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500 resize-none"
            />
            {importError && (
              <p className="text-xs text-red-400 mt-1 font-mono">{importError}</p>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleImport}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Parse & Load
              </button>
              <button
                onClick={() => { setShowImport(false); setImportText(''); setImportError(''); }}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Endpoint metadata ────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-gray-700/60 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={`text-xs font-bold px-2 py-1 rounded-lg border font-mono focus:outline-none cursor-pointer ${METHOD_COLOR[method]}`}
            >
              {METHODS.map((m) => (
                <option key={m} value={m} className="bg-gray-900 text-white font-mono">{m}</option>
              ))}
            </select>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-transparent text-gray-300 text-xs font-mono focus:outline-none border-b border-gray-700 focus:border-gray-500 transition-colors"
              placeholder="/api/v1/endpoint"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-mono shrink-0">interface</span>
            <input
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              spellCheck={false}
              className="w-40 bg-transparent text-indigo-300 text-xs font-mono focus:outline-none border-b border-gray-700 focus:border-indigo-500 transition-colors"
              placeholder="SchemaName"
            />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent text-gray-500 text-xs focus:outline-none border-b border-transparent focus:border-gray-700 transition-colors italic"
            placeholder="Endpoint description (optional)…"
          />
        </div>

        {/* ── Field list ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 select-none gap-3">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-40">
                <rect x="4" y="4" width="32" height="32" rx="3" strokeDasharray="4 3"/>
                <path d="M14 20h12M20 14v12"/>
              </svg>
              <div className="text-center">
                <p className="text-sm">No fields yet</p>
                <p className="text-xs mt-1">Click "Add Field" or load a template</p>
              </div>
            </div>
          ) : (
            fields.map((f) => (
              <FieldRow
                key={f.id}
                field={f}
                depth={0}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAddChild={onAddChild}
              />
            ))
          )}
        </div>

        {/* ── Add field footer ──────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-gray-700/60 shrink-0">
          <button
            onClick={addTopField}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-base leading-none font-light">+</span>
            Add Field
          </button>
          {fields.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Clear all fields?')) setFields([]); }}
              className="w-full mt-2 text-xs text-gray-600 hover:text-red-400 transition-colors py-1"
            >
              Clear all fields
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════ RIGHT: Preview ═══════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">

        {/* ── Output tab bar + copy ────────────────────────────── */}
        <div className="flex items-center gap-1 px-4 border-b border-gray-700/60 shrink-0 bg-gray-900">
          <div className="flex items-end gap-0.5 flex-1">
            {OUTPUT_TABS.map((tab) => {
              const active = outputTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setOutputTab(tab.id)}
                  className={`relative px-4 py-3 text-xs font-medium transition-colors ${
                    active
                      ? 'text-white border-b-2 border-indigo-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Line count */}
          <span className="text-xs text-gray-700 font-mono mr-2">{lineCount} lines</span>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!rawOutput || rawOutput === 'null'}
            className={`text-xs font-medium px-4 py-1.5 rounded-lg border transition-all ${
              copied
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        {/* ── Code preview ─────────────────────────────────────── */}
        <div
          ref={previewRef}
          className="flex-1 overflow-auto p-5"
          style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }}
        >
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-700 select-none gap-2">
              <p className="text-sm">Add fields to see the output</p>
            </div>
          ) : (
            <pre
              className="leading-relaxed whitespace-pre-wrap break-all"
              style={{ color: '#e2e8f0' }}
              dangerouslySetInnerHTML={{ __html: highlightedOutput }}
            />
          )}
        </div>

        {/* ── Footer legend ────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-5 py-2 border-t border-gray-800/80 bg-gray-900/50 shrink-0">
          {[
            { color: '#a5b4fc', label: 'key' },
            { color: '#6ee7b7', label: 'string' },
            { color: '#7dd3fc', label: 'number' },
            { color: '#fde68a', label: 'boolean' },
            { color: '#fca5a5', label: 'null' },
            { color: '#c084fc', label: 'keyword' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-xs text-gray-600 font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
