// ── Block catalogue ────────────────────────────────────────────────────────────

export const BLOCK_DEFS = [
  { type: 'navbar',  label: 'Navbar',          description: 'Top navigation bar' },
  { type: 'sidebar', label: 'Sidebar',          description: 'Vertical nav / filter panel' },
  { type: 'table',   label: 'Data Table',       description: 'Rows & columns of data' },
  { type: 'form',    label: 'Form Input',        description: 'Label + input fields' },
  { type: 'button',  label: 'Button',            description: 'Action button group' },
  { type: 'image',   label: 'Image Placeholder', description: 'Media / hero image' },
  { type: 'chart',   label: 'Chart',             description: 'Bar / line chart area' },
];

// ── Shared style ───────────────────────────────────────────────────────────────

const wire = 'border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg overflow-hidden select-none';

// ── Individual block renderers ─────────────────────────────────────────────────

function NavbarBlock() {
  return (
    <div className={`${wire} flex items-center gap-4 px-5`} style={{ height: 56 }}>
      <div className="w-24 h-7 bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500 font-mono shrink-0">
        LOGO
      </div>
      <div className="flex-1" />
      <div className="flex gap-5">
        {['Home', 'Features', 'Docs', 'Pricing'].map((l) => (
          <span key={l} className="text-xs text-gray-400 font-mono border-b border-gray-300 pb-px">
            {l}
          </span>
        ))}
      </div>
      <div className="w-20 h-8 bg-gray-400 rounded flex items-center justify-center text-xs text-white font-mono shrink-0">
        Sign up
      </div>
    </div>
  );
}

