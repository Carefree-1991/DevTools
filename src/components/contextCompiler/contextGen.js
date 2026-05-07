// ── Catalogue constants ───────────────────────────────────────────────────────

export const OBJECTIVES = [
  {
    id:       'frontend',
    label:    'Generate Frontend Instructions',
    icon:     '🖥',
    desc:     'React component implementation guide focused on UI tree, wireframes, and API consumption.',
    sections: ['tree', 'wireframer', 'journey', 'contract'],
  },
  {
    id:       'backend',
    label:    'Generate Backend Instructions',
    icon:     '⚙️',
    desc:     'Server implementation guide focused on database schema, API contracts, and data flow.',
    sections: ['visualizer', 'contract', 'journey'],
  },
  {
    id:       'fullfeature',
    label:    'Generate Full-Feature Markdown',
    icon:     '📄',
    desc:     'Complete specification doc for /docs/features/. Combines all tool outputs.',
    sections: ['tree', 'wireframer', 'journey', 'visualizer', 'contract'],
  },
  {
    id:       'cursor',
    label:    'Generate .cursorrules / AGENTS.md',
    icon:     '🤖',
    desc:     'Persistent AI coding rules file with project conventions and architecture constraints.',
    sections: ['tree', 'wireframer', 'contract', 'visualizer'],
  },
];

export const AI_TARGETS = [
  { id: 'claude',  label: 'Anthropic Claude',  hint: 'Uses XML-structured context tags'         },
  { id: 'gpt4',    label: 'OpenAI GPT-4',       hint: 'Standard system-prompt format'            },
  { id: 'cursor',  label: 'Cursor / Copilot',   hint: 'Inline code-focused rules format'         },
  { id: 'generic', label: 'Generic / Any LLM',  hint: 'Clean Markdown, works everywhere'         },
];

export const DEFAULT_CONFIG = {
  objective:          'frontend',
  targetAI:           'claude',
  projectDescription: '',
  techStack:          'React 19, TypeScript, Tailwind CSS, Vite',
  conventions:        '',
  includeChecklist:   true,
  includeFileMap:     true,
  sections: {
    tree:       true,
    wireframer: true,
    journey:    true,
    visualizer: true,
    contract:   true,
  },
};

// ── Token estimation ──────────────────────────────────────────────────────────

export function estimateTokens(text) {
  // ~3.8 chars/token is a practical average across English prose + markdown + code
  return Math.ceil(text.length / 3.8);
}

export function formatTokenCount(tokens) {
  if (tokens < 1000) return `~${tokens} tokens`;
  return `~${(tokens / 1000).toFixed(1)}k tokens`;
}

// ── Section: Component Tree ───────────────────────────────────────────────────

function buildTreeSection(state, { includeFileMap } = {}) {
  if (!state?.nodes?.length) return null;

  const { nodes, convention = 'feature' } = state;
  const childrenOf = Object.fromEntries(nodes.map((n) => [n.id, []]));
  nodes.forEach((n) => { if (n.parentId && childrenOf[n.parentId]) childrenOf[n.parentId].push(n); });
  const roots = nodes.filter((n) => !n.parentId);

  let tree = '';
  function renderBranch(node, prefix = '', isLast = true) {
    const connector = prefix ? (isLast ? '└── ' : '├── ') : '';
    const propsNote = node.props?.length
      ? ` — Props: ${node.props.map((p) => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(', ')}`
      : '';
    const desc = node.description ? ` — ${node.description}` : '';
    tree += `${prefix}${connector}${node.name} (${node.type})${desc}${propsNote}\n`;
    const kids     = childrenOf[node.id] ?? [];
    const childPfx = prefix + (prefix ? (isLast ? '    ' : '│   ') : '');
    kids.forEach((kid, i) => renderBranch(kid, childPfx, i === kids.length - 1));
  }
  roots.forEach((root, i) => renderBranch(root, '', i === roots.length - 1));

  let section = `## 🏗️ Component Architecture\n\n`;
  section    += `Path convention: \`${convention}\`\n\n`;
  section    += '```\n' + tree + '```\n\n';

  if (includeFileMap) {
    section += '**File paths to create:**\n\n';
    const ext = convention === 'nextjs' ? 'tsx' : 'tsx';

    function getPath(node, ancestors) {
      if (!ancestors.length) return `src/${node.name}.${ext}`;
      if (ancestors.length === 1) return `src/features/${node.name}/index.${ext}`;
      const feature = ancestors[1];
      switch (convention) {
        case 'flat':    return `src/components/${node.name}.${ext}`;
        case 'atomic': {
          const f = { page:'pages', layout:'templates', feature:'organisms', component:'atoms', context:'providers', shared:'molecules' };
          return `src/components/${f[node.type] ?? 'components'}/${node.name}.${ext}`;
        }
        default:
          return `src/features/${feature.name}/${node.name}.${ext}`;
      }
    }

    function listPaths(ns, ancestors = []) {
      for (const n of ns) {
        section += `- \`${getPath(n, ancestors)}\`\n`;
        const kids = childrenOf[n.id] ?? [];
        if (kids.length) listPaths(kids, [...ancestors, n]);
      }
    }
    listPaths(roots);
    section += '\n';
  }

  return section;
}

