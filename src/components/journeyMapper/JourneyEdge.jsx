import { useState, useCallback } from 'react';
import { EdgeLabelRenderer, getBezierPath, useReactFlow, MarkerType } from 'reactflow';

// ── Edge style catalogue ───────────────────────────────────────────────────────

export const EDGE_CONFIG = {
  default:     { label: 'Normal',      stroke: '#64748b', dash: undefined, width: 2    },
  conditional: { label: 'Conditional', stroke: '#d97706', dash: '8 4',    width: 2    },
  error:       { label: 'Error Path',  stroke: '#dc2626', dash: '5 3',    width: 2    },
  success:     { label: 'Success',     stroke: '#16a34a', dash: undefined, width: 2    },
  async:       { label: 'Async',       stroke: '#7c3aed', dash: '14 5',   width: 1.5  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function JourneyEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data, selected, markerEnd,
}) {
  const { setEdges } = useReactFlow();

  const [editing, setEditing]  = useState(false);
  const [draft,   setDraft]    = useState(data?.label ?? '');

  const eCfg = EDGE_CONFIG[data?.edgeType ?? 'default'];
  const [path, lx, ly] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  // Persist label change
  const saveLabel = useCallback(() => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, label: draft } } : e
      )
    );
    setEditing(false);
  }, [id, setEdges, draft]);

  // Change edge type AND update the marker colour to match
  const changeType = useCallback((type) => {
    const cfg = EDGE_CONFIG[type];
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id
          ? {
              ...e,
              data: { ...e.data, edgeType: type },
              markerEnd: { type: MarkerType.ArrowClosed, color: cfg.stroke },
            }
          : e
      )
    );
  }, [id, setEdges]);

  const label = data?.label;

  return (
    <>
      {/* ── Visible path ──────────────────────────────────────── */}
      <path
        id={id}
        d={path}
        fill="none"
        strokeWidth={selected ? eCfg.width + 0.8 : eCfg.width}
        stroke={eCfg.stroke}
        strokeDasharray={eCfg.dash}
        markerEnd={markerEnd}
        className="react-flow__edge-path"
        style={{ transition: 'stroke-width 0.1s' }}
      />

      {/* Wider invisible hit-area so thin dashed lines are easy to click */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ cursor: 'pointer' }}
      />

      {/* ── Editable label ────────────────────────────────────── */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${lx}px,${ly}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
          className="nodrag nopan"
        >
          {editing ? (
            /* Edit panel */
            <div
              className="flex items-center bg-white rounded-lg shadow-xl overflow-hidden"
              style={{ border: `1.5px solid ${eCfg.stroke}`, minWidth: 200 }}
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={saveLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  saveLabel();
                  if (e.key === 'Escape') setEditing(false);
                }}
                placeholder="User action…"
                className="flex-1 px-3 py-1.5 text-xs focus:outline-none"
                style={{ minWidth: 120 }}
              />
              <select
                value={data?.edgeType ?? 'default'}
                onChange={(e) => { changeType(e.target.value); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="focus:outline-none cursor-pointer bg-gray-50 border-l border-gray-200"
                style={{ fontSize: 10, padding: '6px 4px' }}
              >
                {Object.entries(EDGE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          ) : (
            /* Display label / add-action prompt */
            <button
              onClick={() => { setDraft(label ?? ''); setEditing(true); }}
              className="transition-all rounded-md"
              style={{
                fontSize: 11,
                fontWeight: label ? 500 : 400,
                color: label ? eCfg.stroke : '#9ca3af',
                background: label ? 'white' : 'transparent',
                border: label ? `1px solid ${eCfg.stroke}33` : '1px solid transparent',
                padding: label ? '2px 8px' : '2px 6px',
                boxShadow: label ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label || '+ action'}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
