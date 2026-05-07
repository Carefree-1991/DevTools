import { useState } from 'react';
import { ProjectProvider } from './components/project/ProjectContext';
import ProjectHeader from './components/project/ProjectHeader';
import DataVisualizerApp from './components/DataVisualizerApp';
import WireframerApp from './components/wireframer/WireframerApp';
import JourneyMapperApp from './components/journeyMapper/JourneyMapperApp';
import JsonContractApp from './components/jsonContract/JsonContractApp';
import TreeVisualizerApp from './components/treeVisualizer/TreeVisualizerApp';
import HelpAssistant from './components/assistant/HelpAssistant';
import ContextCompilerApp from './components/contextCompiler/ContextCompilerApp';

const TABS = [
  { id: 'visualizer', label: 'Data Visualizer'      },
  { id: 'wireframer', label: 'UI Wireframer'         },
  { id: 'journey',    label: 'Journey Mapper'        },
  { id: 'contract',   label: 'JSON Contract Builder' },
  { id: 'tree',       label: 'Component Tree'        },
  { id: 'compiler',   label: '✦ Context Compiler'   },
];

function DevTools() {
  const [activeTab, setActiveTab] = useState('visualizer');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* ── Project header (above tabs) ──────────────────────────────────── */}
      <ProjectHeader />

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-0.5 bg-gray-900 border-b border-gray-700/60 px-4 shrink-0">
        <div className="flex items-center gap-2 mr-4 pb-3 pt-3">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-indigo-400" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="8" height="8" rx="1.5"/>
            <rect x="11" y="1" width="8" height="8" rx="1.5" opacity=".5"/>
            <rect x="1" y="11" width="8" height="8" rx="1.5" opacity=".5"/>
            <rect x="11" y="11" width="8" height="8" rx="1.5"/>
          </svg>
          <span className="text-xs font-semibold text-gray-400 tracking-wide select-none">DevTools</span>
        </div>

        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative px-5 py-3 text-sm font-medium transition-colors select-none rounded-t-md
                ${active
                  ? 'text-white bg-gray-950 border-t border-l border-r border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}
              `}
            >
              {tab.label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-px bg-indigo-400" />}
            </button>
          );
        })}
      </div>

      {/* ── Tool area (all tabs stay mounted to preserve state) ─────────── */}
      <div className="flex-1 overflow-hidden">
        <div className={`h-full ${activeTab === 'visualizer' ? 'block' : 'hidden'}`}><DataVisualizerApp /></div>
        <div className={`h-full ${activeTab === 'wireframer' ? 'block' : 'hidden'}`}><WireframerApp /></div>
        <div className={`h-full ${activeTab === 'journey'    ? 'block' : 'hidden'}`}><JourneyMapperApp /></div>
        <div className={`h-full ${activeTab === 'contract'   ? 'block' : 'hidden'}`}><JsonContractApp /></div>
        <div className={`h-full ${activeTab === 'tree'       ? 'block' : 'hidden'}`}><TreeVisualizerApp /></div>
        <div className={`h-full ${activeTab === 'compiler'   ? 'block' : 'hidden'}`}><ContextCompilerApp /></div>
      </div>

      {/* ── AI assistant FAB + drawer (always rendered, tab-aware) ──────── */}
      <HelpAssistant activeTab={activeTab} />
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <DevTools />
    </ProjectProvider>
  );
}
