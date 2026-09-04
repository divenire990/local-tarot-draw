import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { tarotDeck } from "@/lib/tarot/cards";

describe("tarotDeck", () => {
  it("包含完整的 78 张韦特牌", () => {
    expect(tarotDeck).toHaveLength(78);
  });

  it("每张牌的 cardId 都唯一", () => {
    const ids = tarotDeck.map((card) => card.cardId);
    expect(new Set(ids).size).toBe(78);
  });

  it("每张牌的图片路径都能解析到本地 public 目录", () => {
    for (const card of tarotDeck) {
      const relative = card.imagePath.replace(/^\//, "").replaceAll("/", path.sep);
      const absolute = path.join(process.cwd(), "public", relative);
      expect(existsSync(absolute), `${card.cardId} 图片缺失：${absolute}`).toBe(true);
    }
  });
});
