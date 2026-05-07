import { useEffect, useRef, useState } from 'react';
import { useProject } from '../project/ProjectContext';
import {
  getIntegrations,
  saveIntegrations,
  getAuthUser,
  repoExists,
  createRepo,
  pushFilesToRepo,
} from './githubApi';
import { buildFileManifest } from './stateToMarkdown';

// ── Small sub-components ──────────────────────────────────────────────────────

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-700/60 border border-gray-600/60 rounded-xl flex items-center justify-center text-lg shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  const isError   = status.startsWith('✗');
  const isSuccess = status.startsWith('✓');
  return (
    <div className={`text-xs px-3 py-2 rounded-lg font-mono leading-snug ${
      isSuccess ? 'bg-emerald-900/30 border border-emerald-700/40 text-emerald-400' :
      isError   ? 'bg-red-900/30 border border-red-700/40 text-red-400' :
                  'bg-indigo-900/30 border border-indigo-700/40 text-indigo-300'
    }`}>
      {status}
    </div>
  );
}

function SecretInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-3 py-2 pr-9 text-xs font-mono focus:outline-none focus:border-indigo-500 transition-colors"
      />
      <button
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-xs"
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExportDeployHub({ onClose }) {
  const { activeProject, getToolState } = useProject();

  // Integrations settings
  const [ghToken,      setGhToken]      = useState('');
  const [vercelToken,  setVercelToken]  = useState('');
  const [saveMsg,      setSaveMsg]      = useState(null);

  // GitHub push state
  const [repoName,     setRepoName]     = useState('');
  const [commitMsg,    setCommitMsg]    = useState('docs: update architecture from DevTools');
  const [isPrivate,    setIsPrivate]    = useState(false);
  const [pushStatus,   setPushStatus]   = useState('');
  const [pushing,      setPushing]      = useState(false);
  const [pushedRepo,   setPushedRepo]   = useState(null); // { owner, repo, url }

  // Load tokens on open
  useEffect(() => {
    const s = getIntegrations();
    if (s.githubPAT)    setGhToken(s.githubPAT);
    if (s.vercelToken)  setVercelToken(s.vercelToken);
    if (activeProject)  setRepoName(activeProject.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  }, []);

  // Collect all tool states from context
  function collectStates() {
    return {
      visualizer: getToolState('visualizer') ?? {},
      wireframer:  getToolState('wireframer')  ?? {},
      journey:     getToolState('journey')     ?? {},
      contract:    getToolState('contract')    ?? {},
      tree:        getToolState('tree')        ?? {},
    };
  }

  // ── Local backup (JSON download) ──────────────────────────────────────────
  function handleDownload() {
    const states   = collectStates();
    const payload  = {
      projectName: activeProject ?? 'devtools-export',
      exportedAt:  new Date().toISOString(),
      toolStates:  states,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(activeProject ?? 'devtools').replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Save integration tokens ───────────────────────────────────────────────
  function handleSaveTokens() {
    saveIntegrations({ githubPAT: ghToken.trim(), vercelToken: vercelToken.trim() });
    setSaveMsg('✓ Saved');
    setTimeout(() => setSaveMsg(null), 2000);
  }

  // ── GitHub push ───────────────────────────────────────────────────────────
  async function handlePush() {
    if (!ghToken.trim()) { setPushStatus('✗ No GitHub token — configure one in the Integrations section above.'); return; }
    if (!repoName.trim()) { setPushStatus('✗ Enter a repository name.'); return; }

    setPushing(true);
    setPushedRepo(null);

    try {
      setPushStatus('Connecting to GitHub…');
      const user  = await getAuthUser(ghToken.trim());
      const owner = user.login;

      setPushStatus(`Checking repository ${owner}/${repoName}…`);
      const exists = await repoExists(ghToken.trim(), owner, repoName.trim());

      if (!exists) {
        setPushStatus(`Creating repository ${repoName}…`);
        await createRepo(
          ghToken.trim(),
          repoName.trim(),
          `Architecture docs for ${activeProject ?? repoName} — created by DevTools`,
          isPrivate
        );
        // Brief pause to let GitHub initialise the repo
        await new Promise((r) => setTimeout(r, 1200));
      }

      // Build documentation files
      setPushStatus('Generating documentation files…');
      const states  = collectStates();
      const files   = buildFileManifest(activeProject ?? repoName, states);

      // Push as a single commit
      await pushFilesToRepo(
        ghToken.trim(),
        owner,
        repoName.trim(),
        files,
        commitMsg.trim() || 'docs: update architecture from DevTools',
        (msg) => setPushStatus(msg)
      );

      const repoUrl = `https://github.com/${owner}/${repoName}`;
      setPushedRepo({ owner, repo: repoName, url: repoUrl });
      setPushStatus(`✓ Successfully pushed ${files.length} files to ${repoUrl}`);
    } catch (err) {
      const msg = err.message ?? 'Unknown error';
      if (err.status === 401) {
        setPushStatus('✗ Token rejected — check your GitHub PAT has "repo" scope.');
      } else if (err.status === 422) {
        setPushStatus('✗ Repository name already taken or invalid characters.');
      } else {
        setPushStatus(`✗ ${msg}`);
      }
    } finally {
      setPushing(false);
    }
  }

  // ── File manifest preview ─────────────────────────────────────────────────
  const states     = collectStates();
  const hasData    = {
    visualizer: !!(states.visualizer?.nodes?.length),
    wireframer:  !!(states.wireframer?.canvasItems?.length),
    journey:     !!(states.journey?.nodes?.length),
    contract:    !!(states.contract?.fields?.length),
    tree:        !!(states.tree?.nodes?.length),
  };
  const activeTools = Object.entries(hasData).filter(([, v]) => v).map(([k]) => k);

  const filePreview = [
    'README.md',
    hasData.visualizer ? 'DATABASE_SCHEMA.md' : null,
    hasData.wireframer  ? 'UI_WIREFRAME.md'    : null,
    hasData.journey     ? 'USER_JOURNEY.md'    : null,
    hasData.contract    ? 'API_CONTRACT.md'    : null,
    hasData.tree        ? 'COMPONENT_TREE.md'  : null,
    'devtools-state.json',
  ].filter(Boolean);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700/60 shrink-0">
          <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" className="w-5 h-5">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-base leading-tight">Export & Deploy Hub</h2>
            <p className="text-gray-500 text-xs mt-0.5 truncate">
              {activeProject
                ? `Project: ${activeProject} · ${activeTools.length} tool${activeTools.length !== 1 ? 's' : ''} with data`
                : 'No active project — create one first'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none ml-2">×</button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-5">

          {/* ── LEFT COLUMN ────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Local backup */}
            <SectionCard icon="💾" title="Local Backup" subtitle="Download everything as a .json file">
              <p className="text-xs text-gray-500 leading-relaxed">
                Save a complete snapshot of your project to your machine. Use it for offline backup, Dropbox sync, or to re-import into DevTools later.
              </p>

              {/* File list */}
              <div className="bg-gray-900/60 rounded-xl p-3 space-y-1.5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Includes</p>
                {filePreview.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                    <span className="text-emerald-500 text-xs">✓</span>
                    {f}
                  </div>
                ))}
                {activeTools.length === 0 && (
                  <p className="text-xs text-gray-600 italic">Add content to your tools first.</p>
                )}
              </div>

              <button
                onClick={handleDownload}
                disabled={!activeProject}
                className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 border border-gray-600 text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                Download .json
              </button>
            </SectionCard>

            {/* Integrations */}
            <SectionCard icon="🔑" title="Integration Tokens" subtitle="Stored only in your browser's localStorage">
              <div className="space-y-3">
                {/* GitHub PAT */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">GitHub PAT</label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=DevTools"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Create token ↗
                    </a>
                  </div>
                  <SecretInput
                    value={ghToken}
                    onChange={setGhToken}
                    placeholder="ghp_… (needs 'repo' scope)"
                  />
                </div>

                {/* Vercel token (optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Vercel Token <span className="text-gray-600 normal-case font-normal">(optional)</span>
                    </label>
                    <a
                      href="https://vercel.com/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Create token ↗
                    </a>
                  </div>
                  <SecretInput
                    value={vercelToken}
                    onChange={setVercelToken}
                    placeholder="Not required for one-click deploy"
                  />
                </div>

                {saveMsg && <StatusBadge status={saveMsg} />}

                <button
                  onClick={handleSaveTokens}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  Save Tokens
                </button>
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* GitHub push */}
            <SectionCard
              icon="🐙"
              title="Push to GitHub"
              subtitle={ghToken ? '✓ Token configured' : '⚠ Add token in Integrations'}
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Repository Name</label>
                  <input
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-_.]/g, ''))}
                    placeholder="my-project-architecture"
                    className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Commit Message</label>
                  <input
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder="docs: update architecture"
                    className="w-full bg-gray-900 text-gray-100 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => setIsPrivate((v) => !v)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${isPrivate ? 'bg-indigo-600' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs text-gray-400">Private repository</span>
                </label>

                {pushStatus && <StatusBadge status={pushStatus} />}

                <button
                  onClick={handlePush}
                  disabled={pushing || !ghToken.trim() || !repoName.trim()}
                  className={`w-full text-sm font-semibold py-2.5 rounded-xl border transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                    pushing
                      ? 'bg-indigo-900/30 border-indigo-700/40 text-indigo-400 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-600 text-white'
                  }`}
                >
                  {pushing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Pushing…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
                      </svg>
                      Push to GitHub
                    </>
                  )}
                </button>
              </div>
            </SectionCard>

            {/* Deploy */}
            <SectionCard
              icon="🚀"
              title="One-Click Deploy"
              subtitle={pushedRepo ? `From: ${pushedRepo.url}` : 'Push to GitHub first, then deploy'}
            >
              {pushedRepo ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Your repo is live on GitHub. Deploy it as a documentation site with one click:
                  </p>

                  {/* Vercel */}
                  <a
                    href={`https://vercel.com/new/clone?repository-url=${encodeURIComponent(pushedRepo.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-black hover:bg-gray-950 border border-gray-700 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path d="M12 2L2 19.5h20L12 2z"/>
                    </svg>
                    <span>Deploy on Vercel</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 ml-auto text-gray-500">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                    </svg>
                  </a>

                  {/* Netlify */}
                  <a
                    href={`https://app.netlify.com/start/deploy?repository=${encodeURIComponent(pushedRepo.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-teal-950/60 hover:bg-teal-950 border border-teal-800/50 text-teal-300 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path d="M16.5 6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18 19.5a3 3 0 00-2.986-3H8.986A3 3 0 006 19.5V21h12v-1.5z"/>
                    </svg>
                    <span>Deploy on Netlify</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 ml-auto opacity-60">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                    </svg>
                  </a>

                  {/* Open on GitHub */}
                  <a
                    href={pushedRepo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                    </svg>
                    <span>View on GitHub</span>
                    <span className="ml-auto text-xs text-gray-500 font-mono truncate">{pushedRepo.owner}/{pushedRepo.repo}</span>
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    After a successful GitHub push, deploy buttons for Vercel and Netlify will appear here.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 bg-gray-800/40 border border-gray-700/40 rounded-xl flex items-center justify-center text-xs text-gray-700">▲ Vercel</div>
                    <div className="flex-1 h-10 bg-gray-800/40 border border-gray-700/40 rounded-xl flex items-center justify-center text-xs text-gray-700">◆ Netlify</div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
