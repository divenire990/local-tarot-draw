import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { assertValidAssetUrl, parseSha256Checksum, verifyChecksum } from './security.mjs';
import { CLI_PACKAGE_NAME, CLI_VERSION } from './constants.mjs';

/**
 * Downloads and verifies the Windows installer asset from GitHub Release.
 *
 * @param {object} params
 * @param {object} params.exeAsset
 * @param {object} params.sha256Asset
 * @param {string} [params.outputDir]
 * @param {typeof fetch} [params.fetchFn]
 * @param {(msg: string) => void} [params.onLog]
 * @returns {Promise<{ filePath: string, fileName: string, sha256: string, targetDir: string }>}
 */
export async function downloadReleaseInstaller({
  exeAsset,
  sha256Asset,
  outputDir,
  fetchFn = globalThis.fetch,
  onLog = () => {},
}) {
  assertValidAssetUrl(exeAsset.browser_download_url);
  assertValidAssetUrl(sha256Asset.browser_download_url);

  onLog(`Fetching official checksum: ${sha256Asset.name}...`);
  const sha256Res = await fetchFn(sha256Asset.browser_download_url, {
    headers: {
      'User-Agent': `${CLI_PACKAGE_NAME}/${CLI_VERSION} (node)`,
    },
  });

  if (!sha256Res.ok) {
    throw new Error(
      `Failed to download SHA-256 checksum file: HTTP ${sha256Res.status} ${sha256Res.statusText}`
    );
  }

  const sha256RawText = await sha256Res.text();
  const expectedHash = parseSha256Checksum(sha256RawText);
  onLog(`Expected SHA-256: ${expectedHash}`);

  // Determine target directory
  let targetDir = outputDir;
  if (!targetDir) {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-tarot-draw-'));
  } else {
    targetDir = path.resolve(targetDir);
    await fs.promises.mkdir(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, exeAsset.name);
  onLog(`Downloading installer to: ${filePath}...`);

  const exeRes = await fetchFn(exeAsset.browser_download_url, {
    headers: {
      'User-Agent': `${CLI_PACKAGE_NAME}/${CLI_VERSION} (node)`,
    },
  });

  if (!exeRes.ok) {
    throw new Error(
      `Failed to download installer binary: HTTP ${exeRes.status} ${exeRes.statusText}`
    );
  }

  if (!exeRes.body) {
    throw new Error('Installer download response body is empty.');
  }

  const hashStream = crypto.createHash('sha256');
  const fileWriteStream = fs.createWriteStream(filePath);

  try {
    const nodeReadable = Readable.fromWeb(exeRes.body);

    nodeReadable.on('data', (chunk) => {
      hashStream.update(chunk);
    });

    await pipeline(nodeReadable, fileWriteStream);
  } catch (downloadErr) {
    // Clean up partial file on failure
    await fs.promises.unlink(filePath).catch(() => {});
    throw new Error(`Download stream interrupted: ${downloadErr.message}`);
  }

  const actualHash = hashStream.digest('hex');
  onLog(`Computed SHA-256: ${actualHash}`);

  try {
    verifyChecksum(actualHash, expectedHash);
    onLog('SHA-256 verification passed successfully.');
  } catch (verifyErr) {
    // Clean up immediately upon checksum failure
    await fs.promises.unlink(filePath).catch(() => {});
    throw new Error(
      `Security Alert: Checksum verification failed for "${exeAsset.name}"!\n` +
      `The downloaded file was removed immediately.\n` +
      `${verifyErr.message}`
    );
  }

  return {
    filePath,
    fileName: exeAsset.name,
    sha256: actualHash,
    targetDir,
  };
}
