import { useRef, useState } from 'react';
import { useProject } from './ProjectContext';

export default function ProjectHeader() {
  const {
    projects, activeProject,
    saveProject, loadProject, newProject, deleteProject,
    duplicateProject, exportProject, importProject,
  } = useProject();

  const [saved,      setSaved]      = useState(false);
  const [showMore,   setShowMore]   = useState(false);
  const importRef    = useRef(null);
  const projectNames = Object.keys(projects);

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
