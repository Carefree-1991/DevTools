# Architecture Rules

> **Audience:** AI assistants (Claude, GPT, Gemini, etc.) contributing code to this repository.  
> **Authority:** These rules are non-negotiable. Do not deviate from them unless the user explicitly overrides a specific rule in the same conversation.

---

## 1. Frontend-only, serverless constraint

This application is **100% client-side**. There is no:

- Backend server or API
- Database (server-side)
- Authentication service
- Network requests at runtime (no `fetch`, `axios`, or WebSocket calls)
- Build-time secrets or environment variables

**All persistence is via `localStorage`.** Every feature you add must respect this constraint. If a requested feature requires a server, pause and ask the user how they want to handle it before writing any code.

---

## 2. Tab and component structure

### 2.1 Entry point

`src/App.jsx` is the single entry point. It:

1. Wraps everything in `<ProjectProvider>` (the global context).
2. Renders `<ProjectHeader>` — the project management bar above all tabs.
3. Renders the tab navigation bar.
4. Renders each tool component inside a `<div className="h-full hidden/block">` — **all tabs stay mounted** (CSS `hidden` not React unmounting). This preserves in-memory state across tab switches.

```jsx
// App.jsx structure — do not restructure this
<ProjectProvider>
  <ProjectHeader />
  <TabBar />
  <div className="flex-1 overflow-hidden">
    <div className={activeTab === 'visualizer' ? 'block' : 'hidden'}>
      <DataVisualizerApp />
    </div>
    {/* ... one div per tool ... */}
  </div>
</ProjectProvider>
```

### 2.2 Tool folder conventions

Each tool lives in its own folder under `src/components/`:

```
src/components/<toolName>/
├── <ToolName>App.jsx    # Main entry component exported as default
├── <ToolName>Sidebar.jsx or similar sub-components
└── utils.js / codeGen.js / pathGen.js  (pure helper functions, no React)
```

**Rules:**
- The main component exported from each tool folder is `<ToolName>App.jsx`.
- Sub-components are co-located in the same folder — never scatter them to a shared `components/` root unless they are genuinely shared (currently: `Sidebar.jsx` and `TableNode.jsx` are shared only by `DataVisualizerApp`).
- Pure utility functions (no React, no hooks) live in a dedicated `.js` file inside the tool folder (`codeGen.js`, `pathGen.js`). Do not put business logic inside component files.

---

## 3. Project context and localStorage system

### 3.1 How it works

`src/components/project/ProjectContext.jsx` manages all cross-tool persistence.

```
ProjectContext
  ├── projects: Record<string, ProjectState>   (mirrors localStorage)
  ├── activeProject: string | null
  ├── registerTool(id, getSaveState, loadState) → cleanup fn
  ├── saveProject(name)
  ├── loadProject(name)
  ├── newProject(name)
  ├── deleteProject(name)
  ├── duplicateProject(name)
  ├── exportProject(name)   → triggers .json download
  └── importProject(file)   → reads .json, calls loadProject
```

### 3.2 The `registerTool` contract

Every tool component **must** register with the context on mount. This is the mechanism that gives the project system access to each tool's state.

```jsx
// Pattern used by every tool — copy this exactly
const { registerTool, activeProject, projects } = useProject();
const saveRef = useRef({});
saveRef.current = { /* all serialisable state fields */ };

useEffect(() => {
  // Auto-load saved state if a project is already active
  const saved = activeProject ? projects[activeProject]?.['<toolId>'] : null;
  if (saved) loadState(saved);

  // Register — returns a cleanup fn that unregisters on unmount
  return registerTool('<toolId>', () => saveRef.current, loadState);
}, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once
```

**Key details:**
- `saveRef.current` is reassigned on **every render**, so `getSaveState()` (which reads from it) always returns the latest values without stale-closure issues.
- `loadState` must call the tool's own React state setters directly (e.g., `setCanvasItems`, `setFields`).
- `useEffect` has an empty dependency array (`[]`) — the registration happens once. The `eslint-disable` comment is expected and correct.

### 3.3 Tool IDs

| Tool | `registerTool` id |
|------|-----------------|
| Data Visualizer | `'visualizer'` |
| UI Wireframer | `'wireframer'` |
| Journey Mapper | `'journey'` |
| JSON Contract Builder | `'contract'` |
| Component Tree | `'tree'` |

These IDs are the keys in the localStorage JSON. **Never rename an existing ID** — doing so silently breaks all saved projects for that tool.

