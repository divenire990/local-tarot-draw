import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const baseUrl = process.env.TAROT_APP_URL ?? "http://localhost:3000";
const outputDir = path.resolve("output/playwright");
const screenshotPath = path.join(outputDir, "final-homepage.png");

async function assertEnabled(locator, name) {
  const enabled = await locator.isEnabled();
  if (!enabled) {
    throw new Error(`${name} 当前不可点击。`);
  }
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
  });

  const page = await browser.newPage({
    viewport: {
      width: 1728,
      height: 972,
    },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(baseUrl, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    await page.getByTestId("tarot-desktop").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "三张牌阵" }).click();

    const createButton = page.getByTestId("create-session-button");
    await assertEnabled(createButton, "创建会话按钮");
    await createButton.click();

    await page.getByTestId("feedback-line").getByText("抽牌会话已创建，下一步先洗牌。").waitFor({
      timeout: 10_000,
    });

    const shuffleButton = page.getByTestId("shuffle-button");
    await assertEnabled(shuffleButton, "洗牌按钮");
    await shuffleButton.click();
    await page.getByTestId("feedback-line").getByText("已完成洗牌，请继续切牌。").waitFor({
      timeout: 10_000,
    });

    const cutButton = page.getByTestId("cut-button");
    await assertEnabled(cutButton, "切牌按钮");
    await cutButton.click();
    await page.getByTestId("feedback-line").getByText("切牌完成，请从下方牌堆中点击选牌。").waitFor({
      timeout: 10_000,
    });

    for (let drawIndex = 0; drawIndex < 3; drawIndex += 1) {
      const card = page.locator("[data-testid^='deck-card-']").last();
      await assertEnabled(card, `第 ${drawIndex + 1} 张牌`);
      await card.click();
      await page.getByTestId(`reading-card-${drawIndex + 1}`).waitFor({ timeout: 10_000 });
    }

    const saveButton = page.getByTestId("save-reading-button");
    await page.getByTestId("reading-card-3").waitFor({ timeout: 10_000 });
    await page.waitForFunction(() => {
      const button = document.querySelector("[data-testid='save-reading-button']");
      return button instanceof HTMLButtonElement && !button.disabled;
    });
    await assertEnabled(saveButton, "保存按钮");
    await saveButton.click();

    await page.getByText("已保存为本地 reading.json").waitFor({ timeout: 10_000 });
    await page.getByTestId("save-box").waitFor({ state: "visible" });

    const saveBoxText = await page.getByTestId("save-box").innerText();
    if (!saveBoxText.includes("reading.json")) {
      throw new Error("保存结果区域未出现 reading.json 路径。");
    }

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`视觉审查截图已生成：${screenshotPath}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
