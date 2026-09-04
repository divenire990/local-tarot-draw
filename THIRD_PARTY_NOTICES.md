# 第三方与公有领域资产说明 (Third-Party and Public Domain Notices)

本项目（Local Tarot Draw / 本地塔罗抽牌器）致力于遵循开源许可规范与知识产权伦理。除本项目自身代码遵循 MIT 许可证外，仓库中包含或引用的视觉资源、卡牌数据及开源依赖遵循以下授权与溯源声明。

> **⚠️ 法律免责声明 (Legal Disclaimer)**：本文档所提供之版权状态与法律依据仅供事实溯源与参考，**不构成任何形式的法律建议 (Not Legal Advice)**。版权法律因司法管辖区而异；在部分国家或地区，版权保护期可能长于创作者去世后 70 年。下游使用者、开发者及再分发者在特定司法管辖区使用或分发本项目资源时，必须自行核实并遵守所在地法律法规。

---

## 1. 经典韦特塔罗牌面艺术 (Rider-Waite-Smith Tarot Deck Artwork)

### 1.1 基本创作信息
- **作品名称**：Rider-Waite-Smith (RWS) Tarot Deck (Original 1909 Edition)
- **绘师 (Artist)**：Pamela Colman Smith (1878–1951)
- **设计与构想 (Concept & Direction)**：Arthur Edward Waite (1857–1942)
- **最初出版商 (Original Publisher)**：William Rider & Son (London, United Kingdom), December 1909

### 1.2 经过验证的法域与期限依据 (Verified Jurisdictions & Term Basis)
- **美国 (United States)**：
  - 该套卡牌印刷艺术品首次出版于 1909 年 12 月（早于 1931 年 1 月 1 日），根据美国版权法（17 U.S.C. § 304）及美国公有领域规则，原始印刷品及无独立独创性的数字扫描版在美国处于**公有领域 (Public Domain in the United States)**。
- **英国与欧盟 (United Kingdom & European Union)**：
  - 根据英国《版权、外观设计和专利法》(CDPA 1988) 及欧盟版权指令（Directive 2006/116/EC），文学艺术作品的版权保护期为创作者去世后 70 年（70 years post mortem auctoris）。
  - 绘师 Pamela Colman Smith 于 1951 年 9 月逝世，设计者 Arthur Edward Waite 于 1942 年 5 月逝世。至 2022 年 1 月 1 日，Pamela Colman Smith 的 70 年著作权保护期已在英国及欧盟全境正式届满。
  - 因此，在适用创作者终生加 70 年（life+70）或更短保护期的司法管辖区，该套卡牌艺术已处于**公有领域**。
- **管辖区限制提示 (Jurisdictional Limitations Notice)**：
  - 少数国家/地区的著作权保护期长于作者逝后 70 年（例如墨西哥为 life+100 等）。
  - 不同法域对于平面艺术作品的忠实数字化扫描（slavish digital reproduction / non-original photographic reproduction）是否产生新的邻接权或版式设计权持有不同法律标准（例如美国联邦第二巡回法院 *Bridgeman Art Library v. Corel Corp.* 判例认定公有领域艺术品的忠实翻照不具有独创性，不享有新版权；但在个别大陆法系国家可能存在不同的学术观点或司法判例）。
  - 因此，本项目**不对所有法域作普适公有领域的绝对法律抗辩 (does not make a universal public-domain claim across all jurisdictions)**，下游用户需依所在地具体法律规范自行评估。

### 1.3 原始艺术与现代再着色/扫描版本的区分 (Original Art vs. Modern Recoloring)
- 本项目所采用并分发的素材**严格来源于 1909 年历史最初版印刷品公有领域扫描件**，保留了历史原版的线条骨架与原始色彩特征。
- 本项目**严禁且绝不分发**任何现代商业出版机构（如 U.S. Games Systems 等）享有独创版权的修复增强版、重新着色版或现代衍生版本（如 *The Rider Tarot Deck* 1971 年着色版、*Universal Waite* 等）。

### 1.4 实际分发文件的确切文件级映射与可点击溯源 (Exact Asset Provenance & Clickable Sources)
本项目中分发的 78 张卡牌位于本地目录 `public/cards/rider-waite-smith/`，其命名规则与文件映射如下：
- **大阿卡纳 (Major Arcana, 22 张)**：`major/0m.jpg`（愚者）至 `major/21m.jpg`（世界）。
- **圣杯组 (Suit of Cups, 14 张)**：`cups/1c.jpg` 至 `cups/10c.jpg`，`cups/pc.jpg`（侍从），`cups/nc.jpg`（骑士），`cups/qc.jpg`（王后），`cups/kc.jpg`（国王）。
- **权杖组 (Suit of Wands, 14 张)**：`wands/1w.jpg` 至 `wands/10w.jpg`，`wands/pw.jpg`，`wands/nw.jpg`，`wands/qw.jpg`，`wands/kw.jpg`。
- **宝剑组 (Suit of Swords, 14 张)**：`swords/1s.jpg` 至 `swords/10s.jpg`，`swords/ps.jpg`，`swords/ns.jpg`，`swords/qs.jpg`，`swords/ks.jpg`。
- **星币组 (Suit of Pentacles, 14 张)**：`pentacles/1p.jpg` 至 `pentacles/10p.jpg`，`pentacles/pp.jpg`，`pentacles/np.jpg`，`pentacles/qp.jpg`，`pentacles/kp.jpg`。

