import { useRef, useState } from 'react';
import { useProject } from './ProjectContext';
import SettingsModal from '../assistant/SettingsModal';
import ExportDeployHub from '../export/ExportDeployHub';
import { getAISettings } from '../assistant/aiEngine';
import { getIntegrations } from '../export/githubApi';

export default function ProjectHeader() {
  const {
    projects, activeProject,
    saveProject, loadProject, newProject, deleteProject,
    duplicateProject, exportProject, importProject,
  } = useProject();

  const [saved,        setSaved]        = useState(false);
  const [showMore,     setShowMore]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const importRef    = useRef(null);
  const projectNames = Object.keys(projects);
  const hasAIKey     = !!getAISettings().apiKey;
  const hasGHToken   = !!getIntegrations().githubPAT;

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSave() {
    if (activeProject) {
      saveProject(activeProject);
      flash();
    } else {
      handleSaveAs();
    }
  }

  function handleSaveAs() {
    const name = window.prompt('Save project as:');
    if (!name?.trim()) return;
    if (projects[name.trim()] && !window.confirm(`"${name.trim()}" already exists — overwrite?`)) return;
    saveProject(name.trim());
    flash();
  }

  function handleNew() {
    const name = window.prompt('New project name:');
    if (!name?.trim()) return;
    if (projects[name.trim()] && !window.confirm(`"${name.trim()}" already exists — overwrite?`)) return;
    newProject(name.trim());
  }

  function handleDelete() {
    if (!activeProject) return;
    if (window.confirm(`Permanently delete "${activeProject}"?`)) deleteProject(activeProject);
    setShowMore(false);
  }

  function handleDuplicate() {
    if (!activeProject) return;
    const newName = duplicateProject(activeProject);
    window.alert(`Duplicated as "${newName}"`);
    setShowMore(false);
  }

  function handleExport() {
    if (!activeProject) return;
    exportProject(activeProject);
    setShowMore(false);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    importProject(file);
    e.target.value = '';
    setShowMore(false);
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-950 border-b border-gray-800 shrink-0 relative z-30">
      {/* Brand */}
      <div className="flex items-center gap-1.5 mr-2 shrink-0">
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-indigo-400" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="6" height="6" rx="1"/>
          <rect x="9" y="1" width="6" height="6" rx="1" opacity=".5"/>
          <rect x="1" y="9" width="6" height="6" rx="1" opacity=".5"/>
          <rect x="9" y="9" width="6" height="6" rx="1"/>
        </svg>
        <span className="text-xs font-semibold text-gray-500 tracking-wide">Projects</span>
      </div>

      {/* Project selector */}
      <select
        value={activeProject ?? ''}
        onChange={(e) => e.target.value && loadProject(e.target.value)}
        className="bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-1 text-xs focus:outline-none cursor-pointer hover:border-gray-600 transition-colors min-w-[160px]"
      >
        <option value="" disabled>
          {projectNames.length ? '— Select project —' : 'No projects yet'}
        </option>
        {projectNames.map((name) => (
          <option key={name} value={name} className="bg-gray-900">
            {name}
          </option>
        ))}
      </select>

      {/* New */}
      <button
        onClick={handleNew}
        className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-medium px-3 py-1 rounded-lg transition-colors"
      >
        New
      </button>

      {/* Save / Save As */}
      <button
        onClick={handleSave}
        className={`text-xs font-semibold px-4 py-1 rounded-lg border transition-all ${
          saved
            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
            : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white border-indigo-600'
        }`}
      >
        {saved ? '✓ Saved' : activeProject ? 'Save' : 'Save As…'}
      </button>

      {/* ⋯ more actions */}
      <div className="relative">
        <button
          onClick={() => setShowMore((v) => !v)}
          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
            showMore
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
          title="More actions"
        >
          ⋯
        </button>

        {showMore && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />

            {/* Dropdown */}
            <div className="absolute left-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
              <button
                onClick={handleSaveAs}
                className="w-full text-left text-xs text-gray-300 hover:bg-gray-700 px-4 py-2 transition-colors"
              >
                Save As…
              </button>
              {activeProject && (
                <>
                  <button
                    onClick={handleDuplicate}
                    className="w-full text-left text-xs text-gray-300 hover:bg-gray-700 px-4 py-2 transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={handleExport}
                    className="w-full text-left text-xs text-gray-300 hover:bg-gray-700 px-4 py-2 transition-colors"
                  >
                    Export .json
                  </button>
                </>
              )}
              <button
                onClick={() => importRef.current?.click()}
                className="w-full text-left text-xs text-gray-300 hover:bg-gray-700 px-4 py-2 transition-colors"
              >
                Import .json
              </button>
              {activeProject && (
                <>
                  <div className="h-px bg-gray-700 my-1 mx-2" />
                  <button
                    onClick={handleDelete}
                    className="w-full text-left text-xs text-red-400 hover:bg-red-900/30 px-4 py-2 transition-colors"
                  >
                    Delete "{activeProject}"
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />

      {/* Export & Deploy Hub button */}
      <button
        onClick={() => setShowExport(true)}
        title="Export & Deploy Hub"
        className={`
          flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg border transition-colors
          ${hasGHToken
            ? 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white'
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}
        `}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
        Export
      </button>

      {/* Export modal */}
      {showExport && <ExportDeployHub onClose={() => setShowExport(false)} />}

      {/* AI Settings gear */}
      <button
        onClick={() => setShowSettings(true)}
        title="AI Settings"
        className={`
          w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0
          ${hasAIKey
            ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-transparent'
            : 'text-amber-400 bg-amber-400/10 border border-amber-500/30 hover:bg-amber-400/20'
          }
        `}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
        </svg>
      </button>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Active project + stats */}
      <div className="ml-auto flex items-center gap-3">
        {activeProject ? (
          <span className="text-xs text-gray-600">
            <span className="text-indigo-400 font-medium">{activeProject}</span>
            <span className="ml-1.5">
              · {projectNames.length} project{projectNames.length !== 1 ? 's' : ''} saved
            </span>
          </span>
        ) : (
          <span className="text-xs text-gray-700">No active project — create one to save your work</span>
        )}
      </div>
    </div>
  );
}
