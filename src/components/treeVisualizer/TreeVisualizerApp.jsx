import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../project/ProjectContext';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
} from 'reactflow';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import ComponentNode from './ComponentNode';
import {
  COMP_TYPES,
  PATH_CONVENTIONS,
  computeLayout,
  generatePath,
  generateAllPaths,
  generateShellCommands,
  getAllDescendantIds,
  isDescendant,
} from './pathGen';

const nodeTypes = { compNode: ComponentNode };

// ── ID factory ────────────────────────────────────────────────────────────────
// Start at 100 to avoid collisions with INITIAL_NODES (cn0–cn7)
let _nid = 100;
const nextNodeId = () => `cn${_nid++}`;

// ── Starter tree ──────────────────────────────────────────────────────────────
const INITIAL_NODES = [
  { id: 'cn0', parentId: null, name: 'App',           type: 'page',      description: 'Root component', props: [], collapsed: false },
  { id: 'cn1', parentId: 'cn0', name: 'AppLayout',     type: 'layout',    description: 'Global shell',    props: [], collapsed: false },
  { id: 'cn2', parentId: 'cn1', name: 'Navbar',         type: 'component', description: '',               props: [], collapsed: false },
  { id: 'cn3', parentId: 'cn1', name: 'Sidebar',        type: 'component', description: '',               props: [], collapsed: false },
  { id: 'cn4', parentId: 'cn0', name: 'Dashboard',      type: 'feature',   description: 'Main dashboard', props: [], collapsed: false },
  { id: 'cn5', parentId: 'cn4', name: 'StatsPanel',     type: 'component', description: '',               props: [{ id: 'p1', name: 'data', type: 'StatsData[]', required: true }], collapsed: false },
  { id: 'cn6', parentId: 'cn4', name: 'DataGrid',       type: 'component', description: '',               props: [{ id: 'p2', name: 'rows', type: 'Row[]', required: true }, { id: 'p3', name: 'onSelect', type: '(id: string) => void', required: false }], collapsed: false },
  { id: 'cn7', parentId: 'cn0', name: 'AuthContext',    type: 'context',   description: 'Auth provider',  props: [], collapsed: false },
];

