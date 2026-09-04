import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_RECORDS_DIR } from "@/lib/tarot/config";

export interface OpenLocalDirectoryResult {
  ok: boolean;
  path: string;
  error: string | null;
}

const windowsRoot = process.env.WINDIR?.trim() || "C:\\Windows";
const explorerExecutable = path.join(windowsRoot, "explorer.exe");
const cmdExecutable = path.join(windowsRoot, "System32", "cmd.exe");
const powershellExecutable = path.join(
  windowsRoot,
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe",
);

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveDirectoryTarget(targetPath?: string, fallbackPath?: string) {
  const candidates = [
    typeof targetPath === "string" ? targetPath.trim() : "",
    typeof fallbackPath === "string" ? fallbackPath.trim() : "",
    DEFAULT_RECORDS_DIR,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }

    const parentPath = path.dirname(candidate);
    if (parentPath && parentPath !== candidate && (await pathExists(parentPath))) {
      return parentPath;
    }
  }

  return DEFAULT_RECORDS_DIR;
}

function spawnDetached(command: string, args: string[], windowsHide = false) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide,
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function openByExplorer(targetPath: string) {
  try {
    await spawnDetached(explorerExecutable, [targetPath], false);
  } catch {
    try {
      const escapedPath = targetPath.replace(/"/g, "\"\"");
      await spawnDetached(cmdExecutable, [
        "/d",
        "/s",
        "/c",
        `start "" "${escapedPath}"`,
      ], true);
    } catch {
      const quotedPath = targetPath.replace(/'/g, "''");
      await spawnDetached(powershellExecutable, [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Start-Process -FilePath '${explorerExecutable.replace(/'/g, "''")}' -ArgumentList '${quotedPath}'`,
      ], false);
    }
  }
}

export async function openLocalDirectory(
  targetPath?: string,
  fallbackPath?: string,
): Promise<OpenLocalDirectoryResult> {
  const finalPath = await resolveDirectoryTarget(targetPath, fallbackPath);

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
}
