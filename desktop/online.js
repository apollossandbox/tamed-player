// Compass online, phase 1: Google sign-in and a profile saved in Firebase.
//
// How sign-in works (the way Google requires for desktop apps):
//   1. Compass opens the system browser at Google's sign-in page (OAuth 2.0 with PKCE).
//   2. Google redirects back to a one-time local address (http://127.0.0.1:<random port>) that Compass listens on.
//   3. Compass trades the code for a Google ID token, then signs in to Firebase Authentication with it.
//   4. The Firebase refresh token is kept encrypted with the operating system's key store (safeStorage).
// The profile lives in Firestore at users/<uid>; the rules in backend/firestore.rules let only its owner read or write it.
//
// Settings come from online.json next to this file (see backend/SETUP.md). Without it, online features stay hidden.
const { app, shell, safeStorage } = require('electron');
const path = require('path'), fs = require('fs'), http = require('http'), crypto = require('crypto');

const CFG_FILE = path.join(__dirname, 'online.json');
const URLS = { // overridable for tests only
  auth: process.env.COMPASS_GOOGLE_AUTH || 'https://accounts.google.com/o/oauth2/v2/auth',
  token: process.env.COMPASS_GOOGLE_TOKEN || 'https://oauth2.googleapis.com/token',
  idp: process.env.COMPASS_FB_IDP || 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp',
  refresh: process.env.COMPASS_FB_REFRESH || 'https://securetoken.googleapis.com/v1/token',
  firestore: process.env.COMPASS_FIRESTORE || 'https://firestore.googleapis.com/v1'
};
function config() {
  try { const c = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); return c.googleClientId && c.firebaseApiKey && c.firebaseProjectId ? c : null; } catch (e) { return null; }
}
const sessFile = () => path.join(app.getPath('userData'), 'account.bin');
let S = null; // { uid, email, name, photo, idToken, idExp, refresh }

function saveSession() {
  try {
    if (!S) { fs.rmSync(sessFile(), { force: true }); return; }
    const raw = JSON.stringify({ uid: S.uid, email: S.email, name: S.name, photo: S.photo, refresh: S.refresh });
    if (!safeStorage.isEncryptionAvailable()) return; // never write the login unencrypted
    fs.writeFileSync(sessFile(), safeStorage.encryptString(raw));
  } catch (e) {}
}
function loadSession() {
  try { if (!fs.existsSync(sessFile()) || !safeStorage.isEncryptionAvailable()) return; S = { ...JSON.parse(safeStorage.decryptString(fs.readFileSync(sessFile()))), idToken: null, idExp: 0 }; } catch (e) { S = null; }
}
async function post(url, body, form) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? new URLSearchParams(body).toString() : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || j.error_description || 'HTTP ' + r.status); return j;
}
const b64url = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* Step 1–2: browser sign-in with PKCE, answered on a one-time local port */
function googleCode(cfg, openUrl) {
  return new Promise((resolve, reject) => {
    const verifier = b64url(crypto.randomBytes(48)), challenge = b64url(crypto.createHash('sha256').update(verifier).digest()), state = b64url(crypto.randomBytes(16));
    let done = false, port = 0;
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1'); if (u.pathname !== '/') { res.writeHead(404); return res.end(); }
      const ok = u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><meta charset="utf-8"><title>Compass</title><body style="font:16px system-ui;background:#0d0d0e;color:#eee;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>${ok ? 'Signed in' : 'Sign-in did not finish'}</h2><p style="color:#aaa">${ok ? 'You can close this tab and go back to Compass.' : 'Close this tab and try again in Compass.'}</p></div></body>`);
      if (done) return; done = true; clearTimeout(timer); srv.close();
      if (ok) resolve({ code: u.searchParams.get('code'), verifier, redirect: `http://127.0.0.1:${port}` }); else reject(new Error(u.searchParams.get('error') || 'Sign-in was cancelled'));
    });
    const timer = setTimeout(() => { if (!done) { done = true; srv.close(); reject(new Error('Sign-in timed out')); } }, 5 * 60 * 1000);
    srv.listen(0, '127.0.0.1', () => {
      port = srv.address().port; const redirect = `http://127.0.0.1:${port}`;
      const q = new URLSearchParams({ client_id: cfg.googleClientId, redirect_uri: redirect, response_type: 'code', scope: 'openid email profile', code_challenge: challenge, code_challenge_method: 'S256', state, prompt: 'select_account' });
      openUrl(`${URLS.auth}?${q}`);
    });
  });
}

