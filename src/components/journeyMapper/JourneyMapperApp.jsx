import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import JourneyNode, { NODE_CONFIG } from './JourneyNode';
import { JourneyEdge, EDGE_CONFIG } from './JourneyEdge';
import MapperSidebar from './MapperSidebar';
import { useProject } from '../project/ProjectContext';
import FileExplorerSidebar from '../project/FileExplorerSidebar';

const nodeTypes = { journeyNode: JourneyNode };
const edgeTypes = { journeyEdge: JourneyEdge };

let nodeCounter = 0;

// ── Inner canvas ──────────────────────────────────────────────────────────────

function Flow({ isScreenshotMode, onToggleScreenshot, loadSignal, onStateChange }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(loadSignal?.data?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadSignal?.data?.edges ?? []);

  const [selectedNodeType, setSelectedNodeType] = useState('screen');
  const [snapToGrid,       setSnapToGrid]        = useState(false);

  const { fitView } = useReactFlow();

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'journeyEdge',
            data: { label: '', edgeType: 'default' },
            markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_CONFIG.default.stroke },
          },
          eds
        )
      ),
    [setEdges]
  );

  const addNode = useCallback(() => {
    nodeCounter += 1;
    const cfg = NODE_CONFIG[selectedNodeType];
    const col = (nodeCounter - 1) % 4;
    const row = Math.floor((nodeCounter - 1) / 4);
    setNodes((nds) => [
      ...nds,
      {
        id: `j_${nodeCounter}`,
        type: 'journeyNode',
        position: { x: 80 + col * 300, y: 80 + row * 200 },
        data: { name: `${cfg.label} ${nodeCounter}`, description: '', nodeType: selectedNodeType, status: 'none' },
      },
    ]);
  }, [selectedNodeType, setNodes]);

  const clearCanvas = useCallback(() => {
    if (window.confirm('Clear the entire canvas? This cannot be undone.')) {
      setNodes([]); setEdges([]); nodeCounter = 0;
    }
  }, [setNodes, setEdges]);

  // Report state upward for saving
  useEffect(() => {
    onStateChange?.(nodes, edges);
  }, [nodes, edges, onStateChange]);

  return (
    <div className={`flex h-full overflow-hidden ${isScreenshotMode ? 'bg-white' : 'bg-gray-950'}`}>
      {!isScreenshotMode && <FileExplorerSidebar toolId="journey" />}
      {!isScreenshotMode && (
        <MapperSidebar
          selectedNodeType={selectedNodeType}
          onNodeTypeChange={setSelectedNodeType}
          onAddNode={addNode}
          onFitView={() => fitView({ padding: 0.2, duration: 400 })}
          onHideUI={onToggleScreenshot}
          snapToGrid={snapToGrid}
          onSnapToggle={() => setSnapToGrid((v) => !v)}
          onClear={clearCanvas}
          nodeCount={nodes.length}
          edgeCount={edges.length}
        />
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
          edgeTypes={edgeTypes}
          connectionMode="loose"
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          minZoom={0.1}
          maxZoom={2.5}
          className={isScreenshotMode ? 'bg-white' : 'bg-gray-950'}
        >
          {isScreenshotMode
            ? <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#f0f0f0" />
            : <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#1e293b" />
          }
          {!isScreenshotMode && (
            <>
              <Controls className="!bg-gray-800 !border-gray-700 [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
              <MiniMap
                nodeColor={(n) => NODE_CONFIG[n.data?.nodeType ?? 'screen']?.dot ?? '#64748b'}
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

export default function JourneyMapperApp() {
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [flowKey,    setFlowKey]    = useState(0);
  const [loadSignal, setLoadSignal] = useState(null);

  const saveRef = useRef({ nodes: [], edges: [] });
  const onStateChange = useCallback((n, e) => { saveRef.current = { nodes: n, edges: e }; }, []);

  const { registerTool, getInitialToolState } = useProject();

  useEffect(() => {
    const saved = getInitialToolState('journey');
    if (saved) triggerLoad(saved);
    return registerTool('journey', () => saveRef.current, triggerLoad);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerLoad(data) {
    (data?.nodes ?? []).forEach((n) => {
      const num = parseInt(n.id.replace('j_', ''), 10);
      if (!isNaN(num) && num >= nodeCounter) nodeCounter = num + 1;
    });
    setLoadSignal(data ?? { nodes: [], edges: [] });
    setFlowKey((k) => k + 1);
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
