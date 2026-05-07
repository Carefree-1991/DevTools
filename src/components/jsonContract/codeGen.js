// ── ID factory ────────────────────────────────────────────────────────────────
let _n = 1;
export const nextId = () => `f${_n++}`;

export function newField(partial = {}) {
  return {
    id: nextId(),
    key: '',
    type: 'string',
    value: '',
    required: true,
    nullable: false,
    description: '',
    children: [],
    ...partial,
  };
}

// ── Immutable tree helpers ────────────────────────────────────────────────────

export function updateInTree(fields, id, patch) {
  return fields.map((f) =>
    f.id === id
      ? { ...f, ...patch }
      : { ...f, children: updateInTree(f.children ?? [], id, patch) }
  );
}

export function deleteFromTree(fields, id) {
  return fields
    .filter((f) => f.id !== id)
    .map((f) => ({ ...f, children: deleteFromTree(f.children ?? [], id) }));
}

export function addChildInTree(fields, parentId, child) {
  return fields.map((f) =>
    f.id === parentId
      ? { ...f, children: [...(f.children ?? []), child] }
      : { ...f, children: addChildInTree(f.children ?? [], parentId, child) }
  );
}

export function reorderInTree(fields, parentId, oldIdx, newIdx) {
  if (parentId === null) {
    const next = [...fields];
    const [item] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, item);
    return next;
  }
  return fields.map((f) => {
    if (f.id === parentId) {
      const next = [...(f.children ?? [])];
      const [item] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, item);
      return { ...f, children: next };
    }
    return { ...f, children: reorderInTree(f.children ?? [], parentId, oldIdx, newIdx) };
  });
}

// ── JSON example payload ──────────────────────────────────────────────────────

export function fieldsToJSON(fields) {
  const obj = {};
  for (const f of fields) {
    const k = f.key.trim();
    if (!k) continue;

    if (f.nullable && f.value === 'null') { obj[k] = null; continue; }

    switch (f.type) {
      case 'string':  obj[k] = f.value ?? ''; break;
      case 'number':  obj[k] = f.value !== '' ? Number(f.value) : 0; break;
      case 'boolean': obj[k] = f.value === 'true'; break;
      case 'null':    obj[k] = null; break;
      case 'array':   obj[k] = (f.children?.length) ? [fieldsToJSON(f.children)] : []; break;
      case 'object':  obj[k] = fieldsToJSON(f.children ?? []); break;
    }
  }
  return obj;
}

// ── TypeScript interface ──────────────────────────────────────────────────────

export function fieldsToTypeScript(fields, name = 'Payload') {
  const lines = [`export interface ${name} {`];
  _renderTSFields(fields, lines, 1);
  lines.push('}');
  return lines.join('\n');
}

function _renderTSFields(fields, lines, depth) {
  const pad = '  '.repeat(depth);
  for (const f of fields) {
    const k = f.key.trim();
    if (!k) continue;

    const opt = f.required ? '' : '?';
    const nul = f.nullable ? ' | null' : '';

    if (f.description) lines.push(`${pad}/** ${f.description} */`);

    if (f.type === 'object') {
      if (!f.children?.length) {
        lines.push(`${pad}${k}${opt}: Record<string, unknown>${nul};`);
      } else {
        lines.push(`${pad}${k}${opt}: {`);
        _renderTSFields(f.children, lines, depth + 1);
        lines.push(`${pad}}${nul};`);
      }
    } else if (f.type === 'array') {
      if (!f.children?.length) {
        lines.push(`${pad}${k}${opt}: unknown[]${nul};`);
      } else {
        lines.push(`${pad}${k}${opt}: Array<{`);
        _renderTSFields(f.children, lines, depth + 1);
        lines.push(`${pad}}>${nul};`);
      }
    } else {
      const base = { string: 'string', number: 'number', boolean: 'boolean', null: 'null' };
      lines.push(`${pad}${k}${opt}: ${base[f.type] ?? 'unknown'}${nul};`);
    }
  }
}

// ── OpenAPI / JSON Schema ─────────────────────────────────────────────────────