// ── Section: UI Wireframe ─────────────────────────────────────────────────────

const BLOCK_NAMES = {
  navbar:  'Navbar',
  sidebar: 'Side Navigation Panel',
  table:   'Data Table',
  form:    'Form / Input Fields',
  button:  'Button Group',
  image:   'Image / Media Placeholder',
  chart:   'Chart / Data Visualization',
};

function buildWireframeSection(state) {
  if (!state?.canvasItems?.length) return null;

  let section = '## 📐 Page Layout (Wireframe)\n\n';
  section    += 'Render components in this order, top to bottom:\n\n';
  state.canvasItems.forEach((item, i) => {
    section += `${i + 1}. **${BLOCK_NAMES[item.type] ?? item.type}** — \`${item.type}\`\n`;
  });
  return section + '\n';
}

// ── Section: Database Schema ──────────────────────────────────────────────────

function buildDatabaseSection(state) {
  if (!state?.nodes?.length) return null;

  const nodeMap = Object.fromEntries(state.nodes.map((n) => [n.id, n]));
  let section   = '## 🗄️ Database Schema\n\n';

  for (const node of state.nodes) {
    const { tableName = 'unknown', columns = [] } = node.data ?? {};
    section += `### Table: \`${tableName}\`\n\n`;
    if (columns.length) {
      section += '| Column | Type | Notes |\n|--------|------|-------|\n';
      columns.forEach((col) => {
        const note = col.name === 'id' ? 'Primary Key' : '';
        section += `| \`${col.name}\` | ${col.type} | ${note} |\n`;
      });
    }
    section += '\n';
  }

  if (state.edges?.length) {
    section += '**Foreign Key Relationships:**\n\n';
    for (const edge of state.edges) {
      const from = nodeMap[edge.source]?.data?.tableName ?? edge.source;
      const to   = nodeMap[edge.target]?.data?.tableName ?? edge.target;
      section   += `- \`${from}\` → \`${to}\` (foreign key)\n`;
    }
    section += '\n';
  }

  return section;
}

// ── Section: API Contract ─────────────────────────────────────────────────────

function buildContractSection(state, objective) {
  if (!state?.fields?.length) return null;

  const { method = 'POST', path = '/api/v1', schemaName = 'Payload', description = '', fields = [] } = state;

  let section = `## 🔌 API Contract\n\n`;
  section    += `**Endpoint:** \`${method} ${path}\``;
  if (schemaName) section += ` — \`${schemaName}\``;
  if (description) section += `\n> ${description}`;
  section += '\n\n';

  section += '**Request schema:**\n\n';
  section += '| Field | Type | Required | Nullable | Example |\n';
  section += '|-------|------|:--------:|:--------:|--------|\n';

  function renderFields(fs, prefix = '') {
    for (const f of fs ?? []) {
      const key = prefix ? `${prefix}.${f.key}` : f.key;
      const req = f.required ? '✓' : '—';
      const nul = f.nullable ? '✓' : '—';
      const val = f.value ? `\`${f.value}\`` : '—';
      section  += `| \`${key}\` | \`${f.type}\` | ${req} | ${nul} | ${val} |\n`;
      if (f.children?.length) renderFields(f.children, key);
    }
  }

  renderFields(fields);
  section += '\n';

  if (objective === 'backend') {
    section += '**Validation rules:**\n';
    for (const f of fields) {
      if (f.required) section += `- \`${f.key}\`: required`;
      if (f.type === 'string' && f.required) section += ', non-empty string';
      if (f.type === 'number') section += ', must be numeric';
      if (!f.nullable) section += ', cannot be null';
      if (f.required || !f.nullable) section += '\n';
    }
    section += '\n';
  }

  return section;
}

