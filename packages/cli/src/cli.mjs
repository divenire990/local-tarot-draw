import readline from 'node:readline';
import { parseArgs } from 'node:util';
import {
  CLI_PACKAGE_NAME,
  CLI_VERSION,
  GITHUB_RELEASES_PAGE,
  GITHUB_REPO_PAGE,
} from './constants.mjs';
import { fetchLatestRelease, selectReleaseAssets } from './github.mjs';
import { downloadReleaseInstaller } from './download.mjs';
import { launchInstaller } from './runner.mjs';

/**
 * Formats the CLI help text.
 *
 * @returns {string}
 */
export function formatHelp() {
  return `
${CLI_PACKAGE_NAME} v${CLI_VERSION}
Official secure launcher and installer for Local Tarot Draw (本地塔罗抽牌器).

Usage:
  npx @divenire990/local-tarot-draw [options]
  local-tarot-draw [options]

Options:
  -y, --yes            Skip launch confirmation after SHA-256 verification
  -d, --download-only  Download and verify installer without launching
  -o, --output-dir     Directory to store the verified installer
  -v, --version        Display CLI version
  -h, --help           Display this help message

Security & Behavior:
  * Zero runtime dependencies (uses Node.js built-in modules).
  * No postinstall scripts. Operates only when explicitly executed.
  * Strictly restricts downloads to official GitHub Release assets over HTTPS.
  * Verifies binary integrity with official SHA-256 before any execution.
  * Direct binary execution without shell interpolation (shell: false).

Platforms:
  * Windows: Full download, SHA-256 integrity verification, and launch.
  * macOS / Linux: Desktop installer is Windows-only. See web version options below.

Direct GitHub Releases:
  ${GITHUB_RELEASES_PAGE}

Source Repository:
  ${GITHUB_REPO_PAGE}
`.trim();
}

/**
 * Prompts user for interactive confirmation via readline interface.
 *
 * @param {string} question
 * @param {object} io
 * @param {NodeJS.ReadableStream} io.input
 * @param {NodeJS.WritableStream} io.output
 * @returns {Promise<boolean>}
 */
export async function promptConfirm(question, { input = process.stdin, output = process.stdout } = {}) {
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = String(answer).trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Main CLI execution entry point with dependency injection for testing.
 *
 * @param {string[]} argv
 * @param {object} [context]
 * @param {NodeJS.WritableStream} [context.stdout]
 * @param {NodeJS.WritableStream} [context.stderr]
 * @param {NodeJS.ReadableStream} [context.stdin]
 * @param {string} [context.platform]
 * @param {typeof fetch} [context.fetchFn]
 * @param {typeof import('node:child_process').spawn} [context.spawnFn]
 * @param {boolean} [context.isTTY]
 * @returns {Promise<number>} exit code (0 for success, non-zero for error)
 */
export async function run(argv = [], context = {}) {
  const stdout = context.stdout || process.stdout;
  const stderr = context.stderr || process.stderr;
  const stdin = context.stdin || process.stdin;
  const platform = context.platform || process.platform;
  const fetchFn = context.fetchFn || globalThis.fetch;
  const spawnFn = context.spawnFn;
  const isTTY = context.isTTY !== undefined ? context.isTTY : Boolean(stdin.isTTY);

  const print = (msg) => stdout.write(`${msg}\n`);
  const printErr = (msg) => stderr.write(`${msg}\n`);

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        yes: { type: 'boolean', short: 'y' },
        'download-only': { type: 'boolean', short: 'd' },
        'output-dir': { type: 'string', short: 'o' },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (err) {
    printErr(`Argument error: ${err.message}`);
    printErr('Run with --help to see available options.');
    return 1;
  }

  const { values } = parsed;

  if (values.help) {
    print(formatHelp());
    return 0;
  }

  if (values.version) {
    print(CLI_VERSION);
    return 0;
  }

  // Check platform: installer is Windows-only
  if (platform !== 'win32') {
    print(`\n[Notice] Local Tarot Draw desktop installer (.exe) is packaged for Windows.`);
    print(`Your current platform is "${platform}".`);
    print(`\nAlternative options:`);
    print(`1. Direct GitHub Releases page:`);
    print(`   ${GITHUB_RELEASES_PAGE}`);
    print(`2. Run the offline web version locally with Node.js:`);
    print(`   git clone ${GITHUB_REPO_PAGE}.git`);
    print(`   cd local-tarot-draw && npm install && npm run dev`);
    return 0;
  }

  print(`\n--- Local Tarot Draw Launcher (${CLI_PACKAGE_NAME} v${CLI_VERSION}) ---`);
  print(`Querying latest official release from GitHub...`);

  try {
    const release = await fetchLatestRelease({ fetchFn });
    const { exeAsset, sha256Asset, tagName } = selectReleaseAssets(release);

    print(`Selected release: ${tagName}`);
    print(`Target installer: ${exeAsset.name}`);

    const result = await downloadReleaseInstaller({
      exeAsset,
      sha256Asset,
      outputDir: values['output-dir'],
      fetchFn,
      onLog: (msg) => print(`  > ${msg}`),
    });

    print(`\n[Success] Verified file: ${result.filePath}`);
    print(`[Success] SHA-256: ${result.sha256}`);

    if (values['download-only']) {
      print('\n--download-only flag specified. Skipping installer launch.');
      print(`Installer is ready at: ${result.filePath}`);
      return 0;
    }

    let shouldLaunch = Boolean(values.yes);

    if (!shouldLaunch) {
      if (!isTTY) {
        print('\nNon-interactive terminal detected without --yes flag.');
        print('To launch automatically, run with --yes. Skipping launch.');
        print(`Installer is saved at: ${result.filePath}`);
        return 0;
      }

      const confirmed = await promptConfirm(
        '\nSHA-256 verified successfully. Do you want to launch the installer now? (y/N): ',
        { input: stdin, output: stdout }
      );

      shouldLaunch = confirmed;
    }

    if (shouldLaunch) {
      print('\nLaunching installer...');
      launchInstaller(result.filePath, { spawnFn });
      print('Installer started. Have a pleasant tarot experience!');
      return 0;
    } else {
      print('\nInstaller launch cancelled by user.');
      print(`Verified installer retained at: ${result.filePath}`);
      return 0;
    }
  } catch (err) {
    printErr(`\n[Error] ${err.message}`);
    return 1;
  }
}