/* Step 3: Google code → Google ID token → Firebase session */
async function signIn(openUrl = u => shell.openExternal(u)) {
  const cfg = config(); if (!cfg) throw new Error('Online features are not set up yet');
  const g = await googleCode(cfg, openUrl);
  const tok = await post(URLS.token, { client_id: cfg.googleClientId, ...(cfg.googleClientSecret ? { client_secret: cfg.googleClientSecret } : {}), code: g.code, code_verifier: g.verifier, redirect_uri: g.redirect, grant_type: 'authorization_code' }, true);
  if (!tok.id_token) throw new Error('Google did not return an ID token');
  const fb = await post(`${URLS.idp}?key=${encodeURIComponent(cfg.firebaseApiKey)}`, { postBody: `id_token=${tok.id_token}&providerId=google.com`, requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true });
  S = { uid: fb.localId, email: fb.email || '', name: fb.displayName || '', photo: fb.photoUrl || '', idToken: fb.idToken, idExp: Date.now() + (+fb.expiresIn || 3600) * 1000 - 60000, refresh: fb.refreshToken };
  saveSession();
  const prof = await getProfile().catch(() => null);
  return { ...status(), profile: prof };
}
async function idToken() {
  if (!S) throw new Error('Not signed in');
  if (S.idToken && Date.now() < S.idExp) return S.idToken;
  const cfg = config(); const r = await post(`${URLS.refresh}?key=${encodeURIComponent(cfg.firebaseApiKey)}`, { grant_type: 'refresh_token', refresh_token: S.refresh }, true);
  S.idToken = r.id_token; S.idExp = Date.now() + (+r.expires_in || 3600) * 1000 - 60000; if (r.refresh_token && r.refresh_token !== S.refresh) { S.refresh = r.refresh_token; saveSession(); }
  return S.idToken;
}
function signOut() { S = null; saveSession(); return status(); }
function status() { const cfg = config(); return { available: !!cfg, signedIn: !!S, uid: S && S.uid, email: S && S.email, name: S && S.name, photo: S && S.photo }; }

/* Profile in Firestore: users/<uid> with plain string fields */
const docUrl = () => `${URLS.firestore}/projects/${encodeURIComponent(config().firebaseProjectId)}/databases/(default)/documents/users/${encodeURIComponent(S.uid)}`;
const PROFILE_KEYS = ['artist', 'name', 'email', 'photo', 'updated'];
async function getProfile() {
  const r = await fetch(docUrl(), { headers: { Authorization: 'Bearer ' + await idToken() } });
  if (r.status === 404) return null; const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, v.stringValue ?? v.integerValue ?? null]));
}
async function saveProfile(p) {
  const fields = {}, keys = [];
  for (const k of PROFILE_KEYS) { const v = k === 'updated' ? new Date().toISOString() : k === 'email' ? S.email : k === 'photo' ? S.photo : p && p[k] != null ? String(p[k]).slice(0, 200) : (k === 'name' ? S.name : null); if (v == null) continue; fields[k] = { stringValue: v }; keys.push(k); }
  const q = keys.map(k => 'updateMask.fieldPaths=' + k).join('&');
  const r = await fetch(`${docUrl()}?${q}`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + await idToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status); return true;
}

function register(ipcMain) {
  loadSession();
  const wrap = f => async (...a) => { try { return { ok: true, ...(await f(...a)) }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; } };
  ipcMain.handle('tp-acct-status', () => status());
  ipcMain.handle('tp-acct-signin', wrap(() => signIn(process.env.COMPASS_TEST_OPEN ? u => fetch(u, { redirect: 'follow' }).catch(() => {}) : undefined)));
  ipcMain.handle('tp-acct-signout', () => signOut());
  ipcMain.handle('tp-acct-profile', wrap(async () => ({ profile: await getProfile() })));
  ipcMain.handle('tp-acct-save', wrap(async (e, p) => ({ saved: await saveProfile(p) })));
}
module.exports = { register };
