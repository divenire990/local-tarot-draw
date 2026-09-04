const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  isDesktop: true,
  getSettings: () => ipcRenderer.invoke("desktop:get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("desktop:save-settings", settings),
  openDirectory: (targetPath) => ipcRenderer.invoke("desktop:open-directory", targetPath),
  getZoomPercent: () => ipcRenderer.invoke("desktop:get-zoom-percent"),
  setZoomPercent: (zoomPercent) => ipcRenderer.invoke("desktop:set-zoom-percent", zoomPercent),
  onZoomChanged: (handler) => {
    const listener = (_event, zoomPercent) => handler(zoomPercent);
    ipcRenderer.on("desktop:zoom-changed", listener);
    return () => {
      ipcRenderer.removeListener("desktop:zoom-changed", listener);
    };
  },
});
