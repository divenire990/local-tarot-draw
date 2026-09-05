export const REPO_OWNER = 'divenire990';
export const REPO_NAME = 'local-tarot-draw';
export const REPO_FULL = `${REPO_OWNER}/${REPO_NAME}`;

export const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${REPO_FULL}/releases/latest`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${REPO_FULL}/releases`;
export const GITHUB_REPO_PAGE = `https://github.com/${REPO_FULL}`;

export const CLI_PACKAGE_NAME = '@divenire990/local-tarot-draw';
export const CLI_VERSION = '0.1.0';

export const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'github-releases.githubusercontent.com',
]);

export const EXPECTED_GITHUB_RELEASE_PREFIX = `/${REPO_FULL}/releases/download/`;
