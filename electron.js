import { app, BrowserWindow, screen, ipcMain } from "electron";
import path, { dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let win = null;
const args = process.argv.slice(1).join(" ").toLowerCase();

function getHtmlPath() {
    const candidates = [
        path.join(__dirname, "dist", "index.html"),
        path.join(process.resourcesPath, "dist2", "index.html"),
        path.join(process.cwd(), "dist2", "index.html"),
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) return pathToFileURL(c).toString();
    }
    console.error("[SCREENSAVER] ❌ HTML not found");
    return "";
}

function createSingleFullscreenWindow() {
    const displays = screen.getAllDisplays();

    // Общая виртуальная область всех мониторов
    const minX = Math.min(...displays.map(d => d.bounds.x));
    const minY = Math.min(...displays.map(d => d.bounds.y));
    const maxX = Math.max(...displays.map(d => d.bounds.x + d.bounds.width));
    const maxY = Math.max(...displays.map(d => d.bounds.y + d.bounds.height));

    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;

    console.log(`[SCREENSAVER] Virtual desktop: ${minX},${minY} ${totalWidth}x${totalHeight}`);

    win = new BrowserWindow({
        x: minX,
        y: minY,
        width: totalWidth,
        height: totalHeight,
        useContentSize: false,
        frame: false,
        show: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        simpleFullscreen: true,
        backgroundColor: "#000000",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            enableLargerThanScreen: true, // 🔑 позволяет окно больше основного экрана
        },
    });

    win.setMenu(null);

    const htmlPath = getHtmlPath();
    if (!htmlPath) {
        app.quit();
        return;
    }

    win.loadURL(htmlPath);

    win.once("ready-to-show", () => {
        console.log("[SCREENSAVER] ready-to-show");
        // Повторно задаём координаты, чтобы точно растянуться на все дисплеи
        win.setBounds({ x: minX, y: minY, width: totalWidth, height: totalHeight });
        win.show();
    });

    win.webContents.on("before-input-event", () => {
        console.log("[SCREENSAVER] Input detected -> close");
        closeScreensaver();
    });

    win.on("closed", () => (win = null));
}

function closeScreensaver() {
    if (win && !win.isDestroyed()) {
        win.destroy();
    }
    app.quit();
}

ipcMain.on("close-screensaver", closeScreensaver);

app.whenReady().then(() => {
    console.log("[SCREENSAVER] App ready");
    if (args.includes("/s") || (!args.includes("/p") && !args.includes("/c"))) {
        createSingleFullscreenWindow();
    } else {
        app.quit();
    }
});

app.on("window-all-closed", () => app.quit());
