import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

// ── Config ─────────────────────────────────────────────────────────────────────

export const NODE_CONFIG = {
  screen:   { label: 'Screen',    desc: 'Frontend UI / Page',       header: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  backend:  { label: 'Backend',   desc: 'API / Server Logic',       header: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  auth:     { label: 'Auth Gate', desc: 'Authentication Screen',    header: '#b91c1c', bg: '#fff1f2', border: '#fecdd3', dot: '#ef4444' },
  decision: { label: 'Decision',  desc: 'Conditional Branch',       header: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  service:  { label: 'Service',   desc: 'External Integration',     header: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff', dot: '#a855f7' },
  terminal: { label: 'Terminal',  desc: 'Start / End Point',        header: '#334155', bg: '#f8fafc', border: '#cbd5e1', dot: '#64748b' },
};

export const STATUS_CONFIG = {
  none:    { label: '—',            bg: 'transparent', text: '#94a3b8' },
  planned: { label: 'Planned',      bg: '#f1f5f9',     text: '#475569' },
  wip:     { label: 'In Progress',  bg: '#dbeafe',     text: '#1d4ed8' },
  done:    { label: 'Done',         bg: '#dcfce7',     text: '#15803d' },
  blocked: { label: 'Blocked',      bg: '#fee2e2',     text: '#b91c1c' },
};

// ── Component ──────────────────────────────────────────────────────────────────

function JourneyNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const patch = useCallback(
    (updater) =>
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: updater(n.data) } : n))
      ),
    [id, setNodes]
  );

  const cfg  = NODE_CONFIG[data.nodeType ?? 'screen'];
  const sCfg = STATUS_CONFIG[data.status  ?? 'none'];

  const hStyle = {
    width: 10,
    height: 10,
    background: cfg.dot,
    border: '2px solid white',
    zIndex: 10,
  };

  return (
    <div
      style={{
        background: cfg.bg,
        border: `2px solid ${selected ? '#6366f1' : cfg.border}`,
        boxShadow: selected
          ? '0 0 0 3px rgba(99,102,241,0.25), 0 8px 24px rgba(0,0,0,0.12)'
          : '0 4px 14px rgba(0,0,0,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
        minWidth: 240,
        maxWidth: 320,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* ── Handles on all four sides (loose-mode: any → any) ─── */}
      <Handle type="source" position={Position.Top}    id="top"    style={hStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={hStyle} />
      <Handle type="source" position={Position.Left}   id="left"   style={hStyle} />
      <Handle type="source" position={Position.Right}  id="right"  style={hStyle} />

      {/* ── Colored header ─────────────────────────────────────── */}
      <div
        style={{ background: cfg.header, padding: '7px 10px' }}
        className="flex items-center justify-between gap-2"
      >
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {cfg.label}
        </span>
        {data.status && data.status !== 'none' && (
          <span
            style={{
              background: sCfg.bg,
              color: sCfg.text,
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {sCfg.label}
          </span>
        )}
      </div>

      {/* ── Name + description inputs ──────────────────────────── */}
      <div style={{ padding: '10px 12px 6px' }}>
        <input
          value={data.name ?? ''}
          onChange={(e) => patch((d) => ({ ...d, name: e.target.value }))}
          placeholder="Screen / State name…"
          className="nodrag w-full bg-transparent focus:outline-none"
          style={{ fontSize: 14, fontWeight: 600, color: '#111827', border: 'none', marginBottom: 4, display: 'block' }}
        />
        <input
          value={data.description ?? ''}
          onChange={(e) => patch((d) => ({ ...d, description: e.target.value }))}
          placeholder="Add a note…"
          className="nodrag w-full bg-transparent focus:outline-none"
          style={{ fontSize: 11, color: '#6b7280', border: 'none', display: 'block' }}
        />
      </div>

      {/* ── Footer controls ────────────────────────────────────── */}
      <div
        style={{
          padding: '6px 10px 8px',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          borderTop: `1px solid ${cfg.border}`,
        }}
      >
        {/* Type selector (satisfies "color coding dropdown") */}
        <select
          value={data.nodeType ?? 'screen'}
          onChange={(e) => patch((d) => ({ ...d, nodeType: e.target.value }))}
          className="nodrag flex-1 focus:outline-none cursor-pointer rounded"
          style={{ fontSize: 11, background: 'rgba(0,0,0,0.04)', border: 'none', color: '#374151', padding: '2px 4px' }}
        >
          {Object.entries(NODE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Status selector */}
        <select
          value={data.status ?? 'none'}
          onChange={(e) => patch((d) => ({ ...d, status: e.target.value }))}
          className="nodrag focus:outline-none cursor-pointer rounded"
          style={{ fontSize: 11, background: 'rgba(0,0,0,0.04)', border: 'none', color: '#374151', padding: '2px 4px' }}
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default memo(JourneyNode);
