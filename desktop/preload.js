// Gives the page a small, safe bridge to the desktop app: version, update check and the FL Studio link.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tpDesktop', {
  version: ipcRenderer.sendSync('tp-version') || '',
  checkForUpdates: () => ipcRenderer.invoke('tp-check-updates'),
  onChangelog: fn => ipcRenderer.on('tp-changelog', (e, data) => fn(data)),
  // FL Studio link: install the FL script, keep sent WAVs on disk, and drag them into FL
  fl: {
    install: () => ipcRenderer.invoke('tp-fl-install'),
    status: () => ipcRenderer.invoke('tp-fl-status'),
    save: (name, data) => ipcRenderer.invoke('tp-fl-save', name, data),
    drag: file => ipcRenderer.send('tp-drag', file),
    reveal: file => ipcRenderer.invoke('tp-reveal', file)
  }
});
