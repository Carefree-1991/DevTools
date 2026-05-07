// ── Storage ───────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'devtools_ai_settings';

export function getAISettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {}; }
  catch { return {}; }
}

export function saveAISettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Provider catalogue ────────────────────────────────────────────────────────

export const AI_PROVIDERS = {
  gemini: {
    name:         'Google Gemini',
    models:       ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    placeholder:  'AIza…',
    keyUrl:       'https://aistudio.google.com/app/apikey',
  },
  claude: {
    name:         'Anthropic Claude',
    models:       ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-7'],
    defaultModel: 'claude-sonnet-4-6',
    placeholder:  'sk-ant-…',
    keyUrl:       'https://console.anthropic.com/settings/keys',
  },
  openai: {
    name:         'OpenAI',
    models:       ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o-mini',
    placeholder:  'sk-…',
    keyUrl:       'https://platform.openai.com/api-keys',
  },
};

// ── Tab metadata + system prompts ─────────────────────────────────────────────

export const TAB_CONFIGS = {
  visualizer: {
    label:    'Data Visualizer',
    greeting: "Describe a database and I'll generate the ERD tables and relationships.",
    prompts:  [
      'SaaS app: users, subscriptions, and invoices',
      'Blog: users, posts, comments, and tags',
      'E-commerce: products, orders, customers, and inventory',
    ],
    systemPrompt: `You are an auto-builder for a React ERD canvas tool. The user describes a database schema.

Return ONLY a valid JSON object — no markdown, no code blocks, no prose, no explanation. Raw JSON only.

Required shape:
{
  "nodes": [
    {
      "id": "table_1",
      "type": "tableNode",
      "position": { "x": 100, "y": 100 },
      "draggable": true,
      "data": {
        "tableName": "users",
        "columns": [
          { "id": "table_1_col_0", "name": "id",    "type": "UUID"     },
          { "id": "table_1_col_1", "name": "email", "type": "String"   }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "e-table_1-table_2",
      "source": "table_1",
      "target": "table_2",
      "type": "smoothstep",
      "style":     { "stroke": "#818cf8", "strokeWidth": 2 },
      "markerEnd": { "type": "arrowclosed", "color": "#818cf8" }
    }
  ]
}

Rules:
- Every table must start with an "id" column of type UUID.
- Valid column types: UUID, String, Int, Float, Boolean, JSON, DateTime, Array
- Table IDs: table_1, table_2, table_3 …
- Column IDs must follow: {tableId}_col_{index} (e.g. table_1_col_0)
- Position tables 380px apart horizontally, 300px apart vertically.
- Foreign key columns should be named {targetTable}_id with type String.`,
  },

  wireframer: {
    label:    'UI Wireframer',
    greeting: "Describe a page layout and I'll place the lo-fi wireframe blocks.",
    prompts:  [
      'Admin dashboard with sidebar and data table',
      'Marketing landing page',
      'Settings page with form inputs',
    ],
    systemPrompt: `You are an auto-builder for a lo-fi UI wireframer. The user describes a page layout.

Return ONLY a valid JSON object — no markdown, no code blocks, no prose. Raw JSON only.

Required shape:
{
  "canvasItems": [
    { "id": "block-1", "type": "navbar"  },
    { "id": "block-2", "type": "sidebar" },
    { "id": "block-3", "type": "table"   }
  ]
}

Valid block types (use only these): navbar, sidebar, table, form, button, image, chart

Rules:
- IDs must be block-1, block-2, block-3 … (sequential integers)
- Items render top-to-bottom in the order listed
- Include only the blocks that are logically appropriate for the described layout
- A page should have at most one navbar and one sidebar`,
  },

  journey: {
    label:    'Journey Mapper',
    greeting: "Describe a user flow and I'll map it as a diagram.",
    prompts:  [
      'User sign-up and onboarding flow',
      'Checkout and payment process',
      'Forgot password / reset flow',
    ],
    systemPrompt: `You are an auto-builder for a user journey flow mapper. The user describes a product flow.

Return ONLY a valid JSON object — no markdown, no code blocks, no prose. Raw JSON only.

Required shape:
{
  "nodes": [
    {
      "id": "j_1",
      "type": "journeyNode",
      "position": { "x": 100, "y": 100 },
      "draggable": true,
      "data": {
        "name":        "Landing Page",
        "description": "",
        "nodeType":    "screen",
        "status":      "none"
      }
    }
  ],
  "edges": [
    {
      "id":     "e_j_1_j_2",
      "source": "j_1",
      "target": "j_2",
      "type":   "journeyEdge",
      "data":   { "label": "Clicks Sign Up", "edgeType": "default" },
      "markerEnd": { "type": "arrowclosed", "color": "#64748b" }
    }
  ]
}

Node type meanings (pick the most appropriate):
  screen   = frontend UI page or screen
  backend  = API endpoint or server process
  auth     = authentication or authorisation gate
  decision = conditional branch point (if/else)
  service  = external third-party service
  terminal = start or end point

Edge type meanings:
  default     = normal navigation  → markerEnd color #64748b
  conditional = if/else branch     → markerEnd color #d97706
  error       = error/failure path → markerEnd color #dc2626
  success     = success path       → markerEnd color #16a34a
  async       = background/async   → markerEnd color #7c3aed

Rules:
- Start every flow with a "terminal" node named "Start".
- End every flow with a "terminal" node named "End".
- Set status to "none" for every node.
- Node IDs: j_1, j_2, j_3 … Edge IDs: e_j_1_j_2, e_j_2_j_3 …
- Space nodes 300px horizontally, 200px vertically.
- Set markerEnd color to match the edgeType color listed above.`,
  },

  contract: {
    label:    'JSON Contract Builder',
    greeting: "Describe an API endpoint and I'll scaffold the JSON schema.",
    prompts:  [
      'POST /users — user registration with email and password',
      'GET /orders — paginated order list response',
      'Error response with code, message, and field-level details',
    ],
    systemPrompt: `You are an auto-builder for a JSON API Contract Builder. The user describes an API endpoint.

Return ONLY a valid JSON object — no markdown, no code blocks, no prose. Raw JSON only.

Required shape:
{
  "method":      "POST",
  "path":        "/api/v1/users",
  "schemaName":  "CreateUserRequest",
  "description": "Creates a new user account",
  "fields": [
    {
      "id":          "f1",
      "key":         "email",
      "type":        "string",
      "value":       "user@example.com",
      "required":    true,
      "nullable":    false,
      "description": "Primary email address",
      "children":    []
    },
    {
      "id":          "f2",
      "key":         "address",
      "type":        "object",
      "value":       "",
      "required":    false,
      "nullable":    true,
      "description": "Mailing address",
      "children": [
        { "id": "f2_1", "key": "street", "type": "string", "value": "123 Main St", "required": true, "nullable": false, "description": "", "children": [] }
      ]
    }
  ]
}

Valid types: string, number, boolean, null, array, object
For "object" and "array" types, put nested fields in "children" (same structure, recursive).
For "null" type, set value to "".
For "boolean", value must be the string "true" or "false".
For "number", value must be a numeric string like "42".

Rules:
- schemaName must be PascalCase (e.g. CreateUserRequest, ApiResponse).
- Field IDs: f1, f2, f3 … Child field IDs: f1_1, f1_2, f2_1 …
- method must be one of: GET, POST, PUT, PATCH, DELETE`,
  },

  tree: {
    label:    'Component Tree',
    greeting: "Describe a React app and I'll plan the component hierarchy.",
    prompts:  [
      'SaaS dashboard with auth, sidebar, and data tables',
      'Next.js e-commerce storefront',
      'Admin panel with user management',
    ],
    systemPrompt: `You are an auto-builder for a React Component Tree Visualizer. The user describes a React application.

Return ONLY a valid JSON object — no markdown, no code blocks, no prose. Raw JSON only.

Required shape:
{
  "convention": "feature",
  "nodes": [
    {
      "id":          "cn_1",
      "parentId":    null,
      "name":        "App",
      "type":        "page",
      "description": "Root component",
      "props":       [],
      "collapsed":   false
    },
    {
      "id":          "cn_2",
      "parentId":    "cn_1",
      "name":        "AppLayout",
      "type":        "layout",
      "description": "Global shell wrapper",
      "props":       [],
      "collapsed":   false
    }
  ]
}

Component type meanings:
  page      = route-level page component
  layout    = shell / wrapper that renders children
  feature   = feature module container (co-located logic + UI)
  component = reusable UI component
  context   = React Context provider
  shared    = shared utility or hook

Rules:
- Component names must be PascalCase.
- Root nodes have parentId: null. All others reference their parent's id.
- Node IDs: cn_1, cn_2, cn_3 … (sequential)
- Set collapsed: false for every node.
- Props array can be empty []; only add props if clearly implied.
- convention must be one of: feature, flat, atomic, nextjs (default to "feature").`,
  },
};

