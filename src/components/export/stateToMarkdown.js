// ── Converters: visual tool state → Markdown documentation ───────────────────

// ── Data Visualizer ───────────────────────────────────────────────────────────

export function visualizerToMarkdown(state) {
  if (!state?.nodes?.length) return null;

  const nodeMap = Object.fromEntries(state.nodes.map((n) => [n.id, n]));
  let md = '# Database Schema\n\n';

  for (const node of state.nodes) {
    const { tableName = 'unknown', columns = [] } = node.data ?? {};
    md += `## \`${tableName}\`\n\n`;

    if (columns.length) {
      md += '| Column | Type |\n';
      md += '|--------|------|\n';
      for (const col of columns) {
        md += `| \`${col.name}\` | ${col.type} |\n`;
      }
    } else {
      md += '_No columns defined._\n';
    }
    md += '\n';
  }

  if (state.edges?.length) {
    md += '## Relationships\n\n';
    md += '| From Table | To Table |\n';
    md += '|------------|----------|\n';
    for (const edge of state.edges) {
      const from = nodeMap[edge.source]?.data?.tableName ?? edge.source;
      const to   = nodeMap[edge.target]?.data?.tableName ?? edge.target;
      md += `| \`${from}\` | \`${to}\` |\n`;
    }
    md += '\n';
  }

  return md;
}

// ── UI Wireframer ─────────────────────────────────────────────────────────────

const BLOCK_LABELS = {
  navbar:  'Navigation Bar',
  sidebar: 'Side Navigation Panel',
  table:   'Data Table',
  form:    'Form / Input Fields',
  button:  'Button Group',
  image:   'Image / Media Placeholder',
  chart:   'Chart / Graph',
};

export function wireframerToMarkdown(state) {
  if (!state?.canvasItems?.length) return null;

  let md = '# UI Wireframe Layout\n\n';
  md += 'Components listed top-to-bottom as they appear on the page.\n\n';
  md += '| # | Component | Block Type |\n';
  md += '|---|-----------|------------|\n';

  state.canvasItems.forEach((item, i) => {
    md += `| ${i + 1} | ${BLOCK_LABELS[item.type] ?? item.type} | \`${item.type}\` |\n`;
  });

  return md + '\n';
}

// ── Journey Mapper ────────────────────────────────────────────────────────────

export function journeyToMarkdown(state) {
  if (!state?.nodes?.length) return null;

  const nodeMap = Object.fromEntries(state.nodes.map((n) => [n.id, n.data?.name ?? n.id]));
  let md = '# User Journey Flow\n\n';

  md += '## Screens & States\n\n';
  md += '| Screen | Type | Status | Description |\n';
  md += '|--------|------|--------|-------------|\n';
  for (const node of state.nodes) {
    const { name = '', nodeType = '', status = 'none', description = '' } = node.data ?? {};
    md += `| ${name} | \`${nodeType}\` | ${status} | ${description || '—'} |\n`;
  }
  md += '\n';

  if (state.edges?.length) {
    md += '## Transitions\n\n';
    md += '| From | User Action | To | Path Type |\n';
    md += '|------|-------------|----|-----------|\n';
    for (const edge of state.edges) {
      const from   = nodeMap[edge.source] ?? edge.source;
      const to     = nodeMap[edge.target] ?? edge.target;
      const label  = edge.data?.label || '—';
      const type   = edge.data?.edgeType || 'default';
      md += `| ${from} | ${label} | ${to} | \`${type}\` |\n`;
    }
    md += '\n';
  }

  return md;
}

// ── JSON Contract Builder ─────────────────────────────────────────────────────

export function contractToMarkdown(state) {
  if (!state?.fields?.length) return null;

  const {
    method = 'POST',
    path = '/api/v1',
    schemaName = 'Payload',
    description = '',
    fields = [],
  } = state;

  let md = `# API Contract: \`${schemaName}\`\n\n`;
  md += `**Endpoint:** \`${method} ${path}\`\n\n`;
  if (description) md += `**Description:** ${description}\n\n`;

  md += '## Schema\n\n';
  md += '| Field | Type | Required | Nullable | Example | Description |\n';
  md += '|-------|------|:--------:|:--------:|---------|-------------|\n';

  function renderFields(fs, prefix = '') {
    for (const f of fs ?? []) {
      const key = prefix ? `${prefix}.${f.key}` : f.key;
      const req = f.required ? '✓' : '—';
      const nul = f.nullable ? '✓' : '—';
      const val = f.value   ? `\`${f.value}\`` : '—';
      md += `| \`${key}\` | \`${f.type}\` | ${req} | ${nul} | ${val} | ${f.description || '—'} |\n`;
      if (f.children?.length) renderFields(f.children, key);
    }
  }

  renderFields(fields);
  return md + '\n';
}

