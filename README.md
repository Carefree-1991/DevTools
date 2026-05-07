# DevTools — Local Dev Dashboard

A local, **frontend-only** single-page application (SPA) that functions as a personal software-architecture workbench. All five tools run entirely in the browser — no server, no backend, no accounts required.

---

## What's inside

| Tab | Tool | Purpose |
|-----|------|---------|
| 1 | **Data Visualizer** | Drag-and-drop ERD canvas. Build database tables with typed columns and draw relationship edges between them. |
| 2 | **UI Wireframer** | Lo-fi page wireframer. Drag pre-built component blocks (Navbar, Sidebar, Data Table, Form, Button, Image, Chart) onto a mock browser canvas and reorder them. |
| 3 | **Journey Mapper** | User-flow diagram canvas. Connect colour-coded screen/state nodes with labelled, styled edges to map how users navigate a product. |
| 4 | **JSON Contract Builder** | Visual API schema builder. Construct nested JSON payloads in a point-and-click UI; live-preview exports as a JSON example, TypeScript interface, or OpenAPI schema. |
| 5 | **Component Tree** | React component hierarchy planner. Build a parent/child tree, drag to reparent, and generate file paths and shell commands for four common folder conventions. |

A **Project Management bar** sits above the tabs and persists the full state of all five tools simultaneously to `localStorage` under named projects.

---

## Tech stack

| Layer | Library / Tool | Version |
|-------|---------------|---------|
| Framework | React | 19 |
| Build tool | Vite | 8 |
| Styling | Tailwind CSS | 3 |
| Canvas / graphs | React Flow (`reactflow`) | 11 |
| Drag-and-drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | 6 / 10 / 3 |
| Language | JavaScript (JSX) | ES2022+ |
| Persistence | Browser `localStorage` | — |

---

## Directory layout

```
/
├── docs/
│   ├── ARCHITECTURE_RULES.md    # Strict rules for AI-assisted development
│   └── EXTENSION_GUIDE.md       # Step-by-step checklist for adding new tools/tabs
├── src/
│   ├── App.jsx                  # Root: ProjectProvider + tab shell
│   ├── main.jsx                 # ReactDOM entry point
│   ├── index.css                # Tailwind directives + ReactFlow base styles
│   └── components/
│       ├── project/
│       │   ├── ProjectContext.jsx    # Global context: projects, registerTool, save/load/export
│       │   └── ProjectHeader.jsx    # Top bar UI: selector, Save, New, Delete, Export/Import
│       ├── DataVisualizerApp.jsx    # Tab 1 — ERD canvas (React Flow)
│       ├── Sidebar.jsx              # Data Visualizer left panel
│       ├── TableNode.jsx            # Data Visualizer custom React Flow node
│       ├── wireframer/
│       │   ├── WireframerApp.jsx    # Tab 2 — lo-fi wireframer (dnd-kit)
│       │   ├── ToolboxSidebar.jsx
│       │   ├── WireframeCanvas.jsx
│       │   └── blocks.jsx           # All 7 wireframe block renderers
│       ├── journeyMapper/
│       │   ├── JourneyMapperApp.jsx # Tab 3 — user-flow canvas (React Flow)
│       │   ├── JourneyNode.jsx
│       │   ├── JourneyEdge.jsx
│       │   └── MapperSidebar.jsx
│       ├── jsonContract/
│       │   ├── JsonContractApp.jsx  # Tab 4 — JSON schema builder
│       │   ├── FieldRow.jsx         # Recursive field editor row
│       │   └── codeGen.js           # Pure fns: JSON / TS / OpenAPI generation
│       └── treeVisualizer/
│           ├── TreeVisualizerApp.jsx # Tab 5 — component tree planner (dnd-kit + React Flow)
│           ├── ComponentNode.jsx     # React Flow node for the tree canvas
│           └── pathGen.js            # Path generation + layout algorithm
├── README.md
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

---

## Local development

```bash
# Install dependencies (first time only)
npm install

# Start dev server — opens at http://localhost:5173
npm run dev

# Production build (output to /dist)
npm run build

# Preview the production build locally
npm run preview
```

> **No environment variables required.** There is no `.env` file and no API keys. Everything runs client-side.

---

## Keyboard shortcuts (canvas tools)

| Key | Action |
|-----|--------|
| `Delete` | Remove selected node or edge |
| `Shift + click` | Multi-select nodes |
| `Scroll` | Zoom in / out |
| `Drag canvas` | Pan |
| `Double-click name` | Rename node inline (Journey Mapper, Component Tree) |
| Click `+ action` on edge | Add or edit an edge label (Journey Mapper) |

---

## Project persistence

Projects are stored in `localStorage` under the key `devtools_v1_projects`.  
The active project name is stored under `devtools_v1_active`.

**localStorage shape:**

```json
{
  "MyProject": {
    "visualizer": { "nodes": [], "edges": [] },
    "wireframer":  { "canvasItems": [] },
    "journey":     { "nodes": [], "edges": [] },
    "contract":    { "fields": [], "method": "POST", "path": "/api/v1/", "schemaName": "Payload", "description": "" },
    "tree":        { "nodes": [], "convention": "feature" }
  }
}
```

To wipe all saved data:

```js
// Paste into the browser console
localStorage.removeItem('devtools_v1_projects');
localStorage.removeItem('devtools_v1_active');
location.reload();
```

---

## Docs

| File | Purpose |
|------|---------|
| [`docs/ARCHITECTURE_RULES.md`](docs/ARCHITECTURE_RULES.md) | Hard constraints and patterns every AI contributor must follow |
| [`docs/EXTENSION_GUIDE.md`](docs/EXTENSION_GUIDE.md) | Exact checklist for adding a new tab/tool without breaking anything |
