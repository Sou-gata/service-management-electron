const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    // PDF generation using Electron's native printToPDF
    printToPdf: (htmlContent, filename) =>
        ipcRenderer.invoke("print-to-pdf", { htmlContent, filename }),

    // Get the API port the backend is listening on
    getApiPort: () => ipcRenderer.invoke("get-api-port"),

    // Open URLs in the system browser
    openExternal: (url) => ipcRenderer.invoke("open-external", url),

    // Save PDF buffer and open via system shell
    openPdfBuffer: (base64Data, filename) =>
        ipcRenderer.invoke("open-pdf-buffer", { base64Data, filename }),

    // Check if running inside Electron
    isElectron: true,
});
