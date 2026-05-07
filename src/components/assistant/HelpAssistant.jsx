import { useEffect, useRef, useState } from 'react';
import {
  TAB_CONFIGS,
  generateTemplateFromAI,
  summarizeGeneration,
  getAISettings,
} from './aiEngine';
import SettingsModal from './SettingsModal';
import { useProject } from '../project/ProjectContext';

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 bg-gray-800 rounded-2xl rounded-bl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] text-sm leading-relaxed px-3 py-2.5 rounded-2xl ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : msg.type === 'success'
            ? 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 rounded-bl-sm'
            : msg.type === 'error'
            ? 'bg-red-900/30 border border-red-700/50 text-red-300 rounded-bl-sm'
            : 'bg-gray-800 text-gray-200 rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HelpAssistant({ activeTab }) {
  const { injectToolState, getToolState } = useProject();
  const [open,          setOpen]          = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  const tabCfg     = TAB_CONFIGS[activeTab] ?? TAB_CONFIGS.visualizer;
  const hasApiKey  = !!getAISettings().apiKey;

  // Reset conversation when the active tab changes
  useEffect(() => {
    setMessages([{
      role:    'assistant',
      type:    'text',
      content: tabCfg.greeting,
    }]);
    setInput('');
  }, [activeTab]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Listen for Context Compiler "Send to AI" events
  useEffect(() => {
    function onSendToAssistant(e) {
      setInput(e.detail?.prompt ?? '');
      setOpen(true);
    }
    window.addEventListener('devtools:sendToAssistant', onSendToAssistant);
    return () => window.removeEventListener('devtools:sendToAssistant', onSendToAssistant);
  }, []);

  async function handleSend(text) {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    setInput('');

    if (!hasApiKey) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', type: 'text', content: prompt },
        { role: 'assistant', type: 'error', content: 'No API key configured. Click the ⚙ Settings icon in the toolbar to add your key.' },
      ]);
      return;
    }

    const userMsg = { role: 'user', type: 'text', content: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build the messages array (only user-turn messages for the API)
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

      // Include current canvas state so the AI can build on it
      const currentState = getToolState(activeTab);

      const generated = await generateTemplateFromAI(apiMessages, activeTab, currentState);

      // Inject into the canvas
      injectToolState(activeTab, generated);

      const summary = summarizeGeneration(activeTab, generated);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'success', content: `✓ Applied to canvas — ${summary}` },
      ]);
    } catch (err) {
      let msg = err.message || 'Something went wrong.';
      if (err.noKey) {
        msg = 'No API key found. Open ⚙ Settings to add yours.';
      } else if (msg.includes('parse') || msg.includes('JSON')) {
        msg = 'The AI returned an unexpected format. Try rephrasing your request.';
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'error', content: `✗ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Settings modal ──────────────────────────────────────────────── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="AI Auto-Builder"
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full shadow-2xl
          flex items-center justify-center
          transition-all duration-200
          ${open
            ? 'bg-gray-700 border border-gray-600 rotate-45'
            : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-110 border border-indigo-500'
          }
          ${!hasApiKey && !open ? 'ring-2 ring-amber-400/60 ring-offset-2 ring-offset-gray-950' : ''}
        `}
      >
        {open ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
            <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-white">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* ── Drawer ──────────────────────────────────────────────────────── */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 z-40
          w-[380px] bg-gray-900 border-l border-gray-700/60
          flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-700/60 shrink-0">
          <div className="w-7 h-7 bg-indigo-600/20 border border-indigo-500/40 rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" className="w-4 h-4">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">AI Auto-Builder</p>
            <p className="text-gray-500 text-xs truncate">{tabCfg.label}</p>
          </div>

          {/* Settings gear */}
          <button
            onClick={() => setShowSettings(true)}
            title="AI Settings"
            className={`
              w-7 h-7 rounded-lg flex items-center justify-center transition-colors
              ${hasApiKey
                ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                : 'text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20'
              }
            `}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
          </button>

          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 flex items-center justify-center transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* No API key banner */}
        {!hasApiKey && (
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 mx-3 mt-3 px-3 py-2.5 bg-amber-900/20 border border-amber-700/40 rounded-xl text-xs text-amber-400 hover:bg-amber-900/30 transition-colors text-left"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>No API key configured — click to add yours</span>
          </button>
        )}

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <TypingDots />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick-start prompts (show only when conversation is fresh) */}
        {messages.length <= 1 && !loading && (
          <div className="px-4 pb-3 space-y-2 shrink-0">
            <p className="text-xs text-gray-600">Try an example:</p>
            {tabCfg.prompts.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="w-full text-left text-xs text-gray-400 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-gray-600 rounded-xl px-3 py-2.5 transition-colors leading-snug"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-700/60 shrink-0">
          <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-indigo-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Describe what to build…`}
              disabled={loading}
              rows={1}
              className="flex-1 bg-transparent text-gray-200 text-sm resize-none focus:outline-none placeholder:text-gray-600 max-h-32 leading-relaxed"
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="shrink-0 w-7 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors"
              title="Send (Enter)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-700 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Drawer backdrop (mobile / touch) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
