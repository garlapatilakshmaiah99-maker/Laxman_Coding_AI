
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('laxmanAI', {
  // Local Ollama
  getStatus: () => ipcRenderer.invoke('ai:status'),
  chat: (payload) => ipcRenderer.invoke('ai:chat', payload),

  // Project folder and file access
  selectProjectFolder: () =>
    ipcRenderer.invoke('project:select-folder'),

  readProjectFile: (filePath) =>
    ipcRenderer.invoke('project:read-file', { filePath }),

  // Secure provider-key management
  getProviderKeyStatus: () =>
    ipcRenderer.invoke('providers:key-status'),

  saveProviderKey: (provider, apiKey) =>
    ipcRenderer.invoke('providers:save-key', { provider, apiKey }),

  deleteProviderKey: (provider) =>
    ipcRenderer.invoke('providers:delete-key', { provider }),

  hasProviderKey: (provider) =>
    ipcRenderer.invoke('providers:has-key', { provider }),

  // Online cloud chat
  onlineChat: (payload) =>
    ipcRenderer.invoke('ai:online-chat', payload),
});
