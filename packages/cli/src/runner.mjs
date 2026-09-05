import fs from 'node:fs';
import childProcess from 'node:child_process';

/**
 * Safely launches the downloaded Windows executable.
 * Strictly avoids shell execution (shell: false) to prevent command injection.
 *
 * @param {string} filePath
 * @param {object} [options]
 * @param {typeof childProcess.spawn} [options.spawnFn]
 * @returns {childProcess.ChildProcess}
 */
export function launchInstaller(filePath, { spawnFn = childProcess.spawn } = {}) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error('Valid file path must be provided to launch installer.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Cannot launch installer: File not found at "${filePath}".`);
  }

  // Strictly launch binary directly with NO shell interpolation
  const child = spawnFn(filePath, [], {
    detached: true,
    stdio: 'ignore',
    shell: false,
    windowsHide: false,
  });

  // Allow the parent CLI process to exit independently
  if (typeof child.unref === 'function') {
    child.unref();
  }

  return child;
}
