import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { run } from '../src/cli.mjs';

function createMockStream() {
  let content = '';
  const stream = new Writable({
    write(chunk, encoding, callback) {
      content += chunk.toString();
      callback();
    },
  });
  return {
    stream,
    getOutput: () => content,
  };
}

function createMockFetch(binaryContent) {
  const actualHash = crypto.createHash('sha256').update(binaryContent).digest('hex');
  const releasePayload = {
    tag_name: 'v0.1.0',
    assets: [
      {
        name: 'LocalTarotDraw-Setup-0.1.0.exe',
        browser_download_url:
          'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe',
      },
      {
        name: 'LocalTarotDraw-Setup-0.1.0.exe.sha256',
        browser_download_url:
          'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe.sha256',
      },
    ],
  };

  return async (url) => {
    if (url.includes('/releases/latest')) {
      return {
        ok: true,
        status: 200,
        json: async () => releasePayload,
      };
    }
    if (url.endsWith('.sha256')) {
      return {
        ok: true,
        status: 200,
        text: async () => `${actualHash} *LocalTarotDraw-Setup-0.1.0.exe\n`,
      };
    }
    if (url.endsWith('.exe')) {
      return {
        ok: true,
        status: 200,
        body: Readable.toWeb(Readable.from([Buffer.from(binaryContent)])),
      };
    }
    throw new Error(`Unexpected URL in mock: ${url}`);
  };
}

test('CLI: --help displays usage information and returns 0 without network activity', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();

  let fetchCalled = false;
  const exitCode = await run(['--help'], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    fetchFn: async () => {
      fetchCalled = true;
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(fetchCalled, false);
  const out = stdout.getOutput();
  assert.ok(out.includes('Usage:'));
  assert.ok(out.includes('--yes'));
  assert.ok(out.includes('--download-only'));
  assert.ok(out.includes('Security & Behavior:'));
});

test('CLI: --version displays CLI version and returns 0', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();

  const exitCode = await run(['--version'], {
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 0);
  assert.equal(stdout.getOutput().trim(), '0.1.0');
});

test('CLI: informs user and provides release links on non-Windows platforms', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();

  let fetchCalled = false;
  const exitCode = await run([], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    platform: 'darwin', // macOS
    fetchFn: async () => {
      fetchCalled = true;
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(fetchCalled, false);
  const out = stdout.getOutput();
  assert.ok(out.includes('Local Tarot Draw desktop installer (.exe) is packaged for Windows.'));
  assert.ok(out.includes('https://github.com/divenire990/local-tarot-draw/releases'));
});

test('CLI: Windows platform with --yes launches installer directly after SHA-256 verification', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-cli-yes-'));

  let spawned = false;
  let spawnArgs = null;
  const mockSpawn = (file, args, options) => {
    spawned = true;
    spawnArgs = { file, args, options };
    return {
      unref: () => {},
    };
  };

  const exitCode = await run(['--yes', '--output-dir', tempDir], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    platform: 'win32',
    fetchFn: createMockFetch('binary content for win32 setup'),
    spawnFn: mockSpawn,
  });

  assert.equal(exitCode, 0);
  assert.equal(spawned, true);
  assert.equal(spawnArgs.options.shell, false, 'Spawn must strictly NOT use shell: true');
  assert.ok(spawnArgs.file.endsWith('LocalTarotDraw-Setup-0.1.0.exe'));

  const out = stdout.getOutput();
  assert.ok(out.includes('SHA-256 verification passed'));
  assert.ok(out.includes('Launching installer...'));

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('CLI: Windows platform prompts confirmation and cancels when user denies', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-cli-deny-'));

  let spawned = false;
  const mockSpawn = () => {
    spawned = true;
    return { unref: () => {} };
  };

  // User enters 'n'
  const stdin = Readable.from(['n\n']);

  const exitCode = await run(['--output-dir', tempDir], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    stdin,
    isTTY: true,
    platform: 'win32',
    fetchFn: createMockFetch('binary content for prompt cancel'),
    spawnFn: mockSpawn,
  });

  assert.equal(exitCode, 0);
  assert.equal(spawned, false, 'Installer must NOT be launched when user cancels confirmation!');

  const out = stdout.getOutput();
  assert.ok(out.includes('Installer launch cancelled by user.'));

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('CLI: Windows platform prompts confirmation and launches when user accepts', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-cli-accept-'));

  let spawned = false;
  const mockSpawn = () => {
    spawned = true;
    return { unref: () => {} };
  };

  // User enters 'y'
  const stdin = Readable.from(['y\n']);

  const exitCode = await run(['--output-dir', tempDir], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    stdin,
    isTTY: true,
    platform: 'win32',
    fetchFn: createMockFetch('binary content for prompt accept'),
    spawnFn: mockSpawn,
  });

  assert.equal(exitCode, 0);
  assert.equal(spawned, true, 'Installer must be launched when user confirms');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('CLI: --download-only verifies checksum and exits without launching installer', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-cli-dl-only-'));

  let spawned = false;
  const mockSpawn = () => {
    spawned = true;
    return { unref: () => {} };
  };

  const exitCode = await run(['--download-only', '--output-dir', tempDir], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    platform: 'win32',
    fetchFn: createMockFetch('binary content for download only'),
    spawnFn: mockSpawn,
  });

  assert.equal(exitCode, 0);
  assert.equal(spawned, false, 'Must not launch installer with --download-only');

  const out = stdout.getOutput();
  assert.ok(out.includes('--download-only flag specified. Skipping installer launch.'));

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('CLI: returns error code 1 and does not launch on invalid argument', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();

  const exitCode = await run(['--invalid-flag'], {
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.ok(stderr.getOutput().includes('Argument error:'));
});

test('CLI: returns error code 1 and removes file when checksum verification fails', async () => {
  const stdout = createMockStream();
  const stderr = createMockStream();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-cli-fail-'));

  const badMockFetch = async (url) => {
    if (url.includes('/releases/latest')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: 'v0.1.0',
          assets: [
            {
              name: 'LocalTarotDraw-Setup-0.1.0.exe',
              browser_download_url:
                'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe',
            },
            {
              name: 'LocalTarotDraw-Setup-0.1.0.exe.sha256',
              browser_download_url:
                'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe.sha256',
            },
          ],
        }),
      };
    }
    if (url.endsWith('.sha256')) {
      return {
        ok: true,
        status: 200,
        text: async () => `9999999999999999999999999999999999999999999999999999999999999999 *LocalTarotDraw-Setup-0.1.0.exe\n`,
      };
    }
    if (url.endsWith('.exe')) {
      return {
        ok: true,
        status: 200,
        body: Readable.toWeb(Readable.from([Buffer.from('corrupted binary')])),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  let spawned = false;
  const mockSpawn = () => {
    spawned = true;
    return { unref: () => {} };
  };

  const exitCode = await run(['--yes', '--output-dir', tempDir], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    platform: 'win32',
    fetchFn: badMockFetch,
    spawnFn: mockSpawn,
  });

  assert.equal(exitCode, 1);
  assert.equal(spawned, false, 'Must never launch installer on checksum failure!');
  assert.ok(stderr.getOutput().includes('Security Alert: Checksum verification failed'));

  fs.rmSync(tempDir, { recursive: true, force: true });
});
