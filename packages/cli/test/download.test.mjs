import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { downloadReleaseInstaller } from '../src/download.mjs';

function createMockReadable(data) {
  return Readable.toWeb(Readable.from([Buffer.from(data)]));
}

test('downloadReleaseInstaller successfully downloads and verifies matching binary', async () => {
  const binaryContent = 'dummy binary installer payload for testing';
  const expectedHash = crypto.createHash('sha256').update(binaryContent).digest('hex');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-test-'));

  const exeAsset = {
    name: 'LocalTarotDraw-Setup-0.1.0.exe',
    browser_download_url:
      'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe',
  };
  const sha256Asset = {
    name: 'LocalTarotDraw-Setup-0.1.0.exe.sha256',
    browser_download_url:
      'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe.sha256',
  };

  const mockFetch = async (url) => {
    if (url === sha256Asset.browser_download_url) {
      return {
        ok: true,
        status: 200,
        text: async () => `${expectedHash.toUpperCase()} *${exeAsset.name}\n`,
      };
    }
    if (url === exeAsset.browser_download_url) {
      return {
        ok: true,
        status: 200,
        body: createMockReadable(binaryContent),
      };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const logs = [];
  const result = await downloadReleaseInstaller({
    exeAsset,
    sha256Asset,
    outputDir: tempDir,
    fetchFn: mockFetch,
    onLog: (m) => logs.push(m),
  });

  assert.equal(result.fileName, exeAsset.name);
  assert.equal(result.sha256, expectedHash);
  assert.ok(fs.existsSync(result.filePath));

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('downloadReleaseInstaller deletes downloaded file immediately and throws if checksum mismatches', async () => {
  const binaryContent = 'tampered binary content!';
  const expectedHash = '1111111111111111111111111111111111111111111111111111111111111111';
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-test-mismatch-'));

  const exeAsset = {
    name: 'LocalTarotDraw-Setup-0.1.0.exe',
    browser_download_url:
      'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe',
  };
  const sha256Asset = {
    name: 'LocalTarotDraw-Setup-0.1.0.exe.sha256',
    browser_download_url:
      'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe.sha256',
  };

  const mockFetch = async (url) => {
    if (url === sha256Asset.browser_download_url) {
      return {
        ok: true,
        status: 200,
        text: async () => `${expectedHash} *${exeAsset.name}\n`,
      };
    }
    if (url === exeAsset.browser_download_url) {
      return {
        ok: true,
        status: 200,
        body: createMockReadable(binaryContent),
      };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const targetPath = path.join(tempDir, exeAsset.name);

  await assert.rejects(
    () =>
      downloadReleaseInstaller({
        exeAsset,
        sha256Asset,
        outputDir: tempDir,
        fetchFn: mockFetch,
      }),
    /Security Alert: Checksum verification failed/
  );

  // Critical: file MUST NOT remain on disk
  assert.equal(
    fs.existsSync(targetPath),
    false,
    'Mismatched binary must be removed from disk immediately!'
  );

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('downloadReleaseInstaller cleans up partial file on network stream error', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-test-err-'));
  const exeAsset = {
    name: 'LocalTarotDraw-Setup-0.1.0.exe',
    browser_download_url:
      'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe',
  };
  const sha256Asset = {
    name: 'LocalTarotDraw-Setup-0.1.0.exe.sha256',
    browser_download_url:
      'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe.sha256',
  };

  const brokenStream = new Readable({
    read() {
      this.destroy(new Error('Network socket disconnected'));
    },
  });

  const mockFetch = async (url) => {
    if (url === sha256Asset.browser_download_url) {
      return {
        ok: true,
        status: 200,
        text: async () => `89dc3343e8627379dcb46ead4534b7432fbb9f94ee9b419fa64be77498be7ccc *${exeAsset.name}\n`,
      };
    }
    return {
      ok: true,
      status: 200,
      body: Readable.toWeb(brokenStream),
    };
  };

  const targetPath = path.join(tempDir, exeAsset.name);

  await assert.rejects(
    () =>
      downloadReleaseInstaller({
        exeAsset,
        sha256Asset,
        outputDir: tempDir,
        fetchFn: mockFetch,
      }),
    /Download stream interrupted/
  );

  assert.equal(fs.existsSync(targetPath), false, 'Interrupted partial file must be deleted.');
  fs.rmSync(tempDir, { recursive: true, force: true });
});
