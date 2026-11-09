// Tamed Player desktop shell. The app itself is app/index.html; this file only opens the window.
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

// Keep the same data folder across versions (%APPDATA%\Tamed Player), so updates keep your projects.
app.setName('Tamed Player');
app.setAppUserModelId('com.trulytamed.tamedplayer');

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1000, minHeight: 660,
    title: 'Tamed Player', backgroundColor: '#0b0b0c', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'app', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // Links to other sites (Untitled, etc.) open in the default browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
}

app.whenReady().then(() => {
  // Print files, project downloads and 3D images ask where to save, like any Windows app.
  session.defaultSession.on('will-download', (e, item) => {
    item.setSaveDialogOptions({ title: 'Save from Tamed Player', defaultPath: path.join(app.getPath('documents'), item.getFilename()) });
  });
  createWindow();
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