**确切可点击来源索引**：
1. **直接分发包来源 (Direct Distribution Source)**：
   - npm 软件包：[`tarot-card-img` (v0.1.0, published by smrsan)](https://www.npmjs.com/package/tarot-card-img)
   - CDN 镜像归档索引：[`https://cdn.jsdelivr.net/npm/tarot-card-img@0.1.0/`](https://cdn.jsdelivr.net/npm/tarot-card-img@0.1.0/)
2. **权威公有领域馆藏与上游档案分类 (Authoritative Archive Provenance)**：
   - 维基共享资源总分类：[Wikimedia Commons: Category:Rider-Waite tarot deck](https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck)
   - 1909 年最初版专题分类：[Wikimedia Commons: Category:1909 Rider-Waite-Smith tarot deck](https://commons.wikimedia.org/wiki/Category:1909_Rider-Waite-Smith_tarot_deck)
   - 代表性对应档案条目：
     - 00 愚者 (The Fool, `0m.jpg`)：[Wikimedia Commons - File:RWS_Tarot_00_Fool.jpg](https://commons.wikimedia.org/wiki/File:RWS_Tarot_00_Fool.jpg)
     - 01 魔术师 (The Magician, `1m.jpg`)：[Wikimedia Commons - File:RWS_Tarot_01_Magician.jpg](https://commons.wikimedia.org/wiki/File:RWS_Tarot_01_Magician.jpg)
     - 16 高塔 (The Tower, `16m.jpg`)：[Wikimedia Commons - File:RWS_Tarot_16_Tower.jpg](https://commons.wikimedia.org/wiki/File:RWS_Tarot_16_Tower.jpg)
     - 权杖王牌 (Ace of Wands, `1w.jpg`)：[Wikimedia Commons - File:Wands01.jpg](https://commons.wikimedia.org/wiki/File:Wands01.jpg)
     - 圣杯王牌 (Ace of Cups, `1c.jpg`)：[Wikimedia Commons - File:Cups01.jpg](https://commons.wikimedia.org/wiki/File:Cups01.jpg)
     - 宝剑七 (Seven of Swords, `7s.jpg`)：[Wikimedia Commons - File:Swords07.jpg](https://commons.wikimedia.org/wiki/File:Swords07.jpg)
     - 星币王牌 (Ace of Pentacles, `1p.jpg`)：[Wikimedia Commons - File:Pents01.jpg](https://commons.wikimedia.org/wiki/File:Pents01.jpg)

---

## 2. 卡牌背面设计 (Card Back Artwork)

- **资源路径**：`public/cards/rider-waite-smith/back.png`
- **创作者**：Local Tarot Draw Project
- **授权协议**：**[Creative Commons CC0 1.0 Universal (Public Domain Dedication)](https://creativecommons.org/publicdomain/zero/1.0/)**
- **说明**：采用专有设计的双向完全对称古典星象、神圣几何与八芒星天体纹理，确保洗牌与正逆位翻牌时的视觉不可预测性。任何人均可自由使用、复制、分发或修改，无需署名或许可授权。

---

## 3. 应用图标 (Application Icon)

- **资源路径**：`build/icon.ico`
- **授权协议**：**MIT License** (随着本项目源码一同分发)

---

## 4. 主要开源依赖项目声明 (Open Source Software Dependencies)

本项目构建于优秀的开源生态之上，关键直接依赖及其协议声明如下：

| 组件 / 库名 | 协议 (License) | 用途说明 | 上游链接 |
| :--- | :--- | :--- | :--- |
| **Electron** | MIT License | 跨平台桌面应用外壳与本地窗口管理 | [electron/electron](https://github.com/electron/electron) |
| **Next.js** | MIT License | React 服务端与静态资源渲染框架 | [vercel/next.js](https://github.com/vercel/next.js) |
| **React / React-DOM** | MIT License | 用户界面组件树与响应式状态渲染 | [facebook/react](https://github.com/facebook/react) |
| **Motion** | MIT License | 卡牌发牌、洗牌、翻转等流畅平滑动画 | [motiondivision/motion](https://github.com/motiondivision/motion) |
| **Zustand** | MIT License | 前端轻量会话与状态同步 | [pmndrs/zustand](https://github.com/pmndrs/zustand) |
| **Zod** | MIT License | 抽牌会话、牌阵及数据接口强类型校验 | [colinhacks/zod](https://github.com/colinhacks/zod) |
| **Tailwind CSS** | MIT License | 现代化实用类样式构建 | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| **Vitest** | MIT License | 单元测试与覆盖率自动化验证 | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |
| **Playwright** | Apache License 2.0 | 端到端与视觉交互验证 | [microsoft/playwright](https://github.com/microsoft/playwright) |
| **electron-builder** | MIT License | Windows 桌面安装包自动化打包 | [electron-userland/electron-builder](https://github.com/electron-userland/electron-builder) |

完整的第三方直接与间接依赖源码许可证均保留在各自的发布包中。