// ── One tree list row (draggable + droppable) ─────────────────────────────────
function NodeRow({ node, depth, isSelected, hasChildren, onSelect, onUpdate, onDelete, onAddChild, onToggleCollapse }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(node.name);

  const { attributes, listeners, setActivatorNodeRef, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `drag:${node.id}`,
    data: { nodeId: node.id },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${node.id}`,
    data: { nodeId: node.id },
  });

  const mergeRef = useCallback((el) => { setDragRef(el); setDropRef(el); }, [setDragRef, setDropRef]);
  const cfg = COMP_TYPES[node.type ?? 'component'];

  function saveName() {
    if (draft.trim()) onUpdate(node.id, { name: draft.trim() });
    setEditing(false);
  }

  return (
    <div
      ref={mergeRef}
      onClick={() => !editing && onSelect(node.id)}
      className={`
        group flex items-center gap-1 py-1 pr-1.5 rounded-lg transition-all cursor-pointer select-none
        ${isSelected ? 'bg-indigo-900/50 ring-1 ring-indigo-700/60' : 'hover:bg-gray-800/50'}
        ${isOver && !isDragging ? 'ring-2 ring-indigo-400 bg-indigo-900/30' : ''}
        ${isDragging ? 'opacity-25' : ''}
      `}
      style={{ paddingLeft: depth * 16 + 6 }}
    >
      {/* Expand / collapse toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCollapse(node.id); }}
        className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-300 shrink-0 transition-transform text-xs"
        style={{ transform: node.collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}
      >
        {hasChildren ? '▾' : <span className="opacity-0">▾</span>}
      </button>

      {/* Type dot */}
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />

      {/* Name (double-click to edit inline) */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditing(false); setDraft(node.name); } }}
          className="flex-1 min-w-0 bg-transparent text-gray-100 text-sm font-mono focus:outline-none border-b border-indigo-400"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 min-w-0 text-gray-100 text-sm font-mono truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(node.name); }}
          title={`Double-click to rename`}
        >
          {node.name}
        </span>
      )}

      {/* Drag handle */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-0.5 text-sm"
        title="Drag to reparent"
      >
        ⠿
      </div>

      {/* Add child */}
      <button
        onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
        className="text-gray-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 text-sm leading-none"
        title="Add child component"
      >
        +
      </button>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 text-sm leading-none"
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}

// ── Detail / inspect panel ────────────────────────────────────────────────────
function DetailPanel({ node, flatNodes, convention, onUpdate }) {
  const [copied, setCopied] = useState('');
  const [showCommands, setShowCommands] = useState(false);

  const path     = generatePath(node, flatNodes, convention);
  const allPaths = generateAllPaths(flatNodes, convention);
  const cmds     = generateShellCommands(flatNodes, convention);

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  let _pid = 1;
  function addProp() {
    const props = [...(node.props ?? []), { id: `prop${_pid++}${Date.now()}`, name: 'newProp', type: 'string', required: false }];
    onUpdate(node.id, { props });
  }
  function updateProp(propId, patch) {
    const props = (node.props ?? []).map((p) => (p.id === propId ? { ...p, ...patch } : p));
    onUpdate(node.id, { props });
  }
  function deleteProp(propId) {
    const props = (node.props ?? []).filter((p) => p.id !== propId);
    onUpdate(node.id, { props });
  }

  return (
    <div className="border-t border-gray-700/60 bg-gray-900/40 overflow-y-auto" style={{ maxHeight: 340 }}>
      {/* Node editor */}
      <div className="p-3 space-y-2 border-b border-gray-700/40">
        <div className="flex gap-2">
          <input
            value={node.name}
            onChange={(e) => onUpdate(node.id, { name: e.target.value || node.name })}
            className="flex-1 min-w-0 bg-gray-800 text-gray-100 text-sm font-mono border border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={node.type}
            onChange={(e) => onUpdate(node.id, { type: e.target.value })}
            className="bg-gray-800 text-gray-300 text-xs border border-gray-700 rounded-lg px-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {Object.entries(COMP_TYPES).map(([k, v]) => (
              <option key={k} value={k} className="bg-gray-900">{v.label}</option>
            ))}
          </select>
        </div>
        <input
          value={node.description ?? ''}
          onChange={(e) => onUpdate(node.id, { description: e.target.value })}
          placeholder="Description (optional)…"
          className="w-full bg-gray-800 text-gray-400 text-xs border border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 italic"
        />
      </div>

      {/* File path */}
      <div className="p-3 border-b border-gray-700/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">File Path</span>
          <button onClick={() => copy(path, 'path')} className="text-xs text-gray-600 hover:text-indigo-400 transition-colors">
            {copied === 'path' ? '✓ copied' : 'copy'}
          </button>
        </div>
        <code className="block text-xs text-emerald-400 font-mono bg-gray-950/60 rounded-lg px-2.5 py-2 break-all leading-relaxed">
          {path}
        </code>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => copy(allPaths, 'all')}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded-lg border border-gray-700 transition-colors"
          >
            {copied === 'all' ? '✓ Copied' : 'All Paths'}
          </button>
          <button
            onClick={() => { setShowCommands((v) => !v); }}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${showCommands ? 'bg-indigo-900/30 border-indigo-700 text-indigo-300' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'}`}
          >
            Shell Commands
          </button>
        </div>
        {showCommands && (
          <div className="mt-2 relative">
            <pre className="text-xs text-gray-400 font-mono bg-gray-950/60 rounded-lg p-2.5 overflow-x-auto whitespace-pre leading-relaxed max-h-32">
              {cmds}
            </pre>
            <button
              onClick={() => copy(cmds, 'cmds')}
              className="absolute top-2 right-2 text-xs text-gray-600 hover:text-indigo-400 bg-gray-900 px-1.5 py-0.5 rounded"
            >
              {copied === 'cmds' ? '✓' : 'copy'}
            </button>
          </div>
        )}
      </div>

      {/* Props table */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Props</span>
          <button onClick={addProp} className="text-xs text-gray-600 hover:text-indigo-400 transition-colors">+ Add</button>
        </div>
        {(!node.props || node.props.length === 0) ? (
          <p className="text-xs text-gray-700 italic">No props defined.</p>
        ) : (
          <div className="space-y-1">
            {node.props.map((prop) => (
              <div key={prop.id} className="flex items-center gap-1.5 group/prop">
                <input
                  value={prop.name}
                  onChange={(e) => updateProp(prop.id, { name: e.target.value })}
                  className="w-24 bg-gray-800 text-gray-200 text-xs font-mono border border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                  placeholder="propName"
                />
                <input
                  value={prop.type}
                  onChange={(e) => updateProp(prop.id, { type: e.target.value })}
                  className="flex-1 min-w-0 bg-gray-800 text-gray-400 text-xs font-mono border border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                  placeholder="type"
                />
                <button
                  onClick={() => updateProp(prop.id, { required: !prop.required })}
                  className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 transition-colors ${prop.required ? 'text-indigo-400 bg-indigo-900/30' : 'text-gray-600 bg-gray-800 hover:text-gray-400'}`}
                >
                  {prop.required ? 'req' : 'opt'}
                </button>
                <button
                  onClick={() => deleteProp(prop.id)}
                  className="text-gray-700 hover:text-red-400 opacity-0 group-hover/prop:opacity-100 transition-all text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inner canvas (inside ReactFlowProvider) ───────────────────────────────────
function TreeCanvas({ rfNodes, rfEdges, selectedId, onSelectNode, isScreenshotMode }) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const firstRender = useRef(true);

  // Mark selected node
  const markedNodes = useMemo(
    () => rfNodes.map((n) => ({ ...n, selected: n.id === selectedId })),
    [rfNodes, selectedId]
  );

  useEffect(() => {
    setFlowNodes(markedNodes);
    setFlowEdges(rfEdges);
    const delay = firstRender.current ? 100 : 50;
    firstRender.current = false;
    const t = setTimeout(() => fitView({ padding: 0.25, duration: 350 }), delay);
    return () => clearTimeout(t);
  }, [markedNodes, rfEdges]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      deleteKeyCode={null}
      minZoom={0.08}
      maxZoom={2}
      className={isScreenshotMode ? 'bg-gray-950' : 'bg-gray-950'}
    >
      <Background variant={BackgroundVariant.Lines} gap={24} size={1} color="#1e293b" />
      {!isScreenshotMode && (
        <>
          <Controls className="!bg-gray-800 !border-gray-700 [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
          <MiniMap
            nodeColor={(n) => COMP_TYPES[n.data?.node?.type ?? 'component']?.dot ?? '#64748b'}
            maskColor="rgba(0,0,0,0.55)"
            className="!bg-gray-900 !border !border-gray-700 !rounded-lg"
          />
        </>
      )}
    </ReactFlow>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TreeVisualizerApp() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState(null);
  const [convention, setConvention] = useState('feature');
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [activeDragNodeId, setActiveDragNodeId] = useState(null);

  // ── Project save / load ──────────────────────────────────────────────────
  const { registerTool, activeProject, projects } = useProject();
  const saveRef = useRef({});
  saveRef.current = { nodes, convention };

  useEffect(() => {
    const saved = activeProject ? projects[activeProject]?.tree : null;
    if (saved) loadState(saved);
    return registerTool('tree', () => saveRef.current, loadState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function loadState(saved) {
    const incoming = saved?.nodes ?? INITIAL_NODES;
    // Bump counter past any loaded IDs to prevent future collisions
    const maxNum = incoming.reduce((m, n) => {
      const num = parseInt(n.id.replace(/\D/g, ''), 10);
      return isNaN(num) ? m : Math.max(m, num);
    }, 99);
    _nid = maxNum + 1;
    setNodes(incoming);
    setConvention(saved?.convention ?? 'feature');
    setSelectedId(null);
  }
  // ────────────────────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // ── Tree operations ──────────────────────────────────────────────────────────
  const update = useCallback((id, patch) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n))), []);

  const addChild = useCallback((parentId) => {
    const id = nextNodeId();
    setNodes((prev) => [...prev, { id, parentId, name: 'NewComponent', type: 'component', description: '', props: [], collapsed: false }]);
    setSelectedId(id);
  }, []);

  const addRoot = useCallback(() => {
    const id = nextNodeId();
    setNodes((prev) => [...prev, { id, parentId: null, name: 'NewRoot', type: 'page', description: '', props: [], collapsed: false }]);
    setSelectedId(id);
  }, []);

  const deleteNode = useCallback((id) => {
    const descendants = getAllDescendantIds(id, nodes);
    setNodes((prev) => prev.filter((n) => n.id !== id && !descendants.has(n.id)));
    if (selectedId === id || descendants.has(selectedId)) setSelectedId(null);
  }, [nodes, selectedId]);

  const toggleCollapse = useCallback((id) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, collapsed: !n.collapsed } : n))), []);

  // ── Drag-to-reparent ─────────────────────────────────────────────────────────
  function handleDragStart({ active }) {
    setActiveDragNodeId(active.data.current?.nodeId ?? null);
  }

  function handleDragEnd({ active, over }) {
    setActiveDragNodeId(null);
    if (!over) return;
    const draggedId = active.data.current?.nodeId;
    const targetId  = over.data.current?.nodeId;
    if (!draggedId || !targetId || draggedId === targetId) return;
    if (isDescendant(targetId, draggedId, nodes)) return; // prevent cycle
    setNodes((prev) => prev.map((n) => (n.id === draggedId ? { ...n, parentId: targetId } : n)));
  }

  // ── Layout (React Flow) ──────────────────────────────────────────────────────
  const { rfNodes, rfEdges } = useMemo(() => computeLayout(nodes), [nodes]);

  // ── Build recursive tree for left panel ──────────────────────────────────────
  const childrenMap = useMemo(() => {
    const map = Object.fromEntries(nodes.map((n) => [n.id, []]));
    nodes.forEach((n) => { if (n.parentId && map[n.parentId]) map[n.parentId].push(n); });
    return map;
  }, [nodes]);

  function renderTree(nodeList, depth = 0) {
    return nodeList.map((n) => {
      const kids = childrenMap[n.id] ?? [];
      return (
        <div key={n.id}>
          <NodeRow
            node={n}
            depth={depth}
            isSelected={selectedId === n.id}
            hasChildren={kids.length > 0}
            onSelect={setSelectedId}
            onUpdate={update}
            onDelete={deleteNode}
            onAddChild={addChild}
            onToggleCollapse={toggleCollapse}
          />
          {!n.collapsed && kids.length > 0 && renderTree(kids, depth + 1)}
        </div>
      );
    });
  }

  const roots = useMemo(() => nodes.filter((n) => !n.parentId), [nodes]);
  const selectedNode = nodes.find((n) => n.id === selectedId);
  const activeDragNode = nodes.find((n) => n.id === activeDragNodeId);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden bg-gray-950">

        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        {!isScreenshotMode && (
          <div className="w-72 shrink-0 flex flex-col border-r border-gray-700/60 bg-gray-900 overflow-hidden">

            {/* Toolbar */}
            <div className="px-3 py-3 border-b border-gray-700/60 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-sm leading-tight">Component Tree</h2>
                  <p className="text-gray-500 text-xs">{nodes.length} components</p>
                </div>
                <button
                  onClick={addRoot}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Root
                </button>
              </div>

              {/* Path convention */}
              <select
                value={convention}
                onChange={(e) => setConvention(e.target.value)}
                className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {Object.entries(PATH_CONVENTIONS).map(([k, label]) => (
                  <option key={k} value={k} className="bg-gray-900">{label}</option>
                ))}
              </select>
            </div>

            {/* Node type legend */}
            <div className="px-3 py-2 border-b border-gray-700/60 shrink-0">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(COMP_TYPES).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.dot }} />
                    <span className="text-xs text-gray-500">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tree list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <p className="text-xs text-gray-600 px-2 mb-2 italic">Drag ⠿ to reparent · Double-click to rename</p>
              {renderTree(roots)}
            </div>

            {/* Detail panel */}
            {selectedNode ? (
              <DetailPanel
                node={selectedNode}
                flatNodes={nodes}
                convention={convention}
                onUpdate={update}
              />
            ) : (
              <div className="border-t border-gray-700/60 p-4 text-xs text-gray-600 italic shrink-0">
                Click a node to inspect it.
              </div>
            )}

            {/* Footer */}
            <div className="px-3 py-3 border-t border-gray-700/60 shrink-0 space-y-2">
              <button
                onClick={() => {
                  if (window.confirm('Clear all components?')) { setNodes([]); setSelectedId(null); }
                }}
                className="w-full bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 text-xs font-medium py-1.5 rounded-lg transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsScreenshotMode(true)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Hide UI
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ RIGHT CANVAS ═══════════════ */}
        <div className="flex-1 relative">
          {isScreenshotMode && (
            <button
              onClick={() => setIsScreenshotMode(false)}
              className="absolute top-4 right-4 z-50 bg-gray-800/90 text-gray-200 border border-gray-600 text-sm px-4 py-2 rounded-lg shadow-xl hover:bg-gray-700 transition-colors backdrop-blur-sm"
            >
              Show UI
            </button>
          )}
          <ReactFlowProvider>
            <TreeCanvas
              rfNodes={rfNodes}
              rfEdges={rfEdges}
              selectedId={selectedId}
              onSelectNode={setSelectedId}
              isScreenshotMode={isScreenshotMode}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragNode && (
          <div
            className="bg-gray-800 border-2 border-indigo-400 rounded-lg px-3 py-2 shadow-2xl opacity-90 pointer-events-none"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: COMP_TYPES[activeDragNode.type ?? 'component'].dot }} />
              <span className="text-sm text-white font-semibold">{activeDragNode.name}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