// ── Section: User Journey ─────────────────────────────────────────────────────

function buildJourneySection(state, objective) {
  if (!state?.nodes?.length) return null;

  const nodeMap = Object.fromEntries(state.nodes.map((n) => [n.id, n.data?.name ?? n.id]));
  let section   = '## 🛤️ User Journey Flow\n\n';

  // Build linear narrative
  const starts = state.nodes.filter((n) => n.data?.nodeType === 'terminal' && n.data?.name?.toLowerCase().includes('start'));
  const edges  = state.edges ?? [];

  if (starts.length && edges.length) {
    // Walk the graph from start
    const visited = new Set();
    const path    = [];

    function walk(nodeId) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      path.push(nodeMap[nodeId]);
      const next = edges.filter((e) => e.source === nodeId);
      for (const edge of next) {
        if (edge.data?.label) path.push(`→ [${edge.data.label}] →`);
        walk(edge.target);
      }
    }

    walk(starts[0].id);
    section += path.join(' ') + '\n\n';
  }

  // Screens table
  section += '**Screens:**\n\n';
  section += '| Screen | Type | Description |\n|--------|------|-------------|\n';
  for (const node of state.nodes) {
    const { name = '', nodeType = '', description = '' } = node.data ?? {};
    section += `| ${name} | \`${nodeType}\` | ${description || '—'} |\n`;
  }
  section += '\n';

  if (edges.length) {
    section += '**Transitions:**\n\n';
    for (const edge of edges) {
      const from  = nodeMap[edge.source] ?? edge.source;
      const to    = nodeMap[edge.target] ?? edge.target;
      const label = edge.data?.label;
      const type  = edge.data?.edgeType;
      section += `- **${from}** → **${to}**`;
      if (label) section += ` when: "_${label}_"`;
      if (type && type !== 'default') section += ` (\`${type}\` path)`;
      section += '\n';
    }
    section += '\n';
  }

  if (objective === 'frontend') {
    section += '**Routing implications:**\n';
    const screens = state.nodes.filter((n) => n.data?.nodeType === 'screen');
    for (const s of screens) {
      const route = '/' + s.data.name.toLowerCase().replace(/\s+/g, '-').replace(/page$/, '');
      section += `- Route \`${route}\` → renders \`${s.data.name}\` component\n`;
    }
    section += '\n';
  }

  return section;
}

// ── Checklist ─────────────────────────────────────────────────────────────────

function buildChecklist(objective, toolStates) {
  const items = [];

  if (objective === 'frontend' || objective === 'fullfeature' || objective === 'cursor') {
    if (toolStates.tree?.nodes?.length) {
      items.push('Create all component files matching the component tree');
      items.push('Implement each component with correct props interface');
    }
    if (toolStates.wireframer?.canvasItems?.length) {
      items.push('Implement page layout in the order specified by the wireframe');
    }
    if (toolStates.contract?.fields?.length) {
      items.push('Add TypeScript interfaces for all API request/response types');
      items.push('Wire up API calls to the endpoints in the contract');
    }
    if (toolStates.journey?.nodes?.length) {
      items.push('Implement routing for each screen in the user journey');
      items.push('Handle all transitions (navigation, conditional paths)');
    }
    items.push('Add Tailwind CSS styling following design system conventions');
    items.push('Write unit tests for all components');
  }

  if (objective === 'backend' || objective === 'fullfeature') {
    if (toolStates.visualizer?.nodes?.length) {
      items.push('Create database migrations for all tables in the schema');
      items.push('Set up foreign key constraints and relationships');
    }
    if (toolStates.contract?.fields?.length) {
      items.push('Implement all API endpoints matching the contract exactly');
      items.push('Add input validation for all required fields');
      items.push('Return correct HTTP status codes for all responses');
    }
    items.push('Add error handling and logging');
    items.push('Write integration tests for all endpoints');
  }

  if (objective === 'cursor') {
    items.push('Scaffold the project directory structure');
    items.push('Configure TypeScript, ESLint, and Tailwind');
    items.push('Set up path aliases to match the component tree');
  }

  if (!items.length) return null;

  let section = '## ✅ Implementation Checklist\n\n';
  for (const item of items) {
    section += `- [ ] ${item}\n`;
  }
  return section + '\n';
}

