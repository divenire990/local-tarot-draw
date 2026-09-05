import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertValidAssetUrl,
  parseSha256Checksum,
  verifyChecksum,
} from '../src/security.mjs';

test('assertValidAssetUrl allows legitimate GitHub release download URLs', () => {
  const validUrls = [
    'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe',
    'https://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/LocalTarotDraw-Setup-0.1.0.exe.sha256',
    'https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345/LocalTarotDraw-Setup-0.1.0.exe?token=abc',
    'https://github-releases.githubusercontent.com/12345/LocalTarotDraw-Setup-0.1.0.exe',
  ];

  for (const url of validUrls) {
    const res = assertValidAssetUrl(url);
    assert.ok(res instanceof URL);
  }
});

test('assertValidAssetUrl rejects non-HTTPS protocols', () => {
  assert.throws(
    () => assertValidAssetUrl('http://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/installer.exe'),
    /Only HTTPS download URLs are allowed/
  );
  assert.throws(
    () => assertValidAssetUrl('ftp://github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/installer.exe'),
    /Only HTTPS download URLs are allowed/
  );
});

test('assertValidAssetUrl rejects malicious or unauthorized domains and phishing attempts', () => {
  const invalidUrls = [
    'https://evil.com/installer.exe',
    'https://github.com.attacker.com/divenire990/local-tarot-draw/releases/download/v0.1.0/installer.exe',
    'https://objects.githubusercontent.com.attacker.com/installer.exe',
    'https://attacker-github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/installer.exe',
    'https://raw.githubusercontent.com/divenire990/local-tarot-draw/main/malicious.exe',
  ];

  for (const url of invalidUrls) {
    assert.throws(() => assertValidAssetUrl(url), /Untrusted download host/);
  }
});

test('assertValidAssetUrl rejects different repository release paths on github.com', () => {
  assert.throws(
    () => assertValidAssetUrl('https://github.com/other-user/malicious-repo/releases/download/v0.1.0/installer.exe'),
    /Invalid download path/
  );
  assert.throws(
    () => assertValidAssetUrl('https://github.com/divenire990/other-repo/releases/download/v0.1.0/installer.exe'),
    /Invalid download path/
  );
});

test('assertValidAssetUrl rejects credentials and non-standard ports', () => {
  assert.throws(
    () => assertValidAssetUrl('https://user:pass@github.com/divenire990/local-tarot-draw/releases/download/v0.1.0/installer.exe'),
    /must not contain authentication credentials/
  );
  assert.throws(
    () => assertValidAssetUrl('https://github.com:8443/divenire990/local-tarot-draw/releases/download/v0.1.0/installer.exe'),
    /Non-standard port/
  );
});

test('parseSha256Checksum extracts 64-char hex hash from various formats', () => {
  const hash = '89dc3343e8627379dcb46ead4534b7432fbb9f94ee9b419fa64be77498be7ccc';
  const uppercaseHash = '89DC3343E8627379DCB46EAD4534B7432FBB9F94EE9B419FA64BE77498BE7CCC';

  // Standard sha256sum format
  assert.equal(parseSha256Checksum(`${uppercaseHash} *LocalTarotDraw-Setup-0.1.0.exe\r\n`), hash);
  assert.equal(parseSha256Checksum(`${uppercaseHash}  LocalTarotDraw-Setup-0.1.0.exe\n`), hash);
  // Pure hash
  assert.equal(parseSha256Checksum(uppercaseHash), hash);
  assert.equal(parseSha256Checksum(`\n\t  ${hash}  \n`), hash);

  // Invalid formats
  assert.throws(() => parseSha256Checksum('not a hash'), /Failed to parse a valid 64-character SHA-256 checksum/);
  assert.throws(() => parseSha256Checksum('123456'), /Failed to parse a valid 64-character SHA-256 checksum/);
  assert.throws(() => parseSha256Checksum(null), /SHA-256 input must be a string/);
});

test('verifyChecksum correctly compares hashes and rejects mismatches', () => {
  const validHash = '89dc3343e8627379dcb46ead4534b7432fbb9f94ee9b419fa64be77498be7ccc';
  const uppercase = '89DC3343E8627379DCB46EAD4534B7432FBB9F94EE9B419FA64BE77498BE7CCC';
  const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';

  assert.doesNotThrow(() => verifyChecksum(validHash, uppercase));
  assert.doesNotThrow(() => verifyChecksum(uppercase, validHash));

  assert.throws(
    () => verifyChecksum(validHash, wrongHash),
    /SHA-256 verification failed/
  );
  assert.throws(
    () => verifyChecksum('short', 'short'),
    /Invalid SHA-256 length/
  );
});
