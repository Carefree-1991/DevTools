import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TableNode from './TableNode';
import Sidebar from './Sidebar';
import { useProject } from './project/ProjectContext';
import FileExplorerSidebar from './project/FileExplorerSidebar';

const nodeTypes = { tableNode: TableNode };

let nodeCounter = 0;

// ── Inner canvas (must live inside ReactFlowProvider) ─────────────────────────

function Flow({ isScreenshotMode, onToggleScreenshot, loadSignal, onStateChange }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(loadSignal?.data?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadSignal?.data?.edges ?? []);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            style: { stroke: '#818cf8', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' },
          },
          eds
        )
      ),
    [setEdges]
  );

  const handleAddNode = useCallback(() => {
    nodeCounter += 1;
    const id = `table_${nodeCounter}`;
    const col = (nodeCounter - 1) % 4;
    const row = Math.floor((nodeCounter - 1) / 4);
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'tableNode',
        position: { x: 80 + col * 360, y: 80 + row * 280 },
        data: {
          tableName: `table_${nodeCounter}`,
          columns: [{ id: `${id}_col_0`, name: 'id', type: 'UUID' }],
        },
      },
    ]);
  }, [setNodes]);

  // Report current state upward for saving
  useEffect(() => {
    onStateChange?.(nodes, edges);
  }, [nodes, edges, onStateChange]);

  return (
    <div className={`flex h-full bg-gray-950 overflow-hidden ${isScreenshotMode ? 'screenshot-mode' : ''}`}>
      {!isScreenshotMode && <FileExplorerSidebar toolId="visualizer" />}
      {!isScreenshotMode && (
        <Sidebar onAddNode={handleAddNode} onHideUI={onToggleScreenshot} />
      )}
      <div className="flex-1 relative">
        {isScreenshotMode && (
          <button
            onClick={onToggleScreenshot}
            className="absolute top-4 right-4 z-50 bg-gray-800/90 text-gray-200 border border-gray-600 text-sm px-4 py-2 rounded-lg shadow-xl hover:bg-gray-700 transition-colors backdrop-blur-sm"
          >
            Show UI
          </button>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          minZoom={0.2}
          maxZoom={2}
          className="bg-gray-950"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1f2937" />
          {!isScreenshotMode && (
            <>
              <Controls className="!bg-gray-800 !border-gray-700 [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
              <MiniMap
                nodeColor="#4f46e5"
                maskColor="rgba(0,0,0,0.55)"
                className="!bg-gray-900 !border !border-gray-700 !rounded-lg"
              />
            </>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

// ── Outer wrapper ─────────────────────────────────────────────────────────────

export default function DataVisualizerApp() {
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  // Changing flowKey forces Flow to remount, picking up new initialNodes/Edges
  const [flowKey,    setFlowKey]    = useState(0);
  const [loadSignal, setLoadSignal] = useState(null);

  const saveRef = useRef({ nodes: [], edges: [] });
  const onStateChange = useCallback((n, e) => { saveRef.current = { nodes: n, edges: e }; }, []);

  const { registerTool, getInitialToolState } = useProject();

  useEffect(() => {
    const saved = getInitialToolState('visualizer');
    if (saved) triggerLoad(saved);
    return registerTool('visualizer', () => saveRef.current, triggerLoad);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerLoad(data) {
    // Bump counter past any loaded IDs
    (data?.nodes ?? []).forEach((n) => {
      const num = parseInt(n.id.replace('table_', ''), 10);
      if (!isNaN(num) && num >= nodeCounter) nodeCounter = num + 1;
    });
    setLoadSignal(data ?? { nodes: [], edges: [] });
    setFlowKey((k) => k + 1); // remount Flow with new initial data
  }

  return (
    <ReactFlowProvider>
      <Flow
        key={flowKey}
        isScreenshotMode={isScreenshotMode}
        onToggleScreenshot={() => setIsScreenshotMode((v) => !v)}
        loadSignal={loadSignal}
        onStateChange={onStateChange}
      />
    </ReactFlowProvider>
  );
}