// ── AI target wrappers ────────────────────────────────────────────────────────

function wrapForAI(content, targetAI, projectName, objective) {
  const obj = OBJECTIVES.find((o) => o.id === objective);

  switch (targetAI) {
    case 'claude':
      return `<document>
<context>
${content}
</context>
<instructions>
Review the architecture above and implement the described system. Follow every constraint exactly. Do not introduce components, endpoints, or database tables not listed here. Ask for clarification before deviating from any specification.
</instructions>
</document>`;

    case 'cursor':
      return `# ${projectName} — AI Coding Rules

> Auto-generated by DevTools Context Compiler. Paste this into \`.cursorrules\` or \`AGENTS.md\`.

${content}
---

## ⚠️ Hard Constraints

- Do not create files not listed in the component tree
- Do not change field names in API contracts
- Do not add database columns not in the schema
- Match TypeScript interfaces exactly to the contract types
- Ask before adding any new dependencies`;

    case 'gpt4':
      return `SYSTEM: You are an expert developer implementing ${projectName}. Follow the architecture below exactly.

${content}

Implement the specification above. Start with the file structure, then implement each piece top-down. Output complete, working code.`;

    default:
      return content;
  }
}

// ── Master prompt builder ─────────────────────────────────────────────────────

/**
 * Build the full context prompt.
 *
 * @param {string}  objective  'frontend' | 'backend' | 'fullfeature' | 'cursor'
 * @param {object}  toolStates  { visualizer, wireframer, journey, contract, tree }
 * @param {object}  config      User settings
 * @param {object}  sections    { tree, wireframer, journey, visualizer, contract } booleans
 * @returns {string}  Complete Markdown prompt
 */
export function buildContextPrompt(objective, toolStates, config, sections) {
  const {
    projectName       = 'My Project',
    projectDescription = '',
    techStack          = 'React, TypeScript, Tailwind CSS',
    conventions        = '',
    targetAI           = 'claude',
    includeChecklist   = true,
    includeFileMap     = true,
  } = config;

  const obj = OBJECTIVES.find((o) => o.id === objective) ?? OBJECTIVES[0];

  const parts = [];

  // ── Header ────────────────────────────────────────────────────────────────
  const now   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const target = AI_TARGETS.find((t) => t.id === targetAI)?.label ?? 'AI';

  parts.push(`---
**${obj.icon} ${obj.label.toUpperCase()}**
Project: **${projectName}** · Target: ${target} · Generated: ${now}
---\n`);

  // ── Preamble ──────────────────────────────────────────────────────────────
  const preambles = {
    frontend: `You are an expert React/TypeScript frontend developer. Your task is to implement the frontend application described below. Follow every architectural constraint exactly — do not introduce components, patterns, or dependencies not listed here.\n`,
    backend:  `You are an expert backend developer. Your task is to implement the server-side API and database described below. Match every endpoint, field name, and data type exactly as specified.\n`,
    fullfeature: `You are a technical architect reviewing and documenting a full-stack application. The following document is the complete specification for **${projectName}**. Store it in \`/docs/features/\` and reference it for all implementation decisions.\n`,
    cursor:   `This file defines the architectural rules and constraints for AI coding assistants working on **${projectName}**. These rules are non-negotiable. Always reference this document before writing code.\n`,
  };
  parts.push(preambles[objective] ?? preambles.frontend);

  // ── Project context ───────────────────────────────────────────────────────
  parts.push('## 📋 Project Context\n');
  if (projectDescription) parts.push(`> ${projectDescription}\n`);
  parts.push(`**Tech Stack:** ${techStack}`);
  if (conventions) parts.push(`\n**Conventions:** ${conventions}`);
  parts.push('\n\n---\n');

  // ── Tool sections (in logical order) ─────────────────────────────────────
  const sectionOrder = {
    frontend:    ['tree', 'wireframer', 'journey', 'contract'],
    backend:     ['visualizer', 'contract', 'journey'],
    fullfeature: ['tree', 'wireframer', 'journey', 'visualizer', 'contract'],
    cursor:      ['tree', 'visualizer', 'contract', 'wireframer'],
  };

  const order = sectionOrder[objective] ?? sectionOrder.frontend;

  for (const sectionId of order) {
    if (!sections[sectionId]) continue;

    let content = null;
    switch (sectionId) {
      case 'tree':       content = buildTreeSection(toolStates.tree, { includeFileMap });            break;
      case 'wireframer': content = buildWireframeSection(toolStates.wireframer);                     break;
      case 'visualizer': content = buildDatabaseSection(toolStates.visualizer);                      break;
      case 'contract':   content = buildContractSection(toolStates.contract, objective);             break;
      case 'journey':    content = buildJourneySection(toolStates.journey, objective);               break;
    }

    if (content) {
      parts.push(content);
      parts.push('---\n');
    }
  }

  // ── Checklist ─────────────────────────────────────────────────────────────
  if (includeChecklist) {
    const checklist = buildChecklist(objective, toolStates);
    if (checklist) {
      parts.push(checklist);
      parts.push('---\n');
    }
  }

  // ── Closing instruction ───────────────────────────────────────────────────
  const closings = {
    frontend:    '**BEGIN IMPLEMENTATION** — Start with the file structure, then implement each component top-down following the tree hierarchy.',
    backend:     '**BEGIN IMPLEMENTATION** — Start with the database migrations, then implement each API endpoint, then add validation and tests.',
    fullfeature: '_End of specification. All implementation decisions should reference this document._',
    cursor:      '_These rules are always active for this project. Reference this document for every code change._',
  };
  parts.push(closings[objective] ?? '');

  const rawContent = parts.join('\n');

  // ── Wrap for target AI format ─────────────────────────────────────────────
  return wrapForAI(rawContent, targetAI, projectName, objective);
}

