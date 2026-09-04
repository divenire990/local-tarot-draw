import type { SpreadDefinition, SpreadId } from "@/lib/tarot/types";

export const spreadDefinitions: Record<SpreadId, SpreadDefinition> = {
  "single-card": {
    id: "single-card",
    nameZh: "单张牌阵",
    slotCount: 1,
    positions: [{ slot: 1, positionId: "current", positionZh: "当前" }],
  },
  "three-card": {
    id: "three-card",
    nameZh: "三张牌阵",
    slotCount: 3,
    positions: [
      { slot: 1, positionId: "past", positionZh: "过去" },
      { slot: 2, positionId: "present", positionZh: "现在" },
      { slot: 3, positionId: "future", positionZh: "未来" },
    ],
  },
  "celtic-cross": {
    id: "celtic-cross",
    nameZh: "凯尔特十字",
    slotCount: 10,
    positions: [
      { slot: 1, positionId: "present", positionZh: "现状" },
      { slot: 2, positionId: "crossing", positionZh: "阻碍" },
      { slot: 3, positionId: "foundation", positionZh: "根基" },
      { slot: 4, positionId: "past", positionZh: "过去" },
      { slot: 5, positionId: "conscious", positionZh: "显意识" },
      { slot: 6, positionId: "near-future", positionZh: "近期发展" },
      { slot: 7, positionId: "self", positionZh: "你的状态" },
      { slot: 8, positionId: "environment", positionZh: "外部环境" },
      { slot: 9, positionId: "hopes-fears", positionZh: "希望与恐惧" },
      { slot: 10, positionId: "outcome", positionZh: "结果走向" },
    ],
  },
};

export function getSpreadDefinition(spreadId: SpreadId): SpreadDefinition {
  return spreadDefinitions[spreadId];
}