// ── Component Tree ────────────────────────────────────────────────────────────

export function treeToMarkdown(state) {
  if (!state?.nodes?.length) return null;

  const { nodes, convention = 'feature' } = state;

  // Build children map
  const childrenOf = Object.fromEntries(nodes.map((n) => [n.id, []]));
  nodes.forEach((n) => { if (n.parentId && childrenOf[n.parentId]) childrenOf[n.parentId].push(n); });
  const roots = nodes.filter((n) => !n.parentId);

  let md = '# Component Architecture\n\n';
  md += `**Path Convention:** \`${convention}\`\n\n`;

  // ASCII tree
  md += '## Tree\n\n```\n';

  function renderBranch(node, prefix = '', isLast = true) {
    const connector = prefix ? (isLast ? '└── ' : '├── ') : '';
    const type      = `(${node.type})`;
    const desc      = node.description ? ` — ${node.description}` : '';
    const props     = node.props?.length ? ` [${node.props.length} prop${node.props.length !== 1 ? 's' : ''}]` : '';
    md += `${prefix}${connector}${node.name} ${type}${desc}${props}\n`;

    const kids       = childrenOf[node.id] ?? [];
    const childPfx   = prefix + (prefix ? (isLast ? '    ' : '│   ') : '');
    kids.forEach((kid, i) => renderBranch(kid, childPfx, i === kids.length - 1));
  }

  roots.forEach((root, i) => renderBranch(root, '', i === roots.length - 1));
  md += '```\n\n';

  // Detail table
  md += '## Component Details\n\n';
  md += '| Component | Type | Description | Props |\n';
  md += '|-----------|------|-------------|-------|\n';
  for (const n of nodes) {
    const propsStr = n.props?.length
      ? n.props.map((p) => `\`${p.name}${p.required ? '' : '?'}: ${p.type}\``).join(', ')
      : '—';
    md += `| \`${n.name}\` | ${n.type} | ${n.description || '—'} | ${propsStr} |\n`;
  }

  return md + '\n';
}

// ── README ────────────────────────────────────────────────────────────────────

export function generateReadme(projectName, hasTools) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const docs = [];
  if (hasTools.visualizer) docs.push('| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Entity relationships and table definitions |');
  if (hasTools.wireframer)  docs.push('| [UI_WIREFRAME.md](UI_WIREFRAME.md)       | Lo-fi page layout wireframe               |');
  if (hasTools.journey)     docs.push('| [USER_JOURNEY.md](USER_JOURNEY.md)       | User flow and navigation map              |');
  if (hasTools.contract)    docs.push('| [API_CONTRACT.md](API_CONTRACT.md)       | API endpoint and request/response schema  |');
  if (hasTools.tree)        docs.push('| [COMPONENT_TREE.md](COMPONENT_TREE.md)   | React component hierarchy                 |');

  return `# ${projectName}

> Architecture documentation generated by [DevTools](https://github.com/Carefree-1991/DevTools) on ${date}.

## Documentation

| File | Description |
|------|-------------|
${docs.join('\n')}
| [devtools-state.json](devtools-state.json) | Raw project state (re-import into DevTools) |

---

*Built with DevTools — a local React/Vite dev dashboard for planning software architecture.*
`;
}

// ── Master file manifest ──────────────────────────────────────────────────────

/**
 * Build the full array of {path, content} objects to push to GitHub.
 * Skips any tool whose state has no meaningful data.
 */
export function buildFileManifest(projectName, toolStates) {
  const files = [];
  const hasTools = {};

  const visualizerMd = visualizerToMarkdown(toolStates.visualizer);
  if (visualizerMd) { files.push({ path: 'DATABASE_SCHEMA.md', content: visualizerMd }); hasTools.visualizer = true; }

  const wireframerMd = wireframerToMarkdown(toolStates.wireframer);
  if (wireframerMd) { files.push({ path: 'UI_WIREFRAME.md', content: wireframerMd }); hasTools.wireframer = true; }

  const journeyMd = journeyToMarkdown(toolStates.journey);
  if (journeyMd) { files.push({ path: 'USER_JOURNEY.md', content: journeyMd }); hasTools.journey = true; }

  const contractMd = contractToMarkdown(toolStates.contract);
  if (contractMd) { files.push({ path: 'API_CONTRACT.md', content: contractMd }); hasTools.contract = true; }

  const treeMd = treeToMarkdown(toolStates.tree);
  if (treeMd) { files.push({ path: 'COMPONENT_TREE.md', content: treeMd }); hasTools.tree = true; }

  // Always include README and raw state
  files.unshift({ path: 'README.md', content: generateReadme(projectName, hasTools) });
  files.push({
    path: 'devtools-state.json',
    content: JSON.stringify(toolStates, null, 2),
  });

  return files;
}
