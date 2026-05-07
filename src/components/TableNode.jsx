import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

const DATA_TYPES = ['UUID', 'String', 'Int', 'Float', 'Boolean', 'JSON', 'DateTime', 'Array'];

const TYPE_BADGE = {
  UUID:     'text-yellow-400  bg-yellow-400/10',
  String:   'text-emerald-400 bg-emerald-400/10',
  Int:      'text-blue-400    bg-blue-400/10',
  Float:    'text-cyan-400    bg-cyan-400/10',
  Boolean:  'text-purple-400  bg-purple-400/10',
  JSON:     'text-orange-400  bg-orange-400/10',
  DateTime: 'text-pink-400    bg-pink-400/10',
  Array:    'text-red-400     bg-red-400/10',
};

// Fixed pixel heights — used to calculate per-row handle positions.
const HEADER_H = 48;
const ROW_H    = 40;

function TableNode({ id, data }) {
  const { setNodes } = useReactFlow();

  const patch = useCallback(
    (updater) =>
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: updater(n.data) } : n))
      ),
    [id, setNodes]
  );

  const setName = (v) => patch((d) => ({ ...d, tableName: v }));

  const addColumn = () =>
    patch((d) => ({
      ...d,
      columns: [
        ...d.columns,
        { id: `${id}_col_${Date.now()}`, name: 'column', type: 'String' },
      ],
    }));

  const updateCol = (colId, field, value) =>
    patch((d) => ({
      ...d,
      columns: d.columns.map((c) => (c.id === colId ? { ...c, [field]: value } : c)),
    }));

  const removeCol = (colId) =>
    patch((d) => ({ ...d, columns: d.columns.filter((c) => c.id !== colId) }));

  return (
    <div
      className="bg-gray-800 border border-gray-600/80 rounded-xl shadow-2xl overflow-visible"
      style={{ minWidth: 300, fontFamily: 'ui-monospace, Menlo, monospace' }}
    >
      {/* Single target handle — left-center of node */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-indigo-500 !border-2 !border-gray-900 hover:!bg-indigo-300 transition-colors"
      />

      {/* Per-row source handles — right side, vertically aligned to each row */}
      {data.columns.map((col, i) => (
        <Handle
          key={`src-${col.id}`}
          type="source"
          position={Position.Right}
          id={`src-${col.id}`}
          className="!bg-indigo-500 !border-2 !border-gray-900 hover:!bg-indigo-300 transition-colors"
          style={{
            top: HEADER_H + i * ROW_H + ROW_H / 2,
            transform: 'translateY(-50%)',
            right: -5,
          }}
        />
      ))}

      {/* ── Header ── */}
      <div
        className="flex items-center gap-2.5 px-3 bg-indigo-500/10 border-b border-gray-700/70 rounded-t-xl"
        style={{ height: HEADER_H }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
        <input
          value={data.tableName}
          onChange={(e) => setName(e.target.value)}
          placeholder="table_name"
          className="nodrag flex-1 bg-transparent text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 min-w-0"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      {/* ── Column rows ── */}
      {data.columns.map((col) => (
        <div
          key={col.id}
          className="flex items-center gap-2 px-3 border-b border-gray-700/40 hover:bg-gray-700/30 group transition-colors"
          style={{ height: ROW_H }}
        >
          <input
            value={col.name}
            onChange={(e) => updateCol(col.id, 'name', e.target.value)}
            placeholder="column_name"
            className="nodrag flex-1 bg-transparent text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 min-w-0"
            style={{ fontFamily: 'inherit' }}
          />
          <select
            value={col.type}
            onChange={(e) => updateCol(col.id, 'type', e.target.value)}
            className={`nodrag shrink-0 text-xs font-medium px-1.5 py-0.5 rounded border border-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer ${TYPE_BADGE[col.type] ?? 'text-gray-300 bg-gray-700'}`}
            style={{ fontFamily: 'inherit', background: 'transparent' }}
          >
            {DATA_TYPES.map((t) => (
              <option key={t} value={t} className="bg-gray-900 text-white">
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => removeCol(col.id)}
            className="nodrag opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-sm w-4 h-4 flex items-center justify-center shrink-0 leading-none"
            title="Remove column"
          >
            &times;
          </button>
        </div>
      ))}

      {/* ── Add column footer ── */}
      <div className="px-3 py-2">
        <button
          onClick={addColumn}
          className="nodrag w-full text-left text-xs text-gray-500 hover:text-indigo-400 hover:bg-gray-700/40 transition-colors rounded py-1 px-2"
        >
          + Add Column
        </button>
      </div>
    </div>
  );
}

export default memo(TableNode);
