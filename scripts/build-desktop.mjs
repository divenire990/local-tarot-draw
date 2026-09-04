import { access, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";

const repoRoot = process.cwd();
const rceditSourcePath = path.join(
  repoRoot,
  "node_modules",
  "electron-winstaller",
  "vendor",
  "rcedit.exe",
);
const rceditOverrideDir = path.join(repoRoot, "build", "rcedit");
const electronBuilderCacheRoot = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "electron-builder", "Cache")
  : path.join(os.tmpdir(), "electron-builder-cache");
const winCodeSignCacheParent = path.join(electronBuilderCacheRoot, "winCodeSign");
const winCodeSignCacheDir = path.join(winCodeSignCacheParent, "winCodeSign-2.6.0");
const winCodeSignArchivePath = path.join(repoRoot, "build", "winCodeSign-2.6.0.zip");
const winCodeSignExtractTempDir = path.join(repoRoot, "build", "winCodeSign-cache-temp");
const winCodeSignDownloadUrls = [
  "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.zip",
  "https://mirrors.huaweicloud.com/repository/toolkit/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.zip",
  "https://mirrors.huaweicloud.com/electron-builder-binaries-local/winCodeSign-2.6.0/winCodeSign-2.6.0.zip",
];

async function ensureFileExists(filePath) {
  await access(filePath);
}

async function ensureRceditOverride() {
  await mkdir(rceditOverrideDir, { recursive: true });
  await ensureFileExists(rceditSourcePath);
  await cp(rceditSourcePath, path.join(rceditOverrideDir, "rcedit-x64.exe"), {
    force: true,
  });
  await cp(rceditSourcePath, path.join(rceditOverrideDir, "rcedit-x86.exe"), {
    force: true,
  });
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${url} -> ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

async function ensureWinCodeSignCache() {
  const requiredFiles = [
    path.join(winCodeSignCacheDir, "rcedit-x64.exe"),
    path.join(winCodeSignCacheDir, "rcedit-ia32.exe"),
  ];

  const hasCache = await Promise.all(
    requiredFiles.map((filePath) => access(filePath).then(() => true).catch(() => false)),
  );

  if (hasCache.every(Boolean)) {
    return;
  }

  await mkdir(winCodeSignCacheParent, { recursive: true });

  let downloadError = null;
  for (const url of winCodeSignDownloadUrls) {
    try {
      await downloadFile(url, winCodeSignArchivePath);
      downloadError = null;
      break;
    } catch (error) {
      downloadError = error;
    }
  }

  if (downloadError) {
    throw downloadError;
  }

  await rm(winCodeSignCacheDir, { recursive: true, force: true });
  await rm(winCodeSignExtractTempDir, { recursive: true, force: true });
  await runStep("powershell", [
    "-NoProfile",
    "-Command",
    `Expand-Archive -LiteralPath '${winCodeSignArchivePath.replace(/'/g, "''")}' -DestinationPath '${winCodeSignExtractTempDir.replace(/'/g, "''")}' -Force`,
  ]);

  const extractedEntries = await readdir(winCodeSignExtractTempDir, { withFileTypes: true });
  const topLevelDirectory = extractedEntries.find((entry) => entry.isDirectory());
  if (!topLevelDirectory) {
    throw new Error("winCodeSign 压缩包结构异常，未找到顶层目录。");
  }

  const extractedWinCodeSignDir = path.join(
    winCodeSignExtractTempDir,
    topLevelDirectory.name,
    "winCodeSign",
  );

  await cp(extractedWinCodeSignDir, winCodeSignCacheDir, {
    recursive: true,
    force: true,
  });

  const cacheReady = await Promise.all(
    requiredFiles.map((filePath) => access(filePath).then(() => true).catch(() => false)),
  );

  if (!cacheReady.every(Boolean)) {
    throw new Error("winCodeSign 缓存预热失败，缺少 rcedit 文件。");
  }

  await rm(winCodeSignExtractTempDir, { recursive: true, force: true });
}

function runStep(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} 执行失败，退出码 ${code ?? "unknown"}`));
    });

    child.once("error", reject);
  });
}

await runStep("npm", ["run", "build"]);
await runStep("npm", ["run", "build:desktop:prepare"]);
await ensureRceditOverride();
await ensureWinCodeSignCache();
await runStep(
  "electron-builder",
  ["--win", "nsis", "--publish", "never"],
  {
    ELECTRON_BUILDER_RCEDIT_PATH: rceditOverrideDir,
  },
);