export function fieldsToOpenAPI(fields) {
  return _buildOASchema(fields);
}

function _buildOASchema(fields) {
  const schema = { type: 'object', properties: {} };
  const req = fields.filter((f) => f.required && f.key.trim()).map((f) => f.key.trim());
  if (req.length) schema.required = req;

  for (const f of fields) {
    const k = f.key.trim();
    if (!k) continue;

    const prop = {};
    if (f.description) prop.description = f.description;
    if (f.nullable)    prop.nullable = true;

    switch (f.type) {
      case 'string':
        prop.type = 'string';
        if (f.value) prop.example = f.value;
        break;
      case 'number':
        prop.type = 'number';
        if (f.value !== '') prop.example = Number(f.value);
        break;
      case 'boolean':
        prop.type = 'boolean';
        if (f.value !== '') prop.example = f.value === 'true';
        break;
      case 'null':
        prop.type = 'null';
        break;
      case 'array':
        prop.type  = 'array';
        prop.items = f.children?.length ? _buildOASchema(f.children) : { type: 'object' };
        break;
      case 'object':
        Object.assign(prop, _buildOASchema(f.children ?? []));
        break;
    }

    schema.properties[k] = prop;
  }
  return schema;
}

// ── JSON → field tree (import) ────────────────────────────────────────────────

export function jsonToFields(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];

  return Object.entries(obj).map(([key, value]) => {
    const id   = nextId();
    const base = { id, key, required: true, nullable: false, description: '' };

    if (value === null) {
      return { ...base, type: 'null', value: '', children: [], nullable: true };
    }
    if (Array.isArray(value)) {
      const first    = value[0];
      const children = first && typeof first === 'object' && !Array.isArray(first) ? jsonToFields(first) : [];
      return { ...base, type: 'array', value: '', children };
    }
    if (typeof value === 'object') {
      return { ...base, type: 'object', value: '', children: jsonToFields(value) };
    }

    const type =
      typeof value === 'number'  ? 'number' :
      typeof value === 'boolean' ? 'boolean' : 'string';

    return { ...base, type, value: String(value), children: [] };
  });
}

// ── Preset templates ──────────────────────────────────────────────────────────

function preset(fields) {
  // Re-stamp IDs so presets can be loaded multiple times safely
  function stamp(fs) {
    return fs.map((f) => ({ ...f, id: nextId(), children: stamp(f.children ?? []) }));
  }
  return stamp(fields);
}

