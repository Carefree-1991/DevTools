// ── Component type catalogue ───────────────────────────────────────────────────

export const COMP_TYPES = {
  page:      { label: 'Page',      dot: '#3b82f6', header: '#1e3a5f', border: '#3b82f6', tag: '#93c5fd'  },
  layout:    { label: 'Layout',    dot: '#8b5cf6', header: '#2d1f5f', border: '#8b5cf6', tag: '#c4b5fd'  },
  feature:   { label: 'Feature',   dot: '#10b981', header: '#1a3d30', border: '#10b981', tag: '#6ee7b7'  },
  component: { label: 'Component', dot: '#64748b', header: '#1e2433', border: '#475569', tag: '#94a3b8'  },
  context:   { label: 'Context',   dot: '#f59e0b', header: '#3d2a00', border: '#f59e0b', tag: '#fcd34d'  },
  shared:    { label: 'Shared',    dot: '#f43f5e', header: '#3d1020', border: '#f43f5e', tag: '#fda4af'  },
};

export const PATH_CONVENTIONS = {
  feature: 'Feature-based',
  flat:    'Flat components/',
  atomic:  'Atomic Design',
  nextjs:  'Next.js App Router',
};

// ── Tree helpers ───────────────────────────────────────────────────────────────

export function getAncestors(nodeId, flatNodes) {
  const map = Object.fromEntries(flatNodes.map((n) => [n.id, n]));
  const chain = [];
  let cur = map[nodeId];
  while (cur?.parentId) {
    cur = map[cur.parentId];
    if (cur) chain.unshift(cur);
  }
  return chain; // root first, direct parent last
}

export function getAllDescendantIds(nodeId, flatNodes) {
  const ids = new Set();
  const queue = [nodeId];
  while (queue.length) {
    const id = queue.shift();
    flatNodes.forEach((n) => {
      if (n.parentId === id) { ids.add(n.id); queue.push(n.id); }
    });
  }
  return ids;
}

export function isDescendant(potentialDescendantId, ancestorId, flatNodes) {
  return getAllDescendantIds(ancestorId, flatNodes).has(potentialDescendantId);
}

// ── Path generation ────────────────────────────────────────────────────────────

export function generatePath(node, flatNodes, convention) {
  const ancestors = getAncestors(node.id, flatNodes);
  const ext = convention === 'nextjs' ? 'tsx' : 'jsx';

  switch (convention) {
    case 'feature': {
      if (ancestors.length === 0) return `src/${node.name}.${ext}`;
      // First ancestor after root = the feature folder
      const feature = ancestors.length === 1 ? node : ancestors[1];
      if (ancestors.length === 1) return `src/features/${node.name}/index.${ext}`;
      return `src/features/${feature.name}/${node.name}.${ext}`;
    }
    case 'flat':
      return ancestors.length === 0
        ? `src/App.${ext}`
        : `src/components/${node.name}.${ext}`;

    case 'atomic': {
      const folder = {
        page: 'pages', layout: 'templates', feature: 'organisms',
        component: 'atoms', context: 'providers', shared: 'molecules',
      }[node.type] ?? 'components';
      return ancestors.length === 0
        ? `src/App.${ext}`
        : `src/components/${folder}/${node.name}.${ext}`;
    }
    case 'nextjs': {
      if (node.type === 'page') {
        const segments = [...ancestors.slice(1), node]
          .map((n) => n.name.replace(/Page$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-'));
        return segments.length === 1 && segments[0] === ''
          ? `app/page.${ext}`
          : `app/${segments.join('/')}/page.${ext}`;
      }
      if (node.type === 'layout') return `app/${node.name.toLowerCase()}/layout.${ext}`;
      return `src/components/${node.name}.${ext}`;
    }
    default:
      return `src/${node.name}.${ext}`;
  }
}

export function generateAllPaths(flatNodes, convention) {
  return flatNodes
    .map((n) => generatePath(n, flatNodes, convention))
    .join('\n');
}

export function generateShellCommands(flatNodes, convention) {
  const paths = flatNodes.map((n) => generatePath(n, flatNodes, convention));

  const dirs = [...new Set(
    paths.map((p) => {
      const parts = p.split('/');
      parts.pop();
      return parts.join('/');
    }).filter(Boolean)
  )].sort();

  const lines = [
    '#!/bin/bash',
    '# Create directory structure',
    ...dirs.map((d) => `mkdir -p ${d}`),
    '',
    '# Create component files',
    ...paths.sort().map((p) => `touch ${p}`),
  ];
  return lines.join('\n');
}

// ── Layout algorithm (subtree-width based) ────────────────────────────────────

export function computeLayout(flatNodes) {
  const NODE_W = 188;
  const NODE_H = 72;
  const H_GAP  = 52;
  const V_GAP  = 72;

  // Build children map
  const kids = Object.fromEntries(flatNodes.map((n) => [n.id, []]));
  for (const n of flatNodes) {
    if (n.parentId && kids[n.parentId]) kids[n.parentId].push(n.id);
  }

  const roots = flatNodes.filter((n) => !n.parentId).map((n) => n.id);

  // Which nodes are visible (respects collapsed)
  const visible = new Set();
  function markVisible(id) {
    visible.add(id);
    const node = flatNodes.find((n) => n.id === id);
    if (!node?.collapsed) (kids[id] ?? []).forEach(markVisible);
  }
  roots.forEach(markVisible);

  function subtreeW(id) {
    const node = flatNodes.find((n) => n.id === id);
    const children = node?.collapsed ? [] : (kids[id] ?? []);
    if (!children.length) return NODE_W;
    const sum = children.reduce((s, k) => s + subtreeW(k), 0);
    return Math.max(NODE_W, sum + (children.length - 1) * H_GAP);
  }

  const pos = {};
  function assign(id, x, y) {
    const node = flatNodes.find((n) => n.id === id);
    const children = node?.collapsed ? [] : (kids[id] ?? []);
    const sw = subtreeW(id);
    pos[id] = { x: x + sw / 2 - NODE_W / 2, y };
    let cx = x;
    for (const kid of children) {
      const csw = subtreeW(kid);
      assign(kid, cx, y + NODE_H + V_GAP);
      cx += csw + H_GAP;
    }
  }

  let rootX = 0;
  for (const rid of roots) {
    const sw = subtreeW(rid);
    assign(rid, rootX, 0);
    rootX += sw + H_GAP * 2;
  }

  const rfNodes = flatNodes
    .filter((n) => visible.has(n.id))
    .map((n) => ({
      id: n.id,
      type: 'compNode',
      position: pos[n.id] ?? { x: 0, y: 0 },
      draggable: false,
      data: {
        node: n,
        childCount: (kids[n.id] ?? []).length,
        hiddenCount: n.collapsed ? (kids[n.id] ?? []).length : 0,
      },
    }));

  const rfEdges = flatNodes
    .filter((n) => n.parentId && visible.has(n.id) && visible.has(n.parentId))
    .map((n) => ({
      id: `e-${n.parentId}-${n.id}`,
      source: n.parentId,
      target: n.id,
      type: 'smoothstep',
      style: { stroke: '#334155', strokeWidth: 2 },
    }));

  return { rfNodes, rfEdges };
}
