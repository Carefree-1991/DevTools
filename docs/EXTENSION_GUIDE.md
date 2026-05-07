# Extension Guide — Adding a New Tab / Tool

> **Audience:** AI assistants tasked with adding a new tool to the Dev Dashboard.  
> Follow this checklist in order. Do not skip steps. After completing all steps, run `npm run build` to verify zero errors before reporting the work as done.

---

## Overview

Every tool in this dashboard follows the same pattern:

1. A **feature folder** `src/components/<toolName>/` containing the tool's components and utilities.
2. A **main component** `<ToolName>App.jsx` exported as default.
3. A **registration block** inside the main component that wires the tool's save/load state into `ProjectContext`.
4. A **tab entry** in `src/App.jsx` — a new entry in the `TABS` array and a new `<div hidden/block>` in the tool area.
5. A **tool ID** added to the localStorage schema (documented in `ARCHITECTURE_RULES.md`).

---

## Pre-flight checklist

Before writing any code, answer these questions:

- [ ] What is the tool's **name**? (e.g., `Timeline Planner`)
- [ ] What is the tool's **folder name**? Use camelCase: `timelinePlanner`
- [ ] What is the tool's **tab ID**? Use kebab-case: `timeline`
- [ ] What is the tool's **`registerTool` ID**? Use the tab ID: `'timeline'`
- [ ] What **state** needs to be saved? List every `useState` field that must survive a project save/load.
- [ ] Does the tool use **React Flow**? If yes, use the key+initialState pattern (see Step 4b).
- [ ] Does the tool use **`@dnd-kit`**? If yes, review the Wireframer for the standard DnD setup.
- [ ] Does it need any **new npm packages**? Get user approval before `npm install`.

---

## Step 1 — Create the feature folder

```
src/components/<toolName>/
├── <ToolName>App.jsx     ← main export (required)
└── (additional files as needed)
```

Rules:
- Sub-components live in this folder, not in `src/components/` root.
- Pure helper functions (no React) go in a dedicated `.js` file inside the folder.
- Copy the closest existing tool as a starting template.

---

## Step 2 — Wire the tool into ProjectContext

Inside `<ToolName>App.jsx`, add the registration block immediately after your `useState` declarations. This is the **exact pattern** — do not deviate:

```jsx
import { useEffect, useRef, useState } from 'react';
import { useProject } from '../project/ProjectContext';

export default function MyNewToolApp() {
  // 1. Declare all state
  const [items, setItems] = useState([]);
  const [setting, setSetting] = useState('default');

  // 2. Reference the context
  const { registerTool, activeProject, projects } = useProject();

  // 3. saveRef — reassigned every render so getSaveState() is never stale
  const saveRef = useRef({});
  saveRef.current = { items, setting };

  // 4. Register once on mount
  useEffect(() => {
    // Auto-load if there is already an active project with saved state for this tool
    const saved = activeProject ? projects[activeProject]?.['<toolId>'] : null;
    if (saved) loadState(saved);

    // Return the cleanup function (unregisters on unmount)
    return registerTool('<toolId>', () => saveRef.current, loadState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. loadState — must reset ALL state fields
  function loadState(saved) {
    setItems(saved?.items ?? []);
    setSetting(saved?.setting ?? 'default');
  }

  // ... rest of component
}
```

**Checklist for this step:**
- [ ] `saveRef.current` is assigned every render (not inside a useEffect or useCallback).
- [ ] `loadState` sets **every** state field — omitting a field means it retains stale data across project loads.
- [ ] `loadState` is called with `null` when creating a new project (the context handles this — `loadState(null)` → your defaults via `?? 'default'` pattern).
- [ ] The `useEffect` dependency array is empty `[]`.
- [ ] The `// eslint-disable-line react-hooks/exhaustive-deps` comment is present.

---

## Step 2b — React Flow tools only

If the tool uses React Flow (`useNodesState`, `useEdgesState`), those hooks must be called inside `<ReactFlowProvider>`. Use the **key+initialState pattern** instead of the basic pattern above.

**In the outer component** (where you call `useProject`):

```jsx
export default function MyNewToolApp() {
  const [flowKey,    setFlowKey]    = useState(0);
  const [loadSignal, setLoadSignal] = useState(null);

  const saveRef = useRef({ nodes: [], edges: [] });
  const onStateChange = useCallback((n, e) => {
    saveRef.current = { nodes: n, edges: e };
  }, []);

  const { registerTool, activeProject, projects } = useProject();

  useEffect(() => {
    const saved = activeProject ? projects[activeProject]?.['<toolId>'] : null;
    if (saved) triggerLoad(saved);
    return registerTool('<toolId>', () => saveRef.current, triggerLoad);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerLoad(data) {
    setLoadSignal(data ?? { nodes: [], edges: [] });
    setFlowKey(k => k + 1); // forces inner Flow to remount with new initial data
  }

  return (
    <ReactFlowProvider>
      <Flow
        key={flowKey}
        loadSignal={loadSignal}
        onStateChange={onStateChange}
        {/* other props */}
      />
    </ReactFlowProvider>
  );
}
```

