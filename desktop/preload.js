// Gives the page a tiny, safe bridge to the desktop app: its version and a manual update check.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tpDesktop', {
  version: ipcRenderer.sendSync('tp-version') || '',
  checkForUpdates: () => ipcRenderer.invoke('tp-check-updates')
});
