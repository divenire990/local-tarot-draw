const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const isDev = !app.isPackaged;
const settingsPath = path.join(app.getPath("userData"), "tarot-settings.json");
const defaultRecordsDir = path.join(app.getPath("documents"), "TarotDraws");
const iconPath = path.join(app.getAppPath(), "build", "icon.ico");
const minZoomFactor = 0.8;
const maxZoomFactor = 2;
const defaultZoomPercent = 100;

let standaloneServerProcess = null;
let mainWindow = null;

function clampZoomPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return defaultZoomPercent;
  }

  return Math.min(maxZoomFactor * 100, Math.max(minZoomFactor * 100, Math.round(numeric)));
}

function zoomPercentToFactor(zoomPercent) {
  return clampZoomPercent(zoomPercent) / 100;
}

function zoomFactorToPercent(zoomFactor) {
  return clampZoomPercent(zoomFactor * 100);
}

function getWindowZoomPercent(win) {
  return zoomFactorToPercent(win.webContents.getZoomFactor());
}

function broadcastZoomPercent(win) {
  const zoomPercent = getWindowZoomPercent(win);
  win.webContents.send("desktop:zoom-changed", zoomPercent);
  return zoomPercent;
}

function applyWindowZoomPercent(win, zoomPercent) {
  const normalized = clampZoomPercent(zoomPercent);
  win.webContents.setZoomFactor(zoomPercentToFactor(normalized));
  broadcastZoomPercent(win);
  return normalized;
}

function stepZoomPercent(currentZoomPercent, delta) {
  return clampZoomPercent(currentZoomPercent + delta);
}

function getStandaloneRoot() {
  if (isDev) {
    return path.join(app.getAppPath(), ".next", "standalone");
  }

  return path.join(process.resourcesPath, "standalone");
}

async function readSettings() {
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      themeMode: parsed.themeMode === "dusk" ? "dusk" : "night",
      recordsDir: typeof parsed.recordsDir === "string" && parsed.recordsDir.trim()
        ? parsed.recordsDir.trim()
        : defaultRecordsDir,
    };
  } catch {
    return {
      themeMode: "night",
      recordsDir: defaultRecordsDir,
    };
  }
}

async function writeSettings(nextSettings) {
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, `${JSON.stringify(nextSettings, null, 2)}\n`, "utf8");
  return nextSettings;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveDirectoryTarget(targetPath, fallbackPath) {
  const candidates = [
    typeof targetPath === "string" ? targetPath.trim() : "",
    typeof fallbackPath === "string" ? fallbackPath.trim() : "",
    defaultRecordsDir,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }

    const parent = path.dirname(candidate);
    if (parent && parent !== candidate && await pathExists(parent)) {
      return parent;
    }
  }

  return defaultRecordsDir;
}

function openByExplorer(targetPath) {
  return new Promise((resolve, reject) => {
    shell.openPath(targetPath).then((result) => {
      if (result === "") {
        resolve();
        return;
      }

      reject(new Error(result));
    }).catch(reject);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function getAvailablePort(startPort = 30011, endPort = 30120) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > endPort) {
        reject(new Error("未找到可用端口。"));
        return;
      }

      const server = net.createServer();
      server.unref();
      server.once("error", () => {
        tryPort(port + 1);
      });
      server.listen({ host: "127.0.0.1", port }, () => {
        const { port: freePort } = server.address();
        server.close(() => resolve(freePort));
      });
    };

    tryPort(startPort);
  });
}

async function waitForServerReady(port, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    if (standaloneServerProcess && standaloneServerProcess.exitCode !== null) {
      throw new Error("内置应用服务启动后立即退出。");
    }

    if (await canConnect(port)) {
      return;
    }

    await wait(250);
  }

  throw new Error("内置应用服务启动超时。");
}

