# Contributing to Local Tarot Draw

Thank you for your interest in contributing to **Local Tarot Draw (本地塔罗抽牌器)**! We welcome bug reports, feature suggestions, documentation enhancements, and pull requests.

## Code of Conduct

Please be respectful, constructive, and considerate when interacting in issues, discussions, and pull requests.

## Workflow & Development Setup

1. **Prerequisites**:
   - Node.js 20+ (LTS recommended)
   - npm 10+
2. **Clone & Install**:
   ```bash
   git clone https://github.com/divenire990/local-tarot-draw.git
   cd local-tarot-draw
   npm install
   ```
3. **Local Development**:
   - Web development mode: `npm run dev` (starts on `http://localhost:3000`)
   - Desktop development mode: `npm run dev:desktop` (starts Next.js and launches Electron)
4. **Testing & Code Quality**:
   - Run tests: `npm test`
   - Run linter: `npm run lint`
   - Production web build: `npm run build`
   - Desktop packaging: `npm run build:desktop`

## Pull Request Guidelines

- Ensure all existing tests pass (`npm test`) and new functionality includes unit or integration tests.
- Keep commits focused, descriptive, and adhering to conventional commit styles where appropriate.
- Avoid committing binary build artifacts (`dist-desktop/`, `output/`), secret credentials, or personal machine-specific paths.
- All visual assets must have clear license provenance (Public Domain or MIT/CC0).

---

# 贡献指南 (中文)

感谢关注与支持 **Local Tarot Draw (本地塔罗抽牌器)**！我们欢迎任何形式的贡献，包括问题反馈、功能建议、文档完善与代码提交。

## 开发与提交规范

1. **环境准备**：Node.js 20+，npm 10+。
2. **本地测试与检查**：提交 PR 前请务必确保 `npm test`、`npm run lint` 与 `npm run build` 全部通过。
3. **资源合规**：本项目所有卡牌美术与视觉资源严格要求清晰的公有领域（Public Domain）或 CC0 许可。严禁引入任何带有现代再着色商业独创性版权的资源。
4. **隐私与便携**：代码中不得硬编码个人机器特定路径，确保跨平台可移植性。
