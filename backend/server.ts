import app from "./src/app.js";
import { testConnection } from "./src/config/db.js";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

const PORT = parseInt(process.env.PORT || "5000");

async function startPdfIpcServer(): Promise<number> {
    let BrowserWindowClass: any;
    try {
        const electronModule = require("electron");
        BrowserWindowClass = electronModule.BrowserWindow;
        if (!BrowserWindowClass) throw new Error("Not in Electron");
    } catch (_) {
        throw new Error(
            "Electron BrowserWindow not available — skipping PDF IPC server"
        );
    }

    return new Promise((resolve) => {
        const pdfServer = http.createServer(async (req, res) => {
            if (req.method !== "POST" || req.url !== "/generate-pdf") {
                res.writeHead(404);
                res.end();
                return;
            }

            let body = "";
            req.on("data", (chunk) => (body += chunk.toString()));
            req.on("end", async () => {
                try {
                    const { htmlContent, filename } = JSON.parse(body);

                    // Create a hidden BrowserWindow to render HTML → PDF
                    const pdfWin = new BrowserWindowClass({
                        show: false,
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                        },
                    });

                    await pdfWin.loadURL(
                        "data:text/html;charset=utf-8," +
                            encodeURIComponent(htmlContent)
                    );

                    // Give the page a moment to render fonts/styles
                    await new Promise((r) => setTimeout(r, 600));

                    const pdfBuffer = await pdfWin.webContents.printToPDF({
                        pageSize: "A4",
                        printBackground: true,
                        margins: {
                            marginType: "custom",
                            top: 0.59,
                            bottom: 0.59,
                            left: 0.59,
                            right: 0.59,
                        },
                    });

                    pdfWin.close();

                    res.writeHead(200, {
                        "Content-Type": "application/pdf",
                        "Content-Length": pdfBuffer.length,
                        "Content-Disposition": `attachment; filename="${filename}"`,
                    });
                    res.end(pdfBuffer);
                } catch (err: any) {
                    console.error("[PDF IPC] Error:", err.message);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        });

        pdfServer.listen(0, "127.0.0.1", () => {
            const addr = pdfServer.address() as any;
            const port = addr.port;
            process.env.IPC_PDF_PORT = String(port);
            console.log(`[PDF IPC] Server listening on 127.0.0.1:${port}`);
            resolve(port);
        });
    });
}

async function startServer(): Promise<void> {
    await testConnection();

    let isElectron = false;
    try {
        await startPdfIpcServer();
        isElectron = true;
    } catch (_) {
        console.log(
            "[Server] Running without Electron PDF IPC (Puppeteer fallback expected)"
        );
    }

    app.listen(PORT, () => {
        console.log(`[Server] Started on port ${PORT}`);
        console.log(
            `[Server] Health check: http://localhost:${PORT}/api/health`
        );
        if (process.send) {
            process.send("server-ready");
        }
    });
}

startServer();