**In the inner `Flow` component** (inside `ReactFlowProvider`):

```jsx
function Flow({ loadSignal, onStateChange, ... }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(loadSignal?.data?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadSignal?.data?.edges ?? []);

  // Report current state upward so the outer component can save it
  useEffect(() => {
    onStateChange?.(nodes, edges);
  }, [nodes, edges, onStateChange]);

  // ...
}
```

---

## Step 3 — Add the tab to App.jsx

Open `src/App.jsx` and make **two** targeted edits:

### 3a. Add the import (top of file)

```jsx
import MyNewToolApp from './components/<toolName>/<ToolName>App';
```

### 3b. Add an entry to the TABS array

```jsx
const TABS = [
  { id: 'visualizer', label: 'Data Visualizer'      },
  { id: 'wireframer', label: 'UI Wireframer'         },
  { id: 'journey',    label: 'Journey Mapper'        },
  { id: 'contract',   label: 'JSON Contract Builder' },
  { id: 'tree',       label: 'Component Tree'        },
  { id: '<toolId>',   label: '<Tab Display Name>'    },  // ← ADD THIS
];
```

### 3c. Add the tool panel in the tool area

```jsx
{/* add immediately after the last existing tool div */}
<div className={`h-full ${activeTab === '<toolId>' ? 'block' : 'hidden'}`}>
  <MyNewToolApp />
</div>
```

**Checklist for this step:**
- [ ] Import is at the top of the file with other tool imports.
- [ ] Tab `id` in the TABS array matches the `registerTool` ID exactly.
- [ ] The `hidden/block` pattern is used (not conditional rendering / unmounting).
- [ ] No other changes to `App.jsx` are needed.

---

## Step 4 — Document the new tool ID

Update `docs/ARCHITECTURE_RULES.md` — find the **Tool IDs** table in section 3.3 and add a row:

```markdown
| My New Tool | `'<toolId>'` |
```

---

## Step 5 — Verify the build

```bash
npm run build
```

Expected output:
```
✓ N modules transformed.
✓ built in Xms
```

If the build fails, fix all errors before proceeding. Do not report the task as complete if the build has warnings about missing exports or undefined variables.

---

## Step 6 — Smoke-test checklist (manual)

Open `http://localhost:5173` (`npm run dev`) and verify:

- [ ] New tab is visible in the tab bar and clicking it shows the tool.
- [ ] All existing tabs still work correctly (no regressions).
- [ ] Create a new project → new tool starts with default/empty state.
- [ ] Add some data to the new tool.
- [ ] Click **Save** → confirm the project is saved (check localStorage in DevTools: `devtools_v1_projects`).
- [ ] Reload the page → active project auto-restores → new tool's data is present.
- [ ] Switch to a different project → new tool clears / loads that project's state.
- [ ] Screenshot mode (Hide UI button) hides sidebar and controls.

---

## Common mistakes to avoid

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Forgetting to assign `saveRef.current` every render | Saved state is always empty or stale | Move the assignment outside `useEffect`, directly in the component body |
| Using a non-empty `useEffect` dep array for registration | Tool re-registers on every state change, causing double-loads | Keep deps array empty `[]` |
| Using `activeTab === 'x' && <ToolApp />` (conditional render) | Tool unmounts on tab switch, losing all in-memory state | Use `hidden/block` CSS class pattern instead |
| Introducing a new `registerTool` ID that duplicates an existing one | Two tools overwrite each other's save slot | Check the Tool IDs table in `ARCHITECTURE_RULES.md` first |
| Renaming an existing `registerTool` ID | All existing saved projects lose that tool's data silently | Never rename IDs; bump the storage schema version if restructuring |
| Not resetting module-level counters (`nodeCounter`, `_nid`, `itemCounter`) in `loadState` | New items created after loading can have IDs that collide with loaded ones | Set the counter to `max(loadedIds) + 1` or a safe large number |
| Adding a new npm dependency without asking | Breaks the no-external-deps constraint | Ask the user before `npm install` |

---

## Quick-reference: file touch map for a new tool

```
NEW  src/components/<toolName>/<ToolName>App.jsx
NEW  src/components/<toolName>/...  (as needed)
EDIT src/App.jsx                    (import + TABS entry + tool div)
EDIT docs/ARCHITECTURE_RULES.md    (Tool IDs table)
```

That is the complete set of files that must change. Nothing else should need updating.
