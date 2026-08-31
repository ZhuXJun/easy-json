const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content, defaultName, fileType) =>
    ipcRenderer.invoke('dialog:saveFile', content, defaultName, fileType),
  loadHistory: () => ipcRenderer.invoke('history:load'),
  saveHistory: (data) => ipcRenderer.invoke('history:save', data),
})
