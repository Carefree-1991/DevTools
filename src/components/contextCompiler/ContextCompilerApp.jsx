import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../project/ProjectContext';
import {
  OBJECTIVES,
  AI_TARGETS,
  DEFAULT_CONFIG,
  buildContextPrompt,
  highlightMarkdown,
  estimateTokens,
  formatTokenCount,
} from './contextGen';

const STORAGE_KEY = 'devtools_compiler_config';

// ── Small reusable bits ───────────────────────────────────────────────────────

function Toggle({ on, onToggle, label, disabled }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-40' : ''}`}>
      <button
        onClick={!disabled ? onToggle : undefined}
        className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${on ? 'bg-indigo-600' : 'bg-gray-700'}`}
        disabled={disabled}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      <span className="text-xs text-gray-400">{label}</span>
    </label>
  );
}

function SectionToggle({ id, label, icon, on, onToggle, hasData }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className={`text-xs ${on && hasData ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
        {!hasData && (
          <span className="text-xs text-gray-700 italic">— no data</span>
        )}
      </div>
      <Toggle on={on && hasData} onToggle={onToggle} disabled={!hasData} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ContextCompilerApp() {
  const { getToolState, registerTool, getInitialToolState, activeProject } = useProject();

  // ── Settings state ────────────────────────────────────────────────────────
  const [objective,     setObjective]     = useState(DEFAULT_CONFIG.objective);
  const [targetAI,      setTargetAI]      = useState(DEFAULT_CONFIG.targetAI);
  const [description,   setDescription]   = useState('');
  const [techStack,     setTechStack]     = useState(DEFAULT_CONFIG.techStack);
  const [conventions,   setConventions]   = useState('');
  const [incChecklist,  setIncChecklist]  = useState(true);
  const [incFileMap,    setIncFileMap]    = useState(true);
  const [sections,      setSections]      = useState(DEFAULT_CONFIG.sections);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [copied,    setCopied]    = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const previewRef               = useRef(null);

  // ── ProjectContext registration ───────────────────────────────────────────
  const saveRef = useRef({});
  saveRef.current = { objective, targetAI, description, techStack, conventions, incChecklist, incFileMap, sections };

  useEffect(() => {
    const saved = getInitialToolState('compiler');
    if (saved) loadState(saved);
    return registerTool('compiler', () => saveRef.current, loadState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function loadState(saved) {
    if (!saved) {
      setObjective(DEFAULT_CONFIG.objective);
      setDescription('');
      setConventions('');
      setSections(DEFAULT_CONFIG.sections);
      return;
    }
    if (saved.objective)    setObjective(saved.objective);
    if (saved.targetAI)     setTargetAI(saved.targetAI);
    if (saved.description !== undefined) setDescription(saved.description);
    if (saved.techStack)    setTechStack(saved.techStack);
    if (saved.conventions !== undefined) setConventions(saved.conventions);
    if (saved.incChecklist  !== undefined) setIncChecklist(saved.incChecklist);
    if (saved.incFileMap    !== undefined) setIncFileMap(saved.incFileMap);
    if (saved.sections)     setSections(saved.sections);
  }

  // ── Live tool states (polled each render from context) ───────────────────
  const toolStates = useMemo(() => ({
    visualizer: getToolState('visualizer') ?? {},
    wireframer: getToolState('wireframer')  ?? {},
    journey:    getToolState('journey')     ?? {},
    contract:   getToolState('contract')   ?? {},
    tree:       getToolState('tree')        ?? {},
  }), [getToolState]); // getToolState is stable

  // Data availability flags (for section toggles)
  const hasData = {
    tree:       !!(toolStates.tree?.nodes?.length),
    wireframer: !!(toolStates.wireframer?.canvasItems?.length),
    journey:    !!(toolStates.journey?.nodes?.length),
    visualizer: !!(toolStates.visualizer?.nodes?.length),
    contract:   !!(toolStates.contract?.fields?.length),
  };
  const anyData = Object.values(hasData).some(Boolean);

  // ── Generated prompt ──────────────────────────────────────────────────────
  const prompt = useMemo(() => buildContextPrompt(
    objective,
    toolStates,
    {
      projectName:        activeProject ?? 'My Project',
      projectDescription: description,
      techStack,
      conventions,
      targetAI,
      includeChecklist:   incChecklist,
      includeFileMap:     incFileMap,
    },
    sections
  ), [objective, toolStates, activeProject, description, techStack, conventions, targetAI, incChecklist, incFileMap, sections]);

  const tokenCount = useMemo(() => estimateTokens(prompt), [prompt]);
  const wordCount  = useMemo(() => prompt.split(/\s+/).filter(Boolean).length, [prompt]);
  const highlighted = useMemo(() => highlightMarkdown(prompt), [prompt]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleDownload() {
    const filename = `${(activeProject ?? 'context').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${objective}.md`;
    const blob = new Blob([prompt], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  function handleSendToAI() {
    // Store prompt for HelpAssistant to pick up, then open it via custom event
    sessionStorage.setItem('devtools_compiler_prompt', prompt);
    window.dispatchEvent(new CustomEvent('devtools:sendToAssistant', {
      detail: { prompt: `Use the following project context to help me build features:\n\n${prompt.slice(0, 1200)}…\n\n(Full context pasted from Context Compiler)` }
    }));
    handleCopy(); // also copy to clipboard for pasting into Claude.ai / Cursor
  }

  function toggleSection(id) {
    setSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const selectedObj = OBJECTIVES.find((o) => o.id === objective) ?? OBJECTIVES[0];

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden">

      {/* ═══════════════ LEFT: Settings ════════════════ */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-700/60 bg-gray-900 overflow-y-auto">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700/60 shrink-0">
          <h2 className="text-white font-bold text-sm leading-tight">Context Compiler</h2>
          <p className="text-gray-500 text-xs mt-0.5">Generate AI-ready architecture prompts</p>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto">

          {/* Compiler Objective */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Compiler Objective</label>
            <div className="space-y-1.5">
              {OBJECTIVES.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => setObjective(obj.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                    objective === obj.id
                      ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                      : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  <span className="text-base mr-1.5">{obj.icon}</span>
                  <span className="text-xs font-medium">{obj.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 italic leading-relaxed">{selectedObj.desc}</p>
          </div>

          <div className="h-px bg-gray-700/60" />

          {/* Target AI */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Target AI</label>
            <select
              value={targetAI}
              onChange={(e) => setTargetAI(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {AI_TARGETS.map((t) => (
                <option key={t.id} value={t.id} className="bg-gray-900">{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 italic">
              {AI_TARGETS.find((t) => t.id === targetAI)?.hint}
            </p>
          </div>

          <div className="h-px bg-gray-700/60" />

          {/* Project context */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Project Context</label>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this project do? e.g. SaaS windshield repair management platform..."
                rows={3}
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Tech Stack</label>
              <input
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="React, TypeScript, Tailwind, Node.js..."
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Coding Conventions</label>
              <textarea
                value={conventions}
                onChange={(e) => setConventions(e.target.value)}
                placeholder="Use TypeScript strict mode, prefer functional components, no class components..."
                rows={2}
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          <div className="h-px bg-gray-700/60" />

          {/* Include sections */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Include Sections</label>
            <SectionToggle id="tree"       label="Component Tree"   icon="🌿" on={sections.tree}       onToggle={() => toggleSection('tree')}       hasData={hasData.tree} />
            <SectionToggle id="wireframer" label="UI Wireframe"     icon="📐" on={sections.wireframer} onToggle={() => toggleSection('wireframer')} hasData={hasData.wireframer} />
            <SectionToggle id="journey"    label="User Journey"     icon="🛤️" on={sections.journey}    onToggle={() => toggleSection('journey')}    hasData={hasData.journey} />
            <SectionToggle id="visualizer" label="Database Schema"  icon="🗄️" on={sections.visualizer} onToggle={() => toggleSection('visualizer')} hasData={hasData.visualizer} />
            <SectionToggle id="contract"   label="API Contract"     icon="🔌" on={sections.contract}   onToggle={() => toggleSection('contract')}   hasData={hasData.contract} />
          </div>

          <div className="h-px bg-gray-700/60" />

          {/* Output options */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Output Options</label>
            <Toggle on={incChecklist} onToggle={() => setIncChecklist((v) => !v)} label="Implementation checklist" />
            <Toggle on={incFileMap}   onToggle={() => setIncFileMap((v) => !v)}   label="File path map" />
          </div>
        </div>

        {/* No-data warning */}
        {!anyData && (
          <div className="mx-4 mb-4 px-3 py-3 bg-amber-900/20 border border-amber-700/30 rounded-xl">
            <p className="text-xs text-amber-400 font-semibold">No tool data yet</p>
            <p className="text-xs text-amber-500/70 mt-1 leading-relaxed">
              Add content in the other tabs — Data Visualizer, Wireframer, Journey Mapper, etc. — then come back here to compile.
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════ RIGHT: Preview ════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Preview toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700/60 bg-gray-900 shrink-0">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-600 font-mono">
            <span className={`font-semibold ${tokenCount > 80000 ? 'text-red-400' : tokenCount > 40000 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatTokenCount(tokenCount)}
            </span>
            <span>·</span>
            <span>{wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>{prompt.length.toLocaleString()} chars</span>
          </div>

          {/* Objective badge */}
          <div className="flex items-center gap-1.5 bg-indigo-900/30 border border-indigo-700/40 rounded-full px-3 py-0.5 ml-1">
            <span className="text-xs">{selectedObj.icon}</span>
            <span className="text-xs text-indigo-300 font-medium">{selectedObj.label}</span>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <button
            onClick={handleSendToAI}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            title="Copy prompt and open AI Assistant"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-indigo-400">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            Send to AI
          </button>

          <button
            onClick={handleDownload}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              downloaded
                ? 'bg-emerald-900/20 text-emerald-400 border-emerald-700/40'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
            }`}
            title="Download as .md file"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            {downloaded ? 'Saved!' : 'Download .md'}
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg border transition-all ${
              copied
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              {copied
                ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                : <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/> }
            </svg>
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>
        </div>

        {/* Prompt preview */}
        <div ref={previewRef} className="flex-1 overflow-auto bg-gray-950 p-6">
          {anyData ? (
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap break-words"
              style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: '#94a3b8' }}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center gap-5 select-none">
              <div className="text-5xl opacity-20">📝</div>
              <div className="space-y-2">
                <p className="text-gray-400 font-medium">Your compiled prompt will appear here</p>
                <p className="text-gray-600 text-sm max-w-md leading-relaxed">
                  Populate the other tabs with your project's architecture, then return here to compile it into an AI-ready system prompt.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2 text-left">
                {[
                  { icon: '🌿', tab: 'Component Tree',    hint: 'Plan your React component hierarchy' },
                  { icon: '📐', tab: 'UI Wireframer',     hint: 'Lay out the page structure' },
                  { icon: '🗄️', tab: 'Data Visualizer',   hint: 'Define your database schema' },
                  { icon: '🔌', tab: 'JSON Contract',     hint: 'Specify your API endpoints' },
                ].map((item) => (
                  <div key={item.tab} className="flex items-start gap-2.5 bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2.5">
                    <span className="text-lg mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-xs text-gray-300 font-medium">{item.tab}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{item.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
