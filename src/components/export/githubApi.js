// ── Integration token storage ─────────────────────────────────────────────────

const INTEGRATIONS_KEY = 'devtools_integrations';

export function getIntegrations() {
  try { return JSON.parse(localStorage.getItem(INTEGRATIONS_KEY)) ?? {}; }
  catch { return {}; }
}

export function saveIntegrations(data) {
  localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(data));
}

// ── GitHub REST API helper ────────────────────────────────────────────────────

const GH = 'https://api.github.com';

function ghHeaders(token) {
  return {
    'Authorization':        `Bearer ${token}`,
    'Accept':               'application/vnd.github+json',
    'Content-Type':         'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghFetch(token, path, options = {}) {
  const res = await fetch(`${GH}${path}`, {
    ...options,
    headers: { ...ghHeaders(token), ...(options.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message ?? `GitHub API error ${res.status}`;
    const err = new Error(msg);
    err.status  = res.status;
    err.ghError = data;
    throw err;
  }
  return data;
}

// ── Public API functions ──────────────────────────────────────────────────────

/** Verify the token and return the authenticated user's login + name. */
export async function getAuthUser(token) {
  return ghFetch(token, '/user');
}

/** Returns true if the repo exists and is accessible with the given token. */
export async function repoExists(token, owner, repo) {
  const res = await fetch(`${GH}/repos/${owner}/${repo}`, { headers: ghHeaders(token) });
  return res.status === 200;
}

/**
 * Create a new GitHub repository.
 * @returns The created repo object (contains .html_url, .full_name, etc.)
 */
export async function createRepo(token, name, description = 'Created by DevTools', isPrivate = false) {
  return ghFetch(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name, description, private: isPrivate, auto_init: false }),
  });
}

/**
 * Check whether the repo has any commits (i.e. is initialised).
 * Returns the SHA of the latest commit on `main`, or null if the repo is empty.
 */
async function getHeadSHA(token, owner, repo) {
  const res = await fetch(`${GH}/repos/${owner}/${repo}/git/refs/heads/main`, {
    headers: ghHeaders(token),
  });
  if (res.status === 404 || res.status === 409) return null; // empty / no main branch
  if (!res.ok) return null;
  const data = await res.json();
  return data?.object?.sha ?? null;
}

/**
 * Create blobs for all files, then build a single git tree and commit.
 * Creates an initial commit if the repo is empty, or a follow-up commit otherwise.
 *
 * @param {string}  token   GitHub PAT
 * @param {string}  owner   GitHub username
 * @param {string}  repo    Repository name
 * @param {Array<{path:string, content:string}>} files
 * @param {string}  message Commit message
 * @param {function} onProgress  Called with a status string during the process
 */
export async function pushFilesToRepo(token, owner, repo, files, message, onProgress = () => {}) {
  onProgress('Creating file blobs…');

  // 1. Create a blob for each file (using utf-8 so we can pass plain text)
  const blobs = await Promise.all(
    files.map(async ({ path, content }) => {
      const blob = await ghFetch(token, `/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'utf-8' }),
      });
      return { path, sha: blob.sha };
    })
  );

  onProgress('Building commit tree…');

  // 2. Look up the current HEAD to know if this is an initial commit
  const headSHA = await getHeadSHA(token, owner, repo);

  // 3. Create the new tree
  const treeBody = {
    tree: blobs.map(({ path, sha }) => ({
      path,
      mode: '100644',
      type: 'blob',
      sha,
    })),
  };
  if (headSHA) {
    // Get the base tree SHA from the current commit
    const parentCommit = await ghFetch(token, `/repos/${owner}/${repo}/git/commits/${headSHA}`);
    treeBody.base_tree = parentCommit.tree.sha;
  }
  const tree = await ghFetch(token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify(treeBody),
  });

  onProgress('Creating commit…');

  // 4. Create the commit
  const commitBody = { message, tree: tree.sha, parents: headSHA ? [headSHA] : [] };
  const commit = await ghFetch(token, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify(commitBody),
  });

  onProgress('Updating branch reference…');

  // 5. Create or update the main branch reference
  if (headSHA) {
    // Update existing ref
    await ghFetch(token, `/repos/${owner}/${repo}/git/refs/heads/main`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } else {
    // Create the ref (initial commit)
    await ghFetch(token, `/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'refs/heads/main', sha: commit.sha }),
    });
  }

  return { commitSHA: commit.sha, fileCount: files.length };
}
