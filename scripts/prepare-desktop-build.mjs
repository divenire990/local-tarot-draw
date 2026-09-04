import { mkdir, cp, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import pngToIco from "png-to-ico";

const repoRoot = process.cwd();
const standaloneDir = path.join(repoRoot, ".next", "standalone");
const standaloneStaticDir = path.join(standaloneDir, ".next", "static");
const standalonePublicDir = path.join(standaloneDir, "public");
const buildDir = path.join(repoRoot, "build");
const pngIconPath = process.env.TAROT_DESKTOP_ICON_PNG || path.join(buildDir, "icon.png");
const icoOutputPath = path.join(buildDir, "icon.ico");

async function ensureStandaloneAssets() {
  await mkdir(standaloneStaticDir, { recursive: true });
  await mkdir(standalonePublicDir, { recursive: true });
  await cp(path.join(repoRoot, ".next", "static"), standaloneStaticDir, {
    recursive: true,
    force: true,
  });
  await cp(path.join(repoRoot, "public"), standalonePublicDir, {
    recursive: true,
    force: true,
  });
}

async function ensureDesktopIcon() {
  await mkdir(buildDir, { recursive: true });
  try {
    await access(icoOutputPath);
    return;
  } catch {
    // icoOutputPath not present, try building from png
  }
  try {
    const iconBuffer = await pngToIco(pngIconPath);
    await writeFile(icoOutputPath, iconBuffer);
  } catch (error) {
    try {
      await access(icoOutputPath);
    } catch {
      throw error;
    }
  }
}

async function patchStandaloneServerHost() {
  const serverJsPath = path.join(standaloneDir, "server.js");
  const source = await readFile(serverJsPath, "utf8");
  const patched = source
    .replace(
      /const currentPort = parseInt\(process\.env\.PORT, 10\) \|\| 3000;/,
      'const currentPort = parseInt(process.env.PORT, 10) || 3000;',
    )
    .replace(
      /const hostname = process\.env\.HOSTNAME \|\| '0\.0\.0\.0';/,
      "const hostname = process.env.HOSTNAME || '127.0.0.1';",
    );

  if (patched !== source) {
    await writeFile(serverJsPath, patched, "utf8");
  }
}

await ensureStandaloneAssets();
await ensureDesktopIcon();
await patchStandaloneServerHost();

console.log("Desktop build assets prepared.");
