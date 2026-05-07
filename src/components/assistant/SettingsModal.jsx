import { useEffect, useState } from 'react';
import { AI_PROVIDERS, generateTemplateFromAI, getAISettings, saveAISettings } from './aiEngine';

export default function SettingsModal({ onClose }) {
  const [provider,  setProvider]  = useState('gemini');
  const [apiKey,    setApiKey]    = useState('');
  const [model,     setModel]     = useState('');
  const [showKey,   setShowKey]   = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [testMsg,   setTestMsg]   = useState(null); // { ok: bool, text: string }
  const [saved,     setSaved]     = useState(false);

  // Load existing settings on open
  useEffect(() => {
    const s = getAISettings();
    if (s.provider) setProvider(s.provider);
    if (s.apiKey)   setApiKey(s.apiKey);
    if (s.model)    setModel(s.model);
  }, []);

  // Reset model selection when provider changes
  function handleProviderChange(p) {
    setProvider(p);
    setModel('');
    setTestMsg(null);
  }

  const cfg = AI_PROVIDERS[provider];

  function handleSave() {
    saveAISettings({ provider, apiKey: apiKey.trim(), model: model || cfg.defaultModel });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  }

  async function handleTest() {
    if (!apiKey.trim()) { setTestMsg({ ok: false, text: 'Enter an API key first.' }); return; }
    setTesting(true);
    setTestMsg(null);
    try {
      // Temporarily persist settings so the engine can read them
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/60">
          <div>
            <h2 className="text-white font-bold text-sm">AI Settings</h2>
            <p className="text-gray-500 text-xs mt-0.5">Configure your BYOK API provider</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

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
                  <span className="block text-xs opacity-60 font-normal mt-0.5">{p.name.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Get a free key:{' '}
              <a
                href={cfg.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                {cfg.keyUrl.replace('https://', '')}
              </a>
            </p>
          </div>

          {/* API Key input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={cfg.placeholder}
                spellCheck={false}
                className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                title={showKey ? 'Hide' : 'Show'}
              >
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <span className="text-yellow-600">⚠</span>
              Your key is stored only in your browser's localStorage and never sent anywhere except directly to the AI provider.
            </p>
          </div>

          {/* Model selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Model</label>
            <select
              value={model || cfg.defaultModel}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {cfg.models.map((m) => (
                <option key={m} value={m} className="bg-gray-900">{m}</option>
              ))}
            </select>
          </div>

          {/* Test result */}
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

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-700/60">
          <button
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 border border-gray-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className={`text-xs font-semibold px-5 py-2 rounded-lg border transition-all disabled:opacity-40 ${
              saved
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600'
            }`}
          >
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
