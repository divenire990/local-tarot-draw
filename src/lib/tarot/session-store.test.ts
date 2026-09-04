import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearSessions,
  createSession,
  cutSession,
  drawCard,
  getSessionForTesting,
  getSessionState,
  saveSession,
  shuffleSession,
} from "@/lib/tarot/session-store";

describe("session-store", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tarot-records-"));
    process.env.TAROT_RECORDS_DIR = tempDir;
    await clearSessions();
  });

  afterEach(async () => {
    await clearSessions();
    delete process.env.TAROT_RECORDS_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("洗牌后仍为 78 张且无重复", async () => {
    const created = await createSession("three-card", "测试问题");
    const summary = await shuffleSession(created.sessionId);
    const state = await getSessionState(created.sessionId);
    const session = await getSessionForTesting(created.sessionId);

    expect(summary.shuffled).toBe(true);
    expect(state.remainingDeck).toHaveLength(78);
    const ids = session.deckOrder.map((card) => card.card.cardId);
    expect(new Set(ids).size).toBe(78);
  });

  it("连续抽牌不会抽到重复卡，且牌位映射正确", async () => {
    const created = await createSession("three-card", "测试问题");
    await shuffleSession(created.sessionId);
    await cutSession(created.sessionId);

    const first = await drawCard(created.sessionId, { selectedIndex: 0, slot: 1 });
    const second = await drawCard(created.sessionId, { selectedIndex: 0, slot: 2 });
    const third = await drawCard(created.sessionId, { selectedIndex: 0, slot: 3 });

    expect(first.draw.positionId).toBe("past");
    expect(second.draw.positionId).toBe("present");
    expect(third.draw.positionId).toBe("future");

    const ids = [first.draw.cardId, second.draw.cardId, third.draw.cardId];
    expect(new Set(ids).size).toBe(3);

    for (const draw of [first.draw, second.draw, third.draw]) {
      expect(["upright", "reversed"]).toContain(draw.orientation);
    }
  });

  it("save 会创建独立文件夹并写入 matching reading.json", async () => {
    const created = await createSession("single-card", "我今天该注意什么");
    await shuffleSession(created.sessionId);
    const draw = await drawCard(created.sessionId, { selectedIndex: 3, slot: 1 });

    const saved = await saveSession(created.sessionId);
    const fileContent = await readFile(saved.filePath, "utf8");
    const reading = JSON.parse(fileContent) as {
      question: string;
      spread: { id: string; slotCount: number };
      cards: Array<{ cardId: string }>;
    };

    expect(saved.folderPath.startsWith(tempDir)).toBe(true);
    expect(reading.question).toBe("我今天该注意什么");
    expect(reading.spread.id).toBe("single-card");
    expect(reading.spread.slotCount).toBe(1);
    expect(reading.cards[0]?.cardId).toBe(draw.draw.cardId);
  });

  it("未抽满牌阵时不允许保存", async () => {
    const created = await createSession("three-card", "不完整测试");
    await shuffleSession(created.sessionId);
    await drawCard(created.sessionId, { selectedIndex: 1, slot: 1 });

    await expect(saveSession(created.sessionId)).rejects.toThrow("牌阵尚未抽满");
  });

  it("凯尔特十字牌位映射完整", async () => {
    const created = await createSession("celtic-cross", "");
    await shuffleSession(created.sessionId);

    for (let slot = 1; slot <= 10; slot += 1) {
      await drawCard(created.sessionId, { selectedIndex: 0, slot });
    }

    const state = await getSessionState(created.sessionId);
    expect(state.draws).toHaveLength(10);
    expect(state.draws[0]?.positionId).toBe("present");
    expect(state.draws[9]?.positionId).toBe("outcome");
  });

  it("会话写入磁盘后可跨调用重新读取", async () => {
    const created = await createSession("three-card", "跨请求测试");
    await shuffleSession(created.sessionId);

    const state = await getSessionState(created.sessionId);

    expect(state.sessionId).toBe(created.sessionId);
    expect(state.shuffled).toBe(true);
    expect(state.remainingDeck).toHaveLength(78);
  });
});
