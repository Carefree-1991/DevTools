import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { COMP_TYPES } from './pathGen';

function ComponentNode({ data, selected }) {
  const { node, hiddenCount, childCount } = data;
  const cfg = COMP_TYPES[node.type ?? 'component'];

  return (
    <div
      style={{
        background: cfg.header,
        border: `2px solid ${selected ? '#6366f1' : cfg.border}`,
        borderRadius: 10,
        minWidth: 188,
        maxWidth: 220,
        overflow: 'hidden',
        boxShadow: selected
          ? '0 0 0 3px rgba(99,102,241,0.3), 0 8px 24px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        fontFamily: 'ui-monospace, Menlo, monospace',
        transition: 'border-color 0.12s, box-shadow 0.12s',
      }}
    >
      {/* Invisible handles for edge routing — not shown to user */}
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />

      {/* Type header strip */}
      <div
        style={{
          background: `${cfg.border}22`,
          borderBottom: `1px solid ${cfg.border}44`,
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
          <span style={{ color: cfg.tag, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {cfg.label}
          </span>
        </div>
        {node.props?.length > 0 && (
          <span style={{ color: '#475569', fontSize: 9 }}>
            {node.props.length} prop{node.props.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
          {node.name}
        </div>
        {node.description && (
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
            {node.description}
          </div>
        )}

        {/* Props preview (up to 3) */}
        {node.props?.length > 0 && (
          <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {node.props.slice(0, 3).map((p) => (
              <span
                key={p.id}
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 9,
                  color: '#94a3b8',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {p.name}{p.required ? '' : '?'}: {p.type}
              </span>
            ))}
            {node.props.length > 3 && (
              <span style={{ fontSize: 9, color: '#475569' }}>+{node.props.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Collapsed badge */}
      {hiddenCount > 0 && (
        <div style={{
          borderTop: `1px solid ${cfg.border}44`,
          padding: '4px 10px',
          fontSize: 10,
          color: '#475569',
          textAlign: 'center',
        }}>
          {hiddenCount} child{hiddenCount !== 1 ? 'ren' : ''} hidden
        </div>
      )}
    </div>
  );
}

export default memo(ComponentNode);