export const PRESETS = {
  blank: { label: 'Blank', method: 'POST', path: '/api/v1/', schemaName: 'RequestPayload', fields: [] },

  restResponse: {
    label: 'REST Response Envelope',
    method: 'GET', path: '/api/v1/resource', schemaName: 'ApiResponse',
    fields: preset([
      { id: '', key: 'success',   type: 'boolean', value: 'true',  required: true,  nullable: false, description: 'Whether the request succeeded', children: [] },
      { id: '', key: 'message',   type: 'string',  value: 'OK',    required: true,  nullable: false, description: 'Human-readable status message',  children: [] },
      { id: '', key: 'data',      type: 'object',  value: '',      required: true,  nullable: true,  description: 'Response payload',              children: [] },
      { id: '', key: 'timestamp', type: 'string',  value: '2024-01-15T12:00:00Z', required: true, nullable: false, description: 'ISO 8601 timestamp', children: [] },
    ]),
  },

  errorResponse: {
    label: 'Error Response',
    method: 'POST', path: '/api/v1/resource', schemaName: 'ApiError',
    fields: preset([
      { id: '', key: 'error',   type: 'string', value: 'VALIDATION_ERROR', required: true,  nullable: false, description: 'Machine-readable error code', children: [] },
      { id: '', key: 'message', type: 'string', value: 'Invalid input',    required: true,  nullable: false, description: 'Human-readable message',      children: [] },
      { id: '', key: 'status',  type: 'number', value: '422',              required: true,  nullable: false, description: 'HTTP status code',            children: [] },
      { id: '', key: 'details', type: 'array',  value: '',                 required: false, nullable: true,  description: 'Per-field validation errors', children: [
        { id: '', key: 'field',   type: 'string', value: 'email',          required: true, nullable: false, description: '', children: [] },
        { id: '', key: 'message', type: 'string', value: 'Invalid format', required: true, nullable: false, description: '', children: [] },
      ]},
    ]),
  },

  pagination: {
    label: 'Paginated List',
    method: 'GET', path: '/api/v1/items', schemaName: 'PaginatedResponse',
    fields: preset([
      { id: '', key: 'items',       type: 'array',   value: '', required: true,  nullable: false, description: 'Page of results', children: [] },
      { id: '', key: 'total',       type: 'number',  value: '142', required: true, nullable: false, description: 'Total item count across all pages', children: [] },
      { id: '', key: 'page',        type: 'number',  value: '1',   required: true, nullable: false, description: 'Current page number (1-indexed)',   children: [] },
      { id: '', key: 'per_page',    type: 'number',  value: '25',  required: true, nullable: false, description: 'Items per page',                   children: [] },
      { id: '', key: 'total_pages', type: 'number',  value: '6',   required: true, nullable: false, description: 'Total number of pages',             children: [] },
      { id: '', key: 'has_next',    type: 'boolean', value: 'true', required: true, nullable: false, description: 'Whether another page exists',      children: [] },
    ]),
  },

  userObject: {
    label: 'User Object',
    method: 'GET', path: '/api/v1/users/:id', schemaName: 'User',
    fields: preset([
      { id: '', key: 'id',         type: 'string',  value: 'usr_01HXK',       required: true,  nullable: false, description: 'Unique user identifier (prefixed ID)', children: [] },
      { id: '', key: 'email',      type: 'string',  value: 'user@example.com', required: true,  nullable: false, description: 'Primary email address', children: [] },
      { id: '', key: 'name',       type: 'string',  value: 'Jane Smith',       required: true,  nullable: false, description: 'Display name',          children: [] },
      { id: '', key: 'role',       type: 'string',  value: 'admin',            required: true,  nullable: false, description: 'RBAC role: admin | member | viewer', children: [] },
      { id: '', key: 'avatar_url', type: 'string',  value: 'https://…',        required: false, nullable: true,  description: 'Profile picture URL',   children: [] },
      { id: '', key: 'created_at', type: 'string',  value: '2024-01-15T12:00:00Z', required: true, nullable: false, description: 'ISO 8601 creation timestamp', children: [] },
      { id: '', key: 'metadata',   type: 'object',  value: '',                 required: false, nullable: true,  description: 'Arbitrary key/value pairs', children: [] },
    ]),
  },
};

// ── Syntax highlighting ───────────────────────────────────────────────────────

export function highlightJSON(raw) {
  const safe = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return safe.replace(
    /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([\{\}\[\],])/g,
    (_, key, str, bool, nil, num, punc) => {
      if (key)  return `<span style="color:#a5b4fc">${key}</span>`;
      if (str)  return `<span style="color:#6ee7b7">${str}</span>`;
      if (bool) return `<span style="color:#fde68a">${bool}</span>`;
      if (nil)  return `<span style="color:#fca5a5">${nil}</span>`;
      if (num)  return `<span style="color:#7dd3fc">${num}</span>`;
      if (punc) return `<span style="color:#6b7280">${punc}</span>`;
      return _;
    }
  );
}

export function highlightTS(raw) {
  const safe = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return safe
    .replace(/(\/\*\*[\s\S]*?\*\/)/gm, '<span style="color:#4b5563">$1</span>')
    .replace(/\b(export|interface|type|extends|readonly|implements)\b/g,
      '<span style="color:#c084fc">$1</span>')
    .replace(/\b(string|number|boolean|null|unknown|void|any|Array|Record)\b/g,
      '<span style="color:#7dd3fc">$1</span>')
    .replace(/^(\s*)([\w]+)(\??:)/gm,
      (_, ws, key, colon) => `${ws}<span style="color:#a5b4fc">${key}</span>${colon}`);
}
