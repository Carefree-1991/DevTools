import { useState } from 'react';

const TYPE_DOT = {
  string:  '#10b981',
  number:  '#38bdf8',
  boolean: '#fbbf24',
  null:    '#f87171',
  array:   '#a78bfa',
  object:  '#818cf8',
};

const TYPES = ['string', 'number', 'boolean', 'null', 'array', 'object'];

export default function FieldRow({ field, depth = 0, onUpdate, onDelete, onAddChild }) {
  const [showDesc, setShowDesc] = useState(!!field.description);

  const isContainer = field.type === 'array' || field.type === 'object';
  const dot = TYPE_DOT[field.type] ?? TYPE_DOT.string;

  const update = (patch) => onUpdate(field.id, patch);

  function handleTypeChange(newType) {
    const wasContainer = field.type === 'array' || field.type === 'object';
    const isNewContainer = newType === 'array' || newType === 'object';
    update({
      type: newType,
      ...(wasContainer && !isNewContainer ? { children: [] } : {}),
      ...(isNewContainer                  ? { value: '' }    : {}),
    });
  }

  return (
    <div className={`group/row ${depth > 0 ? 'border-l border-gray-700/50 ml-5 pl-3' : ''}`}>
      {/* ── Main row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 py-1.5 pr-1 rounded-lg hover:bg-gray-800/40 transition-colors">
        {/* Type color dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: dot }}
          title={field.type}
        />

        {/* Key name */}
        <input
          value={field.key}
          onChange={(e) => update({ key: e.target.value })}
          placeholder="field_key"
          spellCheck={false}
          className="w-36 bg-transparent text-gray-100 text-sm font-mono focus:outline-none border-b border-transparent focus:border-gray-600 placeholder:text-gray-700 transition-colors"
        />

        {/* Type dropdown */}
        <select
          value={field.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="text-xs font-mono rounded px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:border-gray-500 cursor-pointer hover:border-gray-600 transition-colors"
        >
          {TYPES.map((t) => (
            <option key={t} value={t} className="bg-gray-900">{t}</option>
          ))}
        </select>

        {/* Example value (leaf types only) */}
        {!isContainer && field.type !== 'null' ? (
          <input
            value={field.value ?? ''}
            onChange={(e) => update({ value: e.target.value })}
            placeholder={
              field.type === 'boolean' ? 'true / false' :
              field.type === 'number'  ? '0'           : 'example…'
            }
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent text-gray-400 text-xs font-mono focus:outline-none border-b border-transparent focus:border-gray-600 placeholder:text-gray-700 transition-colors"
          />
        ) : (
          <div className="flex-1" />
        )}

        {/* Required toggle */}
        <button
          onClick={() => update({ required: !field.required })}
          title={field.required ? 'Required — click to make optional' : 'Optional — click to make required'}
          className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
            field.required
              ? 'bg-indigo-600/25 text-indigo-400 hover:bg-indigo-600/40'
              : 'bg-gray-800 text-gray-600 hover:text-gray-400'
          }`}
        >
          {field.required ? 'req' : 'opt'}
        </button>

        {/* Nullable toggle */}
        <button
          onClick={() => update({ nullable: !field.nullable })}
          title={field.nullable ? 'Nullable — click to disallow null' : 'Not nullable — click to allow null'}
          className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
            field.nullable
              ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
              : 'bg-gray-800 text-gray-700 hover:text-gray-500'
          }`}
        >
          null
        </button>

        {/* Description toggle */}
        <button
          onClick={() => setShowDesc((v) => !v)}
          title={showDesc ? 'Hide description' : 'Add description'}
          className={`text-xs leading-none px-1.5 py-1 rounded transition-all font-mono ${
            field.description || showDesc
              ? 'text-blue-400 bg-blue-400/10'
              : 'text-gray-700 hover:text-gray-500 opacity-0 group-hover/row:opacity-100'
          }`}
        >
          /∗
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(field.id)}
          title="Remove field"
          className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover/row:opacity-100 leading-none px-1 text-base"
        >
          ×
        </button>
      </div>

      {/* ── Description row (toggle) ───────────────────────────── */}
      {(showDesc || field.description) && (
        <div className="pl-5 pb-0.5">
          <input
            value={field.description ?? ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="// description shown in TypeScript & OpenAPI output…"
            autoFocus={showDesc && !field.description}
            className="w-full bg-transparent text-blue-400/60 text-xs font-mono italic focus:outline-none placeholder:text-gray-700"
          />
        </div>
      )}

      {/* ── Children (array / object) ─────────────────────────── */}
      {isContainer && (
        <div className="mt-0.5 mb-1">
          {(field.children ?? []).map((child) => (
            <FieldRow
              key={child.id}
              field={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
          <div className="ml-5 pl-3 border-l border-gray-700/50">
            <button
              onClick={() => onAddChild(field.id)}
              className="text-xs text-gray-600 hover:text-indigo-400 transition-colors flex items-center gap-1 py-1 font-mono"
            >
              <span>+</span>
              <span>Add child field</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
