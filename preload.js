const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fox', {
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  focus: () => ipcRenderer.send('focus-window'),
  blur: () => ipcRenderer.send('blur-window'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getState: () => ipcRenderer.invoke('get-state'),
  setState: (patch) => ipcRenderer.send('set-state', patch),
  chat: (text, ctx) => ipcRenderer.invoke('chat', text, ctx),
  customFox: () => ipcRenderer.invoke('custom-fox'),
  contextMenu: () => ipcRenderer.send('context-menu'),
  openApp: (name) => ipcRenderer.send('open-app', name),
  openPrivacy: () => ipcRenderer.send('open-privacy'),
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),
  hasApiKey: () => ipcRenderer.invoke('has-api-key'),
  openKeyPage: () => ipcRenderer.send('open-key-page'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  on: (channel, fn) => {
    if (['command', 'power', 'config', 'notify', 'update'].includes(channel)) ipcRenderer.on(channel, (_e, data) => fn(data));
  }
});
