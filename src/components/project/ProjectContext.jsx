import { createContext, useCallback, useContext, useRef, useState } from 'react';

const STORAGE_KEY = 'devtools_v1_projects';
const ACTIVE_KEY  = 'devtools_v1_active';

function readStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
  catch { return {}; }
}

// ── Multi-file format helpers ─────────────────────────────────────────────────
//
//  New format:  toolData = { _active: 'FileName', 'FileName': {...state} }
//  Legacy:      toolData = {...state}   (flat blob from v1)
//
// Any read path calls toMultiFile() to migrate transparently.

function isMultiFile(v) {
  return v !== null && typeof v === 'object' && '_active' in v;
}

function toMultiFile(v, defaultName = 'Default') {
  if (isMultiFile(v)) return v;
  return { _active: defaultName, [defaultName]: v };
}

// ── Context ───────────────────────────────────────────────────────────────────

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects,      setProjects]      = useState(readStorage);
  const [activeProject, setActiveProject] = useState(() => localStorage.getItem(ACTIVE_KEY) ?? null);
  // { toolId: activeFileName }  — drives the file explorer highlights
  const [activeFiles,   setActiveFiles]   = useState({});
  const tools = useRef({}); // toolId → { getSaveState, loadState }

  // ── Persistence ────────────────────────────────────────────────────────────

  function persist(updated) {
    setProjects(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Read fresh from localStorage, bypassing potentially-stale React state.
  // Needed inside callbacks that run right after a persist() call.
  function freshProjects() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
    catch { return {}; }
  }

  // ── Tool registration ──────────────────────────────────────────────────────

  const registerTool = useCallback((id, getSaveState, loadState) => {
    tools.current[id] = { getSaveState, loadState };
    return () => { delete tools.current[id]; };
  }, []);

  // ── Internal helpers ───────────────────────────────────────────────────────

  function _activeFileName(toolId) {
    return activeFiles[toolId] ?? 'Default';
  }

  /** Save the current canvas state into the active file slot — single tool, no full project save. */
  function _saveCurrentFile(toolId) {
    if (!activeProject) return;
    const tool = tools.current[toolId];
    if (!tool) return;
    try {
      const state      = tool.getSaveState();
      const fileName   = _activeFileName(toolId);
      const all        = freshProjects();
      const existing   = all[activeProject]?.[toolId];
      const multi      = isMultiFile(existing) ? existing : toMultiFile(existing);
      const updated    = { ...all, [activeProject]: { ...all[activeProject], [toolId]: { ...multi, [fileName]: state, _active: fileName } } };
      persist(updated);
    } catch { /* skip */ }
  }

  // ── Public: initial-state reader (used by each tool's mount effect) ────────

  /**
   * Returns the state blob for the currently-active file of a tool,
   * migrating legacy flat format on the fly.
   * Call this inside a useEffect([]) to get the right state on first mount.
   */
  function getInitialToolState(toolId) {
    if (!activeProject) return null;
    const toolData = projects[activeProject]?.[toolId];
    if (!toolData) return null;
    if (isMultiFile(toolData)) {
      const fileName = activeFiles[toolId] ?? toolData._active ?? 'Default';
      return toolData[fileName] ?? null;
    }
    // Legacy flat format — return as-is
    return toolData;
  }

  // ── Project CRUD ───────────────────────────────────────────────────────────

  function saveProject(name) {
    // Preserve all existing files; only update the currently-active file per tool.
    const existing   = projects[name] ?? {};
    const toolStates = { ...existing };

    for (const [id, { getSaveState }] of Object.entries(tools.current)) {
      try {
        const state    = getSaveState();
        const fileName = activeFiles[id] ?? 'Default';
        const prev     = toolStates[id];
        const multi    = isMultiFile(prev) ? prev : toMultiFile(prev);
        toolStates[id] = { ...multi, _active: fileName, [fileName]: state };
      } catch { /* skip */ }
    }

    persist({ ...projects, [name]: toolStates });
    setActiveProject(name);
    localStorage.setItem(ACTIVE_KEY, name);
  }

  function loadProject(name) {
    const saved = projects[name];
    if (!saved) return;

    const newActives = {};

    for (const [id, { loadState }] of Object.entries(tools.current)) {
      try {
        const toolData = saved[id];
        if (!toolData) { loadState(null); newActives[id] = 'Default'; continue; }

        const multi      = isMultiFile(toolData) ? toolData : toMultiFile(toolData);
        const activeFile = multi._active ?? Object.keys(multi).find(k => k !== '_active') ?? 'Default';

        newActives[id] = activeFile;
        loadState(multi[activeFile] ?? null);
      } catch { newActives[id] = 'Default'; }
    }

    setActiveFiles(newActives);
    setActiveProject(name);
    localStorage.setItem(ACTIVE_KEY, name);
  }

  function newProject(name) {
    const n = name?.trim();
    if (!n) return;

    const newActives = {};
    const toolStates = {};

    for (const [id, { loadState }] of Object.entries(tools.current)) {
      try { loadState(null); } catch { /* skip */ }
      newActives[id] = 'Default';
      toolStates[id] = { _active: 'Default', Default: null };
    }

    persist({ ...projects, [n]: toolStates });
    setActiveProject(n);
    localStorage.setItem(ACTIVE_KEY, n);
    setActiveFiles(newActives);
  }

  function deleteProject(name) {
    const updated = { ...projects };
    delete updated[name];
    persist(updated);
    if (activeProject === name) {
      setActiveProject(null);
      localStorage.removeItem(ACTIVE_KEY);
      setActiveFiles({});
      for (const { loadState } of Object.values(tools.current)) {
        try { loadState(null); } catch { /* skip */ }
      }
    }
  }

  function duplicateProject(name) {
    const base  = name + ' (copy)';
    const final = projects[base] ? base + ' 2' : base;
    persist({ ...projects, [final]: JSON.parse(JSON.stringify(projects[name] ?? {})) });
    return final;
  }

  function exportProject(name) {
    const blob = new Blob([JSON.stringify({ [name]: projects[name] ?? {} }, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${name.replace(/[^a-z0-9]/gi, '_')}.devtools.json` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function importProject(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data    = JSON.parse(e.target.result);
        const entries = Object.entries(data);
        if (!entries.length) throw new Error('Empty file');
        const [name, projectData] = entries[0];

        // Migrate all tools to multi-file format on import
        const migrated   = {};
        const newActives = {};
        for (const [id, toolData] of Object.entries(projectData ?? {})) {
          const multi     = isMultiFile(toolData) ? toolData : toMultiFile(toolData);
          migrated[id]    = multi;
          const af        = multi._active ?? Object.keys(multi).find(k => k !== '_active') ?? 'Default';
          newActives[id]  = af;
        }

        const updated = { ...projects, [name]: migrated };
        persist(updated);

        for (const [id, { loadState }] of Object.entries(tools.current)) {
          try {
            const af = newActives[id] ?? 'Default';
            loadState(migrated[id]?.[af] ?? null);
          } catch { /* skip */ }
        }

        setActiveProject(name);
        setActiveFiles(newActives);
        localStorage.setItem(ACTIVE_KEY, name);
      } catch (err) {
        alert(`Failed to import: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  // ── File management (multi-file per tool) ──────────────────────────────────

  /** All file names for a tool in the active project. */
  function getToolFiles(toolId) {
    if (!activeProject) return ['Default'];
    const toolData = projects[activeProject]?.[toolId];
    if (!toolData) return ['Default'];
    const multi = isMultiFile(toolData) ? toolData : toMultiFile(toolData);
    return Object.keys(multi).filter(k => k !== '_active');
  }

  /** The active file name for a tool. */
  function getActiveFileName(toolId) {
    return activeFiles[toolId] ?? 'Default';
  }

  /**
   * Switch to a different file within the same tool.
   * Auto-saves the current canvas first so no work is lost.
   */
  function loadFile(toolId, fileName) {
    if (!activeProject) return;
    const tool = tools.current[toolId];
    if (!tool) return;
    const currentFile = _activeFileName(toolId);
    if (currentFile === fileName) return;

    // Capture current canvas state before switching
    const currentState = (() => { try { return tool.getSaveState(); } catch { return null; } })();

    // Build an atomically-updated projects blob
    const prev    = projects[activeProject]?.[toolId];
    const multi   = isMultiFile(prev) ? { ...prev } : toMultiFile(prev);
    multi[currentFile] = currentState; // save current
    multi._active      = fileName;

    const newState = multi[fileName] ?? null;
    const all      = { ...projects, [activeProject]: { ...projects[activeProject], [toolId]: multi } };

    tool.loadState(newState);
    setActiveFiles(af => ({ ...af, [toolId]: fileName }));
    persist(all);
  }

  /**
   * Create a new empty file for a tool and switch to it.
   * Auto-saves the current file first.
   */
  function createNewFile(toolId, fileName) {
    const name = fileName?.trim();
    if (!name || !activeProject || name === '_active') return false;

    const currentFiles = getToolFiles(toolId);
    if (currentFiles.includes(name)) return false; // duplicate

    const tool = tools.current[toolId];
    const currentState = (() => { try { return tool?.getSaveState() ?? null; } catch { return null; } })();
    const currentFile  = _activeFileName(toolId);

    const prev  = projects[activeProject]?.[toolId];
    const multi = isMultiFile(prev) ? { ...prev } : toMultiFile(prev);
    multi[currentFile] = currentState; // save current
    multi[name]        = null;         // empty new file
    multi._active      = name;

    const all = { ...projects, [activeProject]: { ...projects[activeProject], [toolId]: multi } };

    if (tool) tool.loadState(null); // clear canvas
    setActiveFiles(af => ({ ...af, [toolId]: name }));
    persist(all);
    return true;
  }

  /** Rename a file. */
  function renameFile(toolId, oldName, newName) {
    const name = newName?.trim();
    if (!name || !activeProject || oldName === name || name === '_active') return false;

    const prev = projects[activeProject]?.[toolId];
    if (!prev) return false;
    const multi = isMultiFile(prev) ? { ...prev } : toMultiFile(prev);
    if (!(oldName in multi)) return false;
    if (name in multi) return false; // already taken

    multi[name] = multi[oldName];
    delete multi[oldName];
    if (multi._active === oldName) multi._active = name;

    const all = { ...projects, [activeProject]: { ...projects[activeProject], [toolId]: multi } };
    persist(all);

    if (activeFiles[toolId] === oldName) {
      setActiveFiles(af => ({ ...af, [toolId]: name }));
    }
    return true;
  }

  /** Delete a file. Cannot delete the last file. */
  function deleteFile(toolId, fileName) {
    if (!activeProject) return false;

    const prev  = projects[activeProject]?.[toolId];
    const multi = isMultiFile(prev) ? { ...prev } : toMultiFile(prev);
    const names = Object.keys(multi).filter(k => k !== '_active');
    if (names.length <= 1) return false;

    delete multi[fileName];

    const tool       = tools.current[toolId];
    let newActive    = activeFiles[toolId];

    if (multi._active === fileName || newActive === fileName) {
      const remaining = Object.keys(multi).filter(k => k !== '_active');
      newActive        = remaining[0] ?? 'Default';
      multi._active    = newActive;
      if (tool) tool.loadState(multi[newActive] ?? null);
      setActiveFiles(af => ({ ...af, [toolId]: newActive }));
    }

    const all = { ...projects, [activeProject]: { ...projects[activeProject], [toolId]: multi } };
    persist(all);
    return true;
  }

  // ── AI integration ─────────────────────────────────────────────────────────

  function injectToolState(toolId, state) {
    const tool = tools.current[toolId];
    if (!tool) throw new Error(`Tool "${toolId}" is not registered`);
    tool.loadState(state);
  }

  function getToolState(toolId) {
    const tool = tools.current[toolId];
    return tool ? tool.getSaveState() : null;
  }

  // ── Context value ──────────────────────────────────────────────────────────

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      registerTool,
      getInitialToolState,
      // Project operations
      saveProject,
      loadProject,
      newProject,
      deleteProject,
      duplicateProject,
      exportProject,
      importProject,
      // Multi-file operations
      getToolFiles,
      getActiveFileName,
      createNewFile,
      loadFile,
      renameFile,
      deleteFile,
      // AI integration
      injectToolState,
      getToolState,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside <ProjectProvider>');
  return ctx;
}
