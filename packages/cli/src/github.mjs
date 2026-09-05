import {
  GITHUB_API_LATEST_RELEASE,
  CLI_PACKAGE_NAME,
  CLI_VERSION,
} from './constants.mjs';
import { assertValidAssetUrl } from './security.mjs';

/**
 * Queries GitHub API for the latest release of the repository.
 *
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchFn]
 * @param {string} [options.apiUrl]
 * @returns {Promise<object>} release data JSON
 */
export async function fetchLatestRelease({ fetchFn = globalThis.fetch, apiUrl = GITHUB_API_LATEST_RELEASE } = {}) {
  const response = await fetchFn(apiUrl, {
    headers: {
      'User-Agent': `${CLI_PACKAGE_NAME}/${CLI_VERSION} (node)`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to query GitHub release: HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response structure received from GitHub Releases API.');
  }

  return data;
}

/**
 * Selects the Windows executable (.exe) and its corresponding .sha256 checksum asset
 * from a GitHub release object, performing strict URL security assertions.
 *
 * @param {object} release
 * @returns {{ exeAsset: object, sha256Asset: object, tagName: string }}
 */
export function selectReleaseAssets(release) {
  if (!release || !Array.isArray(release.assets)) {
    throw new Error('Release payload does not contain a valid assets array.');
  }

  const tagName = release.tag_name || 'latest';
  const assets = release.assets;

  // Find Windows installer (.exe)
  const exeAssets = assets.filter((a) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe'));
  if (exeAssets.length === 0) {
    throw new Error(`No Windows installer (.exe) found in GitHub release ${tagName}.`);
  }

  // Prioritize setup or primary installer if multiple exist
  const exeAsset =
    exeAssets.find((a) => /setup/i.test(a.name)) ||
    exeAssets.find((a) => /tarot/i.test(a.name)) ||
    exeAssets[0];

  // Find corresponding sha256 asset
  const sha256Asset = assets.find((a) => {
    if (typeof a.name !== 'string') return false;
    const nameLower = a.name.toLowerCase();
    const exeNameLower = exeAsset.name.toLowerCase();
    return (
      nameLower === `${exeNameLower}.sha256` ||
      nameLower === `${exeNameLower}.sha256sum` ||
      (nameLower.endsWith('.sha256') && nameLower.includes(exeNameLower.replace(/\.exe$/, '')))
    );
  });

  if (!sha256Asset) {
    throw new Error(
      `No matching SHA-256 checksum asset found for "${exeAsset.name}" in GitHub release ${tagName}.`
    );
  }

  // Assert both download URLs pass strict security checks
  assertValidAssetUrl(exeAsset.browser_download_url);
  assertValidAssetUrl(sha256Asset.browser_download_url);

  return {
    exeAsset,
    sha256Asset,
    tagName,
  };
}
