const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const http = require("http");
const fs = require("fs");

// ─── Single Instance Lock ───────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// Disable application menu bar globally
Menu.setApplicationMenu(null);

// ─── Globals ────────────────────────────────────────────────────────────────
let mainWindow = null;
let serverProcess = null;
const API_PORT = 5000;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// ─── Database path in userData so it persists across updates ────────────────
function getDbPath() {
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, "service_management.db");
}

function startIpcPdfServer() {
    return new Promise((resolve) => {
        const pdfServer = http.createServer(async (req, res) => {
            if (req.url === '/generate-pdf' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', async () => {
                    try {
                        const { htmlContent, filename } = JSON.parse(body);
                        const pdfWindow = new BrowserWindow({
                            show: false,
                            webPreferences: {
                                nodeIntegration: false,
                                contextIsolation: true,
                            },
                        });
                        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
                        const pdfBuffer = await pdfWindow.webContents.printToPDF({
                            pageSize: "A4",
                            printBackground: true,
                            margins: { marginType: "custom", top: 0.59, bottom: 0.59, left: 0.59, right: 0.59 },
                        });
                        pdfWindow.close();

                        res.writeHead(200, {
                            'Content-Type': 'application/pdf',
                            'Content-Disposition': `attachment; filename=${filename}`
                        });
                        res.end(pdfBuffer);
                    } catch (err) {
                        console.error("[IPC PDF Server] Error:", err);
                        res.writeHead(500);
                        res.end();
                    }
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        pdfServer.listen(0, '127.0.0.1', () => {
            const port = pdfServer.address().port;
            console.log(`[Main] IPC PDF Server listening on port ${port}`);
            resolve(port);
        });
    });
}

// ─── Start the Express backend server ───────────────────────────────────────
function startBackendServer(pdfPort) {
    return new Promise((resolve, reject) => {
        const userDataPath = app.getPath("userData");
        const dbPath = path.join(userDataPath, "service_management.db");
        const uploadsPath = path.join(userDataPath, "uploads");

        // Resolve path to the compiled backend server
        const serverScript = path.join(__dirname, "..", "backend", "dist", "server.js");

        const viewsPath = app.isPackaged
            ? path.join(process.resourcesPath, "views")
            : path.join(__dirname, "..", "backend", "views");

        console.log("[Main] Starting backend server at:", serverScript);
        console.log("[Main] DB path:", dbPath);
        console.log("[Main] Uploads path:", uploadsPath);
        console.log("[Main] Views path:", viewsPath);

        serverProcess = fork(serverScript, [], {
            env: {
                ...process.env,
                NODE_ENV: "production",
                PORT: String(API_PORT),
                DB_PATH: dbPath,
                UPLOADS_PATH: uploadsPath,
                VIEWS_PATH: viewsPath,
                JWT_SECRET: "super_secret_key_for_service_management_app_2026",
                IPC_PDF_PORT: String(pdfPort),
            },
            silent: false,
        });

        serverProcess.on("message", (msg) => {
            if (msg === "server-ready") {
                console.log("[Main] Backend server is ready");
                resolve(true);
            }
        });

        serverProcess.on("error", (err) => {
            console.error("[Main] Backend server process error:", err);
            reject(err);
        });

        serverProcess.on("exit", (code) => {
            console.log("[Main] Backend server exited with code:", code);
        });

        // Fallback: poll until the server responds
        let attempts = 0;
        const maxAttempts = 30;
        const interval = setInterval(() => {
            attempts++;
            const req = http.get(
                `http://localhost:${API_PORT}/api/health`,
                (res) => {
                    if (res.statusCode === 200) {
                        clearInterval(interval);
                        console.log("[Main] Backend health check passed");
                        resolve(true);
                    }
                }
            );
            req.on("error", () => {
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error("Backend server did not start in time"));
                }
            });
            req.end();
        }, 500);
    });
}

// ─── Create the main browser window ─────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // Allow loading local file resources
        },
        titleBarStyle: "default",
        show: false,
        autoHideMenuBar: true,
        icon: app.isPackaged
            ? path.join(process.resourcesPath, "icon.ico")
            : path.join(__dirname, "..", "assets", "icon.png"),
    });

    // Load the frontend
    if (isDev) {
        // In dev mode, load from vite dev server if available, else from build
        const frontendBuild = path.join(
            __dirname,
            "..",
            "frontend",
            "dist",
            "index.html"
        );
        mainWindow.loadFile(frontendBuild);
        mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
        const frontendPath = path.join(__dirname, "..", "frontend", "dist", "index.html");
        mainWindow.loadFile(frontendPath);
    }

    // Hide menu bar for child windows opened via window.open
    mainWindow.webContents.setWindowOpenHandler(() => {
        return {
            action: "allow",
            overrideBrowserWindowOptions: {
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                }
            }
        };
    });

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
        mainWindow.setTitle("Service Management");
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// ─── IPC: PDF Generation via Electron's built-in printToPDF ─────────────────
ipcMain.handle("print-to-pdf", async (event, { htmlContent, filename }) => {
    try {
        // Create a hidden BrowserWindow to render the HTML and export PDF
        const pdfWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        await pdfWindow.loadURL(
            `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
        );

        const pdfBuffer = await pdfWindow.webContents.printToPDF({
            pageSize: "A4",
            printBackground: true,
            margins: {
                marginType: "custom",
                top: 0.59, // 15mm in inches
                bottom: 0.59,
                left: 0.59,
                right: 0.59,
            },
        });

        pdfWindow.close();

        // Save to temp and open, or return buffer directly
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: "Save PDF",
            defaultPath: path.join(app.getPath("downloads"), filename),
            filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        });

        if (canceled || !filePath) {
            return { success: false, reason: "cancelled" };
        }

        fs.writeFileSync(filePath, pdfBuffer);
        shell.openPath(filePath);
        return { success: true, filePath };
    } catch (err) {
        console.error("[IPC] print-to-pdf error:", err);
        return { success: false, reason: err.message };
    }
});

ipcMain.handle("get-api-port", () => API_PORT);

ipcMain.handle("open-external", (event, url) => {
    shell.openExternal(url);
});

app.whenReady().then(async () => {
    try {
        console.log("[Main] App ready. Starting backend...");
        const pdfPort = await startIpcPdfServer();
        await startBackendServer(pdfPort);
        console.log("[Main] Creating window...");
        createWindow();
    } catch (err) {
        console.error("[Main] Failed to start:", err);
        dialog.showErrorBox(
            "Startup Error",
            `Failed to start the backend server:\n${err.message}\n\nThe application will close.`
        );
        app.quit();
    }
});

app.on("window-all-closed", () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on("before-quit", () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
