export interface DesktopSettings {
  themeMode: "night" | "dusk";
  recordsDir: string;
}

export interface OpenDirectoryResult {
  ok: boolean;
  path: string;
  error: string | null;
}

type ZoomChangedHandler = (zoomPercent: number) => void;

declare global {
  interface Window {
    desktopBridge?: {
      isDesktop: boolean;
      getSettings: () => Promise<DesktopSettings>;
      saveSettings: (settings: Partial<DesktopSettings>) => Promise<DesktopSettings>;
      openDirectory: (targetPath?: string) => Promise<OpenDirectoryResult>;
      getZoomPercent: () => Promise<number>;
      setZoomPercent: (zoomPercent: number) => Promise<number>;
      onZoomChanged: (handler: ZoomChangedHandler) => () => void;
    };
  }
}

const browserFallbackSettings: DesktopSettings = {
  themeMode: "night",
  recordsDir: "~/Documents/TarotDraws",
};

export function isDesktopBridgeAvailable() {
  return typeof window !== "undefined" && Boolean(window.desktopBridge?.isDesktop);
}

export async function getDesktopSettings(): Promise<DesktopSettings> {
  if (!isDesktopBridgeAvailable()) {
    return browserFallbackSettings;
  }

  return window.desktopBridge!.getSettings();
}

export async function saveDesktopSettings(
  settings: Partial<DesktopSettings>,
): Promise<DesktopSettings> {
  if (!isDesktopBridgeAvailable()) {
    return {
      ...browserFallbackSettings,
      ...settings,
    };
  }

  return window.desktopBridge!.saveSettings(settings);
}

export async function openDesktopDirectory(targetPath?: string) {
  if (!isDesktopBridgeAvailable()) {
    const response = await fetch("/api/open-directory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetPath,
      }),
    });
    const data = (await response.json()) as Partial<OpenDirectoryResult>;

    return {
      ok: response.ok && Boolean(data.ok),
      path: data.path ?? targetPath ?? browserFallbackSettings.recordsDir,
      error: response.ok ? data.error ?? null : data.error ?? "打开目录失败。",
    };
  }

  return window.desktopBridge!.openDirectory(targetPath);
}

export async function getDesktopZoomPercent() {
  if (!isDesktopBridgeAvailable()) {
    return 100;
  }

  return window.desktopBridge!.getZoomPercent();
}

export async function setDesktopZoomPercent(zoomPercent: number) {
  if (!isDesktopBridgeAvailable()) {
    return 100;
  }

  return window.desktopBridge!.setZoomPercent(zoomPercent);
}

export function onDesktopZoomChanged(handler: ZoomChangedHandler) {
  if (!isDesktopBridgeAvailable()) {
    return () => undefined;
  }

  return window.desktopBridge!.onZoomChanged(handler);
}
