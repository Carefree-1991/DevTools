import { createContext, useCallback, useContext, useRef, useState } from 'react';

const STORAGE_KEY = 'devtools_v1_projects';
const ACTIVE_KEY  = 'devtools_v1_active';

function readStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}; }
  catch { return {}; }
}

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState(readStorage);
  const [activeProject, setActiveProject] = useState(
    () => localStorage.getItem(ACTIVE_KEY) ?? null
  );
  // { toolId: { getSaveState, loadState } }
  const tools = useRef({});

  function persist(updated) {
    setProjects(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Tools call this once on mount to wire themselves in.
  // Returns a cleanup function.
  const registerTool = useCallback((id, getSaveState, loadState) => {
    tools.current[id] = { getSaveState, loadState };
    return () => { delete tools.current[id]; };
  }, []);

  function saveProject(name) {
    const toolStates = {};
    for (const [id, { getSaveState }] of Object.entries(tools.current)) {
      try { toolStates[id] = getSaveState(); } catch { /* skip */ }
    }
    const updated = { ...projects, [name]: toolStates };
    persist(updated);
    setActiveProject(name);
    localStorage.setItem(ACTIVE_KEY, name);
  }

  function loadProject(name) {
    const saved = projects[name];
    if (!saved) return;
    for (const [id, { loadState }] of Object.entries(tools.current)) {
      try { loadState(saved[id] ?? null); } catch { /* skip */ }
    }
    setActiveProject(name);
    localStorage.setItem(ACTIVE_KEY, name);
  }

  function newProject(name) {
    const n = name?.trim();
    if (!n) return;
    for (const { loadState } of Object.values(tools.current)) {
      try { loadState(null); } catch { /* skip */ }
    }
    persist({ ...projects, [n]: {} });
    setActiveProject(n);
    localStorage.setItem(ACTIVE_KEY, n);
  }

  function deleteProject(name) {
    const updated = { ...projects };
    delete updated[name];
    persist(updated);
    if (activeProject === name) {
      setActiveProject(null);
      localStorage.removeItem(ACTIVE_KEY);
      for (const { loadState } of Object.values(tools.current)) {
        try { loadState(null); } catch { /* skip */ }
      }
    }
  }

  function duplicateProject(name) {
    const newName = `${name} (copy)`;
    const base = newName.endsWith(' (copy)') ? newName : newName;
    const final = projects[newName] ? `${newName} 2` : newName;
    persist({ ...projects, [final]: JSON.parse(JSON.stringify(projects[name] ?? {})) });
    return final;
  }

  function exportProject(name) {
    const blob = new Blob(
      [JSON.stringify({ [name]: projects[name] ?? {} }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.devtools.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importProject(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const entries = Object.entries(data);
        if (!entries.length) throw new Error('Empty file');
        const [name, state] = entries[0];
        const updated = { ...projects, [name]: state };
        persist(updated);
        // Load it
        for (const [id, { loadState }] of Object.entries(tools.current)) {
          try { loadState(state[id] ?? null); } catch { /* skip */ }
        }
        setActiveProject(name);
        localStorage.setItem(ACTIVE_KEY, name);
      } catch (err) {
        alert(`Failed to import: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  // Inject AI-generated state into a single tool without touching the others
  function injectToolState(toolId, state) {
    const tool = tools.current[toolId];
    if (!tool) throw new Error(`Tool "${toolId}" is not registered`);
    tool.loadState(state);
  }

  // Read the current live state from a single tool (for AI context)
  function getToolState(toolId) {
    const tool = tools.current[toolId];
    return tool ? tool.getSaveState() : null;
  }

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      registerTool,
      saveProject,
      loadProject,
      newProject,
      deleteProject,
      duplicateProject,
      exportProject,
      importProject,
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
