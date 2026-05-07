import { useEffect, useState } from 'react';
import { AI_PROVIDERS, generateTemplateFromAI, getAISettings, saveAISettings } from './aiEngine';
import { getIntegrations, saveIntegrations } from '../export/githubApi';

const TABS = [
  { id: 'ai',           label: 'AI Provider'   },
  { id: 'integrations', label: 'Integrations'  },
];

export default function SettingsModal({ onClose, defaultTab = 'ai' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // ── AI Provider state ────────────────────────────────────────────────────
  const [provider, setProvider] = useState('gemini');
  const [apiKey,   setApiKey]   = useState('');
  const [model,    setModel]    = useState('');
  const [showKey,  setShowKey]  = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [testMsg,  setTestMsg]  = useState(null);
  const [aiSaved,  setAiSaved]  = useState(false);

  // ── Integrations state ───────────────────────────────────────────────────
  const [ghToken,      setGhToken]      = useState('');
  const [vercelToken,  setVercelToken]  = useState('');
  const [showGhKey,    setShowGhKey]    = useState(false);
  const [showVercel,   setShowVercel]   = useState(false);
  const [intSaved,     setIntSaved]     = useState(false);

  // Load on mount
  useEffect(() => {
    const ai  = getAISettings();
    const int = getIntegrations();
    if (ai.provider)     setProvider(ai.provider);
    if (ai.apiKey)       setApiKey(ai.apiKey);
    if (ai.model)        setModel(ai.model);
    if (int.githubPAT)   setGhToken(int.githubPAT);
    if (int.vercelToken) setVercelToken(int.vercelToken);
  }, []);

  const cfg = AI_PROVIDERS[provider];

  // ── AI handlers ──────────────────────────────────────────────────────────
  function handleProviderChange(p) {
    setProvider(p);
    setModel('');
    setTestMsg(null);
  }

  function handleSaveAI() {
    saveAISettings({ provider, apiKey: apiKey.trim(), model: model || cfg.defaultModel });
    setAiSaved(true);
    setTimeout(() => { setAiSaved(false); onClose(); }, 1200);
  }

  async function handleTest() {
    if (!apiKey.trim()) { setTestMsg({ ok: false, text: 'Enter an API key first.' }); return; }
    setTesting(true);
    setTestMsg(null);
    try {
      saveAISettings({ provider, apiKey: apiKey.trim(), model: model || cfg.defaultModel });
      await generateTemplateFromAI(
        [{ role: 'user', content: 'Return exactly: {"ok":true}' }],
        'wireframer'
      );
      setTestMsg({ ok: true, text: 'Connection successful!' });
    } catch (err) {
      setTestMsg({ ok: false, text: err.message || 'Connection failed.' });
    } finally {
      setTesting(false);
    }
  }

  // ── Integrations handlers ────────────────────────────────────────────────
  function handleSaveIntegrations() {
    saveIntegrations({ githubPAT: ghToken.trim(), vercelToken: vercelToken.trim() });
    setIntSaved(true);
    setTimeout(() => { setIntSaved(false); onClose(); }, 1200);
  }

  // ── Shared ───────────────────────────────────────────────────────────────
  function SecretInput({ value, onChange, show, onToggle, placeholder }) {
    return (
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/60">
          <div>
            <h2 className="text-white font-bold text-sm">Settings</h2>
            <p className="text-gray-500 text-xs mt-0.5">API keys stored only in your browser</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-700/60 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-4 text-xs font-medium transition-colors -mb-px border-b-2 ${
                activeTab === tab.id
                  ? 'text-white border-indigo-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── AI Provider tab ────────────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <>
            <div className="px-6 py-5 space-y-5 overflow-y-auto">

              {/* Provider selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(AI_PROVIDERS).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => handleProviderChange(key)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-center ${
                        provider === key
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                      }`}
                    >
                      {p.name.split(' ')[0]}
                      <span className="block opacity-60 font-normal mt-0.5">{p.name.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600">
                  Get a free key:{' '}
                  <a href={cfg.keyUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    {cfg.keyUrl.replace('https://', '')}
                  </a>
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">API Key</label>
                <SecretInput
                  value={apiKey}
                  onChange={setApiKey}
                  show={showKey}
                  onToggle={() => setShowKey((v) => !v)}
                  placeholder={cfg.placeholder}
                />
                <p className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-yellow-600 mt-px shrink-0">⚠</span>
                  Stored only in localStorage. Never sent anywhere except directly to the AI provider.
                </p>
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Model</label>
                <select
                  value={model || cfg.defaultModel}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {cfg.models.map((m) => <option key={m} value={m} className="bg-gray-900">{m}</option>)}
                </select>
              </div>

              {testMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg font-mono ${
                  testMsg.ok
                    ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-400'
                    : 'bg-red-900/30 border border-red-700/50 text-red-400'
                }`}>
                  {testMsg.ok ? '✓ ' : '✗ '}{testMsg.text}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-700/60">
              <button
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 border border-gray-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
              <div className="flex-1" />
              <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveAI}
                disabled={!apiKey.trim()}
                className={`text-xs font-semibold px-5 py-2 rounded-lg border transition-all disabled:opacity-40 ${
                  aiSaved
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600'
                }`}
              >
                {aiSaved ? '✓ Saved' : 'Save Settings'}
              </button>
            </div>
          </>
        )}

        {/* ── Integrations tab ───────────────────────────────────────────── */}
        {activeTab === 'integrations' && (
          <>
            <div className="px-6 py-5 space-y-5 overflow-y-auto">

              {/* GitHub PAT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">GitHub Personal Access Token</label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=DevTools"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Create ↗
                  </a>
                </div>
                <SecretInput
                  value={ghToken}
                  onChange={setGhToken}
                  show={showGhKey}
                  onToggle={() => setShowGhKey((v) => !v)}
                  placeholder="ghp_…"
                />
                <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-400">Required scopes:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['repo', 'workflow'].map((s) => (
                      <span key={s} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md font-mono">{s}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Used to create repos and push commits via the GitHub REST API.</p>
                </div>
              </div>

              {/* Vercel token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Vercel API Token
                    <span className="ml-1.5 text-gray-600 normal-case font-normal">(optional)</span>
                  </label>
                  <a
                    href="https://vercel.com/account/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Create ↗
                  </a>
                </div>
                <SecretInput
                  value={vercelToken}
                  onChange={setVercelToken}
                  show={showVercel}
                  onToggle={() => setShowVercel((v) => !v)}
                  placeholder="Not required for one-click deploy links"
                />
                <p className="text-xs text-gray-600">
                  The Export Hub generates a Vercel import URL from your GitHub repo — no Vercel token needed for that flow.
                </p>
              </div>

              <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3">
                <p className="text-xs text-indigo-300 font-semibold mb-1">Privacy note</p>
                <p className="text-xs text-indigo-400/70 leading-relaxed">
                  All tokens are stored only in <code className="font-mono">localStorage</code> on your device.
                  They are sent directly to GitHub and Vercel APIs — never to any intermediary server.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-700/60">
              <div className="flex-1" />
              <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveIntegrations}
                className={`text-xs font-semibold px-5 py-2 rounded-lg border transition-all ${
                  intSaved
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600'
                }`}
              >
                {intSaved ? '✓ Saved' : 'Save Tokens'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
