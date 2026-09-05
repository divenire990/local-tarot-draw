import test from 'node:test';
import assert from 'node:assert/strict';
import { selectReleaseAssets, fetchLatestRelease } from '../src/github.mjs';

test('selectReleaseAssets successfully picks Windows EXE and corresponding SHA256 checksum', () => {
  const release = {
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

  const selected = selectReleaseAssets(release);
  assert.equal(selected.tagName, 'v0.1.0');
  assert.equal(selected.exeAsset.name, 'LocalTarotDraw-Setup-0.1.0.exe');
  assert.equal(selected.sha256Asset.name, 'LocalTarotDraw-Setup-0.1.0.exe.sha256');
});

test('selectReleaseAssets prefers setup executable if multiple binaries exist', () => {
  const release = {
    tag_name: 'v0.1.0',
    assets: [
      {
        name: 'other-tool.exe',
        browser_download_url:
          'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/other-tool.exe',
      },
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

  const selected = selectReleaseAssets(release);
  assert.equal(selected.exeAsset.name, 'LocalTarotDraw-Setup-0.1.0.exe');
});

test('selectReleaseAssets throws if no Windows EXE asset is present', () => {
  const release = {
    tag_name: 'v0.1.0',
    assets: [
      {
        name: 'app-mac.dmg',
        browser_download_url:
          'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/app-mac.dmg',
      },
      {
        name: 'app-linux.AppImage',
        browser_download_url:
          'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/app-linux.AppImage',
      },
    ],
  };

  assert.throws(
    () => selectReleaseAssets(release),
    /No Windows installer \(\.exe\) found/
  );
});

test('selectReleaseAssets throws if no matching sha256 asset is present', () => {
  const release = {
    tag_name: 'v0.1.0',
    assets: [
      {
        name: 'LocalTarotDraw-Setup-0.1.0.exe',
        browser_download_url:
          'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe',
      },
    ],
  };

  assert.throws(
    () => selectReleaseAssets(release),
    /No matching SHA-256 checksum asset found/
  );
});

test('selectReleaseAssets throws if asset download URL fails security check', () => {
  const release = {
    tag_name: 'v0.1.0',
    assets: [
      {
        name: 'LocalTarotDraw-Setup-0.1.0.exe',
        browser_download_url: 'https://evil-hacker.com/malicious.exe',
      },
      {
        name: 'LocalTarotDraw-Setup-0.1.0.exe.sha256',
        browser_download_url:
          'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe.sha256',
      },
    ],
  };

  assert.throws(
    () => selectReleaseAssets(release),
    /Untrusted download host/
  );
});

test('fetchLatestRelease fetches and parses release JSON', async () => {
  const mockRelease = {
    tag_name: 'v0.1.0',
    assets: [],
  };

  const mockFetch = async (url) => {
    assert.ok(url.includes('api.github.com'));
    return {
      ok: true,
      status: 200,
      json: async () => mockRelease,
    };
  };

  const release = await fetchLatestRelease({ fetchFn: mockFetch });
  assert.equal(release.tag_name, 'v0.1.0');
});

test('fetchLatestRelease throws when API request fails', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found',
  });

  await assert.rejects(
    () => fetchLatestRelease({ fetchFn: mockFetch }),
    /Failed to query GitHub release: HTTP 404 Not Found/
  );
});