// ── Markdown syntax highlighter ───────────────────────────────────────────────

export function highlightMarkdown(raw) {
  const safe = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return safe
    // Fenced code blocks — must run before inline rules
    .replace(/(```[\s\S]*?```)/g,
      '<span style="color:#a5b4fc;background:rgba(99,102,241,0.08);display:block;border-left:3px solid #4f46e5;padding-left:8px;margin:2px 0">$1</span>')
    // HR / metadata fences
    .replace(/^(---+.*)$/gm,
      '<span style="color:#334155">$1</span>')
    // H1
    .replace(/^(# .+)$/gm,
      '<span style="color:#f8fafc;font-weight:700;font-size:1.05em">$1</span>')
    // H2
    .replace(/^(## .+)$/gm,
      '<span style="color:#e2e8f0;font-weight:600">$1</span>')
    // H3
    .replace(/^(### .+)$/gm,
      '<span style="color:#cbd5e1">$1</span>')
    // Table divider rows (|---|---|)
    .replace(/^(\|[-: |]+\|)$/gm,
      '<span style="color:#1e293b">$1</span>')
    // Table rows
    .replace(/^(\|.+\|)$/gm,
      '<span style="color:#7dd3fc">$1</span>')
    // Inline code
    .replace(/`([^`\n]+)`/g,
      '<span style="color:#34d399;background:rgba(52,211,153,0.08);padding:0 2px;border-radius:3px">`$1`</span>')
    // Checklist items
    .replace(/^(- \[[ x]\] .+)$/gm,
      '<span style="color:#fbbf24">$1</span>')
    // Bullet list
    .replace(/^([-*] .+)$/gm,
      '<span style="color:#94a3b8">$1</span>')
    // Numbered list
    .replace(/^(\d+\. .+)$/gm,
      '<span style="color:#cbd5e1">$1</span>')
    // Bold
    .replace(/\*\*([^*\n]+)\*\*/g,
      '<span style="color:#f1f5f9;font-weight:600">**$1**</span>')
    // Blockquote
    .replace(/^(&gt;.+)$/gm,
      '<span style="color:#64748b;font-style:italic">$1</span>')
    // XML tags (for Claude format)
    .replace(/(&lt;\/?[\w]+&gt;)/g,
      '<span style="color:#f59e0b">$1</span>');
}