function SidebarBlock() {
  const items = ['Dashboard', 'Analytics', 'Users', 'Settings', 'Help'];
  return (
    <div className={`${wire} p-4 w-52`}>
      <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-3">
        Navigation
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={item}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded ${i === 0 ? 'bg-gray-200' : ''}`}
          >
            <div className="w-3.5 h-3.5 bg-gray-300 rounded-sm shrink-0" />
            <span className="text-xs text-gray-500 font-mono">{item}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400 font-mono">
        Section 2
      </div>
      <div className="mt-2 space-y-1">
        {['Reports', 'Exports'].map((item) => (
          <div key={item} className="flex items-center gap-2.5 px-2 py-1.5 rounded">
            <div className="w-3.5 h-3.5 bg-gray-300 rounded-sm shrink-0" />
            <span className="text-xs text-gray-500 font-mono">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableBlock() {
  const cols = ['ID', 'Name', 'Status', 'Date', 'Actions'];
  return (
    <div className={`${wire}`}>
      {/* Toolbar strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border-b border-gray-200">
        <div className="w-28 h-6 bg-gray-300 rounded text-xs text-gray-500 font-mono flex items-center justify-center">
          Search...
        </div>
        <div className="flex-1" />
        <div className="w-16 h-6 bg-gray-300 rounded" />
        <div className="w-16 h-6 bg-gray-400 rounded" />
      </div>
      {/* Header */}
      <div className="grid bg-gray-200" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((h) => (
          <div key={h} className="px-3 py-2 text-xs font-semibold text-gray-500 font-mono border-r border-gray-300 last:border-r-0">
            {h}
          </div>
        ))}
      </div>
      {/* Rows */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="grid border-t border-gray-200 hover:bg-gray-100 transition-colors"
          style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}
        >
          {cols.map((c, ci) => (
            <div key={ci} className="px-3 py-2.5 border-r border-gray-100 last:border-r-0">
              <div className="h-3 bg-gray-200 rounded" style={{ width: `${55 + Math.sin(row * ci) * 30}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FormBlock() {
  const fields = [
    { label: 'Full Name',      tall: false },
    { label: 'Email Address',  tall: false },
    { label: 'Subject',        tall: false },
    { label: 'Message',        tall: true  },
  ];
  return (
    <div className={`${wire} p-5 max-w-lg`}>
      <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-4">Form</div>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.label}>
            <div className="text-xs text-gray-500 font-mono mb-1">{f.label}</div>
            <div
              className="w-full border border-gray-300 rounded bg-white"
              style={{ height: f.tall ? 72 : 32 }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <div className="px-6 h-9 bg-gray-500 rounded flex items-center text-xs text-white font-mono cursor-default">
          Submit
        </div>
        <div className="px-6 h-9 border-2 border-gray-300 rounded flex items-center text-xs text-gray-400 font-mono cursor-default">
          Cancel
        </div>
      </div>
    </div>
  );
}

function ButtonBlock() {
  return (
    <div className={`${wire} p-5`}>
      <div className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-4">Buttons</div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="px-6 h-9 bg-gray-500 rounded flex items-center text-xs text-white font-mono">Primary</div>
        <div className="px-6 h-9 border-2 border-gray-400 rounded flex items-center text-xs text-gray-500 font-mono">Secondary</div>
        <div className="px-6 h-9 border-2 border-dashed border-gray-300 rounded flex items-center text-xs text-gray-400 font-mono">Ghost</div>
        <div className="px-4 h-9 bg-gray-200 rounded flex items-center text-xs text-gray-500 font-mono">Outline</div>
        <div className="w-9 h-9 bg-gray-500 rounded-full flex items-center justify-center text-sm text-white font-bold">+</div>
        <div className="w-9 h-9 border-2 border-gray-300 rounded-full flex items-center justify-center text-sm text-gray-400">×</div>
      </div>
    </div>
  );
}

function ImageBlock() {
  return (
    <div className={`${wire} relative`} style={{ height: 200 }}>
      <svg className="absolute inset-0 w-full h-full">
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d1d5db" strokeWidth="1.5" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#d1d5db" strokeWidth="1.5" />
        <rect x="4" y="4" width="calc(100% - 8)" height="calc(100% - 8)" fill="none" stroke="#e5e7eb" strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="text-xs text-gray-400 font-mono bg-gray-50/80 px-2 py-0.5 rounded">
          Image Placeholder
        </span>
      </div>
    </div>
  );
}

function ChartBlock() {
  const bars   = [42, 68, 55, 83, 60, 75, 38, 90, 65, 72, 50, 80];
  const line   = [40, 55, 50, 70, 65, 80, 75, 85, 70, 90, 80, 95];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className={`${wire} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Chart Title</span>
        <div className="flex gap-3 text-xs text-gray-400 font-mono">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 rounded-sm inline-block" />Series A</span>
          <span className="flex items-center gap-1"><span className="w-3 h-px bg-gray-400 inline-block" />Series B</span>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex gap-0.5 items-end border-b border-l border-gray-300 relative" style={{ height: 120, paddingLeft: 28 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 inset-y-0 flex flex-col justify-between pb-0 text-xs text-gray-300 font-mono leading-none" style={{ width: 24 }}>
          {['100', '75', '50', '25', '0'].map((v) => (
            <span key={v} className="text-right pr-1">{v}</span>
          ))}
        </div>
        {/* Bars + line overlay */}
        <svg className="flex-1 h-full overflow-visible" preserveAspectRatio="none">
          {bars.map((h, i) => (
            <rect
              key={i}
              x={`${(i / bars.length) * 100 + 0.5}%`}
              y={`${100 - h}%`}
              width={`${88 / bars.length}%`}
              height={`${h}%`}
              fill="#d1d5db"
              rx="1"
            />
          ))}
          <polyline
            points={line.map((v, i) => `${((i / (line.length - 1)) * 100).toFixed(1)}%,${100 - v}%`).join(' ')}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {line.map((v, i) => (
            <circle
              key={i}
              cx={`${((i / (line.length - 1)) * 100).toFixed(1)}%`}
              cy={`${100 - v}%`}
              r="2.5"
              fill="white"
              stroke="#9ca3af"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex pl-7 mt-1">
        {months.map((m) => (
          <div key={m} className="flex-1 text-center text-xs text-gray-300 font-mono">{m}</div>
        ))}
      </div>
    </div>
  );
}

// ── Renderer map ───────────────────────────────────────────────────────────────

const RENDERERS = {
  navbar:  NavbarBlock,
  sidebar: SidebarBlock,
  table:   TableBlock,
  form:    FormBlock,
  button:  ButtonBlock,
  image:   ImageBlock,
  chart:   ChartBlock,
};

export function renderBlock(type) {
  const Component = RENDERERS[type];
  return Component
    ? <Component />
    : <div className="h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 font-mono">{type}</div>;
}