// ── JSON extraction (handles LLM returning markdown fences) ───────────────────

function extractJSON(text) {
  // Strip markdown code fences if present
  let s = text.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1').trim();
  // Find the outermost { ... }
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

// ── Human-readable summary of what was generated ─────────────────────────────

function countFieldsDeep(fields) {
  return (fields ?? []).reduce((n, f) => n + 1 + countFieldsDeep(f.children), 0);
}

export function summarizeGeneration(toolId, state) {
  switch (toolId) {
    case 'visualizer':
      return `Generated ${state.nodes?.length ?? 0} table${(state.nodes?.length ?? 0) !== 1 ? 's' : ''} with ${state.edges?.length ?? 0} relationship${(state.edges?.length ?? 0) !== 1 ? 's' : ''}.`;
    case 'wireframer':
      return `Added ${state.canvasItems?.length ?? 0} block${(state.canvasItems?.length ?? 0) !== 1 ? 's' : ''} to the wireframe.`;
    case 'journey':
      return `Created a flow with ${state.nodes?.length ?? 0} screen${(state.nodes?.length ?? 0) !== 1 ? 's' : ''} and ${state.edges?.length ?? 0} connection${(state.edges?.length ?? 0) !== 1 ? 's' : ''}.`;
    case 'contract': {
      const n = countFieldsDeep(state.fields);
      return `Built a ${state.method ?? 'POST'} ${state.path ?? '/api'} schema with ${n} field${n !== 1 ? 's' : ''}.`;
    }
    case 'tree':
      return `Created a component tree with ${state.nodes?.length ?? 0} component${(state.nodes?.length ?? 0) !== 1 ? 's' : ''}.`;
    default:
      return 'Template applied to canvas.';
  }
}

// ── API call implementations ──────────────────────────────────────────────────

async function callGemini(apiKey, model, systemPrompt, userMessages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: userMessages.map((m) => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature:         0.7,
      response_mime_type: 'application/json',
    },
  };

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callClaude(apiKey, model, systemPrompt, userMessages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':                            'application/json',
      'x-api-key':                               apiKey,
      'anthropic-version':                       '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   userMessages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Claude error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callOpenAI(apiKey, model, systemPrompt, userMessages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...userMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      response_format: { type: 'json_object' },
      temperature:     0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `OpenAI error ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a canvas template from the AI.
 *
 * @param {Array<{role:'user'|'assistant', content:string}>} messages  Conversation so far.
 * @param {string}  activeTab    One of: visualizer, wireframer, journey, contract, tree.
 * @param {object|null} currentState  Current canvas state to include as context (optional).
 * @returns {Promise<object>} Parsed JSON state ready for injectToolState.
 */
export async function generateTemplateFromAI(messages, activeTab, currentState = null) {
  const { provider = 'gemini', apiKey, model } = getAISettings();

  if (!apiKey) {
    const err = new Error('NO_KEY');
    err.noKey = true;
    throw err;
  }

  const providerCfg = AI_PROVIDERS[provider];
  if (!providerCfg) throw new Error(`Unknown provider: ${provider}`);

  const resolvedModel = model || providerCfg.defaultModel;

  // Build system prompt, optionally appending current canvas state
  let systemPrompt = TAB_CONFIGS[activeTab]?.systemPrompt ?? '';

  if (currentState) {
    const stateStr = JSON.stringify(currentState);
    // Only include current state if it's not too large (to avoid token waste)
    if (stateStr.length < 3000 && stateStr !== '{}' && stateStr !== 'null') {
      systemPrompt += `\n\n---\nCurrent canvas state (build on this unless the user asks to start fresh):\n${stateStr}`;
    }
  }

  let rawText;
  switch (provider) {
    case 'gemini': rawText = await callGemini(apiKey, resolvedModel, systemPrompt, messages); break;
    case 'claude': rawText = await callClaude(apiKey, resolvedModel, systemPrompt, messages); break;
    case 'openai': rawText = await callOpenAI(apiKey, resolvedModel, systemPrompt, messages); break;
    default: throw new Error(`Provider "${provider}" not implemented`);
  }

  return extractJSON(rawText);
}
