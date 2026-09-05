import {
  ALLOWED_DOWNLOAD_HOSTS,
  EXPECTED_GITHUB_RELEASE_PREFIX,
} from './constants.mjs';

/**
 * Validates that a given URL is a legitimate, HTTPS GitHub release asset URL
 * belonging exclusively to the expected repository or GitHub's storage CDN.
 *
 * @param {string | URL} inputUrl
 * @returns {URL} validated URL object
 */
export function assertValidAssetUrl(inputUrl) {
  let parsedUrl;
  try {
    parsedUrl = typeof inputUrl === 'string' ? new URL(inputUrl) : inputUrl;
  } catch (err) {
    throw new Error(`Invalid URL provided: ${String(inputUrl)} (${err.message})`);
  }

  // 1. Strict HTTPS protocol
  if (parsedUrl.protocol !== 'https:') {
    throw new Error(`Insecure protocol "${parsedUrl.protocol}". Only HTTPS download URLs are allowed.`);
  }

  // 2. Reject credentials in URL
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('URL must not contain authentication credentials.');
  }

  // 3. Reject non-standard ports
  if (parsedUrl.port && parsedUrl.port !== '443') {
    throw new Error(`Non-standard port "${parsedUrl.port}" rejected for security.`);
  }

  // 4. Exact hostname whitelist validation (case-insensitive)
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!ALLOWED_DOWNLOAD_HOSTS.has(hostname)) {
    throw new Error(`Untrusted download host "${hostname}". Asset downloads are restricted to official GitHub domains.`);
  }

  // 5. If hosted on github.com, path must strictly begin with expected release prefix
  if (hostname === 'github.com') {
    if (!parsedUrl.pathname.startsWith(EXPECTED_GITHUB_RELEASE_PREFIX)) {
      throw new Error(
        `Invalid download path "${parsedUrl.pathname}". URL must point to releases of official repository.`
      );
    }
  }

  return parsedUrl;
}

/**
 * Parses a standard SHA-256 checksum string (e.g. from a sha256sum file).
 * Matches a 64-character hexadecimal string.
 *
 * @param {string} text
 * @returns {string} 64-character lowercase hexadecimal hash
 */
export function parseSha256Checksum(text) {
  if (typeof text !== 'string') {
    throw new Error('SHA-256 input must be a string.');
  }

  const match = text.match(/(?:^|\s)([a-fA-F0-9]{64})(?:\s|$)/);
  if (!match) {
    throw new Error('Failed to parse a valid 64-character SHA-256 checksum from the checksum asset.');
  }

  return match[1].toLowerCase();
}

/**
 * Validates that two SHA-256 hashes match.
 *
 * @param {string} actualHash
 * @param {string} expectedHash
 */
export function verifyChecksum(actualHash, expectedHash) {
  const actual = String(actualHash).trim().toLowerCase();
  const expected = String(expectedHash).trim().toLowerCase();

  if (actual.length !== 64 || expected.length !== 64) {
    throw new Error('Invalid SHA-256 length. Both hashes must be exactly 64 hexadecimal characters.');
  }

  if (actual !== expected) {
    throw new Error(`SHA-256 verification failed!\nExpected: ${expected}\nActual:   ${actual}`);
  }
}