### 3.4 React Flow tools (special handling)

`DataVisualizerApp` and `JourneyMapperApp` use React Flow. Because `useNodesState` / `useEdgesState` must be called inside `<ReactFlowProvider>`, their state lives in an **inner `Flow` component**. Loading saved data into this inner component is done via the **key+initialState pattern**:

```jsx
// Outer component (registers with context):
const [flowKey, setFlowKey] = useState(0);
const [loadSignal, setLoadSignal] = useState(null);

function triggerLoad(data) {
  setLoadSignal(data ?? { nodes: [], edges: [] });
  setFlowKey(k => k + 1); // forces inner Flow to remount
}

// Inner Flow receives initial data via props, not state setters:
function Flow({ loadSignal, onStateChange, ... }) {
  const [nodes, ...] = useNodesState(loadSignal?.data?.nodes ?? []);
  // reports state upward:
  useEffect(() => { onStateChange?.(nodes, edges); }, [nodes, edges]);
}
```

Do **not** attempt to call `setNodes` on the inner component from outside the provider — use the key remount pattern instead.

### 3.5 localStorage schema (v1)

```json
{
  "<ProjectName>": {
    "visualizer": { "nodes": [...], "edges": [...] },
    "wireframer":  { "canvasItems": [...] },
    "journey":     { "nodes": [...], "edges": [...] },
    "contract":    { "fields": [...], "method": "POST", "path": "...", "schemaName": "...", "description": "..." },
    "tree":        { "nodes": [...], "convention": "feature" }
  }
}
```

Storage keys:
- Projects: `devtools_v1_projects`
- Active project: `devtools_v1_active`

If you ever need to change the schema shape, bump the version prefix (`v2`) and write a one-time migration helper so existing data is not silently corrupted.

---

## 4. React coding standards

### 4.1 State management

- Use **React hooks only** (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`). No external state libraries (Redux, Zustand, Jotai, etc.).
- Keep tool state **local to the tool component**. Do not lift state to `App.jsx` unless it needs to be shared across tools (currently nothing does — only the project context crosses tool boundaries).
- `useCallback` on all functions passed as props to prevent unnecessary re-renders of child components.
- `useMemo` on expensive derivations (e.g., layout algorithms, code generation output).

### 4.2 Component size and responsibility

- A component file should do one thing. If a file exceeds ~200 lines, look for extraction opportunities.
- Pure helper functions (code generation, layout algorithms, path generation) **must** live in `.js` files, not inside component files. They must be independently testable with no React imports.
- Do not add `useEffect` for things that can be derived with `useMemo`. Derived state is not state.

### 4.3 No premature abstractions

- Do not create shared utility components or hooks unless they are actually shared across **two or more** tools.
- Do not add feature flags, version gates, or backwards-compatibility shims for hypothetical future requirements.
- Three similar lines of code is better than a premature abstraction.

### 4.4 Comments

- Write **zero** comments by default.
- Write a comment only when the **why** is non-obvious: a hidden constraint, a deliberate workaround, a subtle invariant. Never comment what the code does — well-named identifiers do that.
- Exception: the `eslint-disable-line` comment on `registerTool` useEffects is required and expected.

### 4.5 Styling

- **Tailwind CSS only.** Do not write custom CSS classes. Do not use inline `style={{}}` objects except for truly dynamic values that cannot be expressed as Tailwind classes (e.g., programmatically calculated pixel positions for React Flow handles).
- Dark theme is the default. The design language is dark gray backgrounds (`gray-900`, `gray-950`) with indigo accents (`indigo-400`, `indigo-600`).
- Screenshot / export modes must hide all chrome (sidebars, controls, minimap) and leave only the canvas content.

### 4.6 Error handling

- Do not add error handling for scenarios that cannot happen in normal usage.
- Validate only at genuine boundaries: user text input, `JSON.parse` calls, file reads.
- Do not wrap internal function calls in `try/catch` unless the function can legitimately throw.

---

## 5. Dependency rules

- **No new runtime dependencies** without user approval.
- The full allowed runtime dependency list: `react`, `react-dom`, `reactflow`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Dev dependencies (linters, type definitions) may be added freely.
- Do not install a library to solve a problem that can be solved in under 30 lines of vanilla JS.

---

## 6. Build and quality checks

Always run `npm run build` after making changes and confirm it exits with code 0 before reporting work as complete. A successful build is the minimum bar for correctness.

```bash
cd "path/to/project"
npm run build   # must exit 0 with "✓ built in ..." message
```
