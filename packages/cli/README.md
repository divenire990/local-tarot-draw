# @divenire990/local-tarot-draw

Lightweight, secure, and zero-runtime-dependency CLI launcher for **Local Tarot Draw (本地塔罗抽牌器)**.

Fetches the latest official GitHub Release for Windows, validates asset integrity against official SHA-256 checksums, and launches the desktop installer safely.

---

## 🚀 Quickstart

Run directly without installation via `npx`:

```bash
npx @divenire990/local-tarot-draw
```

Or install globally:

```bash
npm install -g @divenire990/local-tarot-draw
local-tarot-draw
```

---

## ⚙️ Options & Usage

```text
Usage: local-tarot-draw [options]

Options:
  -y, --yes            Skip launch confirmation after SHA-256 verification
  -d, --download-only  Download and verify installer without launching
  -o, --output-dir     Directory to store the verified installer
  -v, --version        Display CLI version
  -h, --help           Display this help message
```

### Examples

- **Standard interactive workflow** (download -> verify SHA-256 -> prompt to launch):
  ```bash
  npx @divenire990/local-tarot-draw
  ```
- **Non-interactive unattended run**:
  ```bash
  npx @divenire990/local-tarot-draw --yes
  ```
- **Download and verify only** (e.g. for inspection or manual installation):
  ```bash
  npx @divenire990/local-tarot-draw --download-only
  ```
- **Specify download target directory**:
  ```bash
  npx @divenire990/local-tarot-draw --download-only -o ./downloads
  ```

---

## 🔒 Security Architecture & Guarantees

1. **Zero Runtime Dependencies**: Written entirely using Node.js built-in modules (`node:crypto`, `node:fs`, `node:https`, `node:child_process`, `node:os`).
2. **No Postinstall Scripts**: The package never runs postinstall scripts. Network queries and file writes occur exclusively during explicit user execution.
3. **Strict URL Validation**:
   - Downloads are strictly restricted to official GitHub Release assets from `divenire990/local-tarot-draw`.
   - Only `https:` protocol and whitelisted GitHub hosts (`github.com`, `objects.githubusercontent.com`, `github-releases.githubusercontent.com`) are accepted.
4. **Mandatory SHA-256 Checksum Verification**:
   - The installer is streamed to a secure isolated temporary directory.
   - The SHA-256 checksum is computed during download and verified against the official `.sha256` asset published in the GitHub Release.
   - If verification fails, the installer is immediately deleted and execution is halted. It will **never** be executed upon checksum mismatch.
5. **Safe Process Spawning**:
   - Launching the installer is executed without `shell: true`, completely avoiding shell interpolation and command injection risks.
   - Interactive confirmation is requested before launching unless `--yes` is specified.

---

## 💻 Platform Support

- **Windows**: Full automated download, SHA-256 verification, and installer launch.
- **macOS / Linux**: The desktop installer (`.exe`) is built for Windows. On non-Windows platforms, the CLI provides helpful instructions and direct links to GitHub Releases and local web setup.

---

## 📦 Direct Release Download Alternative

If you prefer not to use npm or Node.js, download the installer and verify checksums manually:

- GitHub Releases: [https://github.com/divenire990/local-tarot-draw/releases](https://github.com/divenire990/local-tarot-draw/releases)
- Repository: [https://github.com/divenire990/local-tarot-draw](https://github.com/divenire990/local-tarot-draw)

---

## 📜 License

[MIT](LICENSE) © 2026 Divenire
