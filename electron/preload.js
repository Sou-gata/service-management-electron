const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose controlled APIs to the renderer process via window.electronAPI
 * This keeps Node.js context isolated from the web page for security.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // PDF generation using Electron's native printToPDF
  printToPdf: (htmlContent, filename) =>
    ipcRenderer.invoke('print-to-pdf', { htmlContent, filename }),

  // Get the API port the backend is listening on
  getApiPort: () => ipcRenderer.invoke('get-api-port'),

  // Open URLs in the system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Check if running inside Electron
  isElectron: true,
});
