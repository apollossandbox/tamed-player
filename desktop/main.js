// Tamed Player desktop shell. The app itself is app/index.html; this file opens the window
// and keeps the app up to date from GitHub.
const { app, BrowserWindow, shell, session, dialog, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Same data folder for every version (%APPDATA%\Tamed Player), so updates keep your projects.
app.setName('Tamed Player');
app.setAppUserModelId('com.trulytamed.tamedplayer');
if (!app.requestSingleInstanceLock()) app.quit();

// Every new installer pushed to GitHub updates this file; the app compares versions against it.
const FEED = 'https://raw.githubusercontent.com/apollossandbox/tamed-player/main/installer/latest.json';

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1000, minHeight: 660,
    title: 'Tamed Player', backgroundColor: '#0b0b0c', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'app', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
      preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
}

const newer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
let checking = false;
async function checkForUpdates(manual) {
  if (checking) return; checking = true;
  try {
    const r = await net.fetch(FEED + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status === 404 ? 'The update file was not found. The tamed-player repository on GitHub has to be public for updates to work.' : 'GitHub answered ' + r.status + '.');
    const info = await r.json();
    if (!info.version || !newer(info.version, app.getVersion())) {
      if (manual) await dialog.showMessageBox(win, { type: 'info', message: 'Tamed Player is up to date', detail: 'You have version ' + app.getVersion() + '.' });
      return;
    }
    const { response } = await dialog.showMessageBox(win, {
      type: 'info', buttons: ['Download and install', 'Later'], defaultId: 0, cancelId: 1,
      message: `Tamed Player ${info.version} is available`,
      detail: `You have ${app.getVersion()}.${info.notes ? '\n\n' + info.notes : ''}\n\nThe new version installs over this one. Your projects are kept.`
    });
    if (response !== 0) return;
    const url = new URL(info.file || 'TamedPlayer-Setup.exe', FEED).toString();
    const dest = path.join(app.getPath('temp'), `TamedPlayer-Setup-${info.version}.exe`);
    const res = await net.fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('The installer could not be downloaded (' + res.status + ').');
    const total = +res.headers.get('content-length') || 0, reader = res.body.getReader(), chunks = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(Buffer.from(value)); got += value.length; if (total && win) win.setProgressBar(got / total); }
    if (win) win.setProgressBar(-1);
    fs.writeFileSync(dest, Buffer.concat(chunks));
    spawn(dest, [], { detached: true, stdio: 'ignore' }).unref();
    setTimeout(() => app.quit(), 800);
  } catch (e) {
    if (win) win.setProgressBar(-1);
    if (manual) dialog.showMessageBox(win, { type: 'warning', message: "Couldn't check for updates", detail: (e && e.message) || String(e) });
  } finally { checking = false; }
}

app.whenReady().then(() => {
  session.defaultSession.on('will-download', (e, item) => {
    item.setSaveDialogOptions({ title: 'Save from Tamed Player', defaultPath: path.join(app.getPath('documents'), item.getFilename()) });
  });
  ipcMain.handle('tp-check-updates', () => checkForUpdates(true));
  ipcMain.on('tp-version', e => { e.returnValue = app.getVersion(); });
  createWindow();
  setTimeout(() => checkForUpdates(false), 6000);
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