async function ensureStandaloneServer() {
  if (isDev) {
    return "http://localhost:3000";
  }

  if (standaloneServerProcess && standaloneServerProcess.exitCode === null) {
    return `http://127.0.0.1:${standaloneServerProcess.__port}`;
  }

  const port = await getAvailablePort();
  const standaloneRoot = getStandaloneRoot();
  const serverJsPath = path.join(standaloneRoot, "server.js");

  if (!await pathExists(serverJsPath)) {
    throw new Error(`未找到内置应用服务文件：${serverJsPath}`);
  }

  standaloneServerProcess = spawn(process.execPath, [serverJsPath], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "ignore",
    windowsHide: true,
  });
  standaloneServerProcess.__port = port;

  standaloneServerProcess.once("exit", () => {
    standaloneServerProcess = null;
  });

  await waitForServerReady(port);
  return `http://127.0.0.1:${port}`;
}

async function createWindow() {
  const targetUrl = await ensureStandaloneServer();
  const win = new BrowserWindow({
    width: 1780,
    height: 1040,
    minWidth: 1480,
    minHeight: 920,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#090d18",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow = win;
  win.webContents.setVisualZoomLevelLimits(1, 3);
  win.webContents.on("did-finish-load", () => {
    broadcastZoomPercent(win);
  });
  win.webContents.on("before-input-event", (event, input) => {
    const isZoomShortcut = input.control || input.meta;
    if (!isZoomShortcut || input.type !== "keyDown") {
      return;
    }

    if (input.key === "+" || input.key === "=") {
      event.preventDefault();
      applyWindowZoomPercent(
        win,
        stepZoomPercent(getWindowZoomPercent(win), 10),
      );
      return;
    }

    if (input.key === "-") {
      event.preventDefault();
      applyWindowZoomPercent(
        win,
        stepZoomPercent(getWindowZoomPercent(win), -10),
      );
      return;
    }

    if (input.key === "0") {
      event.preventDefault();
      applyWindowZoomPercent(win, defaultZoomPercent);
    }
  });

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  win.once("ready-to-show", () => win.show());
  await win.loadURL(targetUrl);
  return win;
}

async function showStartupFailure(error) {
  await dialog.showErrorBox(
    "本地塔罗抽牌器启动失败",
    error instanceof Error ? error.message : "桌面版启动失败。",
  );
  app.quit();
}

app.whenReady().then(async () => {
  try {
    const win = await createWindow();

    ipcMain.handle("desktop:get-settings", async () => readSettings());
    ipcMain.handle("desktop:save-settings", async (_event, partial) => {
      const current = await readSettings();
      const next = {
        themeMode: partial?.themeMode === "dusk" ? "dusk" : partial?.themeMode === "night" ? "night" : current.themeMode,
        recordsDir:
          typeof partial?.recordsDir === "string" && partial.recordsDir.trim()
            ? partial.recordsDir.trim()
            : current.recordsDir,
      };
      return writeSettings(next);
    });
    ipcMain.handle("desktop:open-directory", async (_event, targetPath) => {
      const settings = await readSettings();
      const finalPath = await resolveDirectoryTarget(
        targetPath,
        settings.recordsDir || defaultRecordsDir,
      );
      try {
        await openByExplorer(finalPath);
        return {
          ok: true,
          path: finalPath,
          error: null,
        };
      } catch (error) {
        return {
          ok: false,
          path: finalPath,
          error: error instanceof Error ? error.message : "打开目录失败。",
        };
      }
    });
    ipcMain.handle("desktop:get-zoom-percent", async () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return defaultZoomPercent;
      }

      return getWindowZoomPercent(mainWindow);
    });
    ipcMain.handle("desktop:set-zoom-percent", async (_event, zoomPercent) => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return defaultZoomPercent;
      }

      return applyWindowZoomPercent(mainWindow, zoomPercent);
    });

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        try {
          await createWindow();
        } catch (error) {
          await showStartupFailure(error);
        }
      }
    });

    if (isDev) {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } catch (error) {
    await showStartupFailure(error);
  }
});

app.on("before-quit", () => {
  if (standaloneServerProcess && standaloneServerProcess.exitCode === null) {
    standaloneServerProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
