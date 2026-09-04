import { randomInt, randomUUID } from "node:crypto";

import type { Orientation, SessionCardState, TarotCard } from "@/lib/tarot/types";

export function generateId(): string {
  return randomUUID();
}

export function createTimestamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function createIsoTimestamp(date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}${sign}${hours}:${minutes}`;
}

export function shuffleDeck(cards: TarotCard[]): SessionCardState[] {
  const items: SessionCardState[] = cards.map((card) => ({
    card,
    orientation: randomInt(0, 2) === 0 ? "upright" : "reversed",
  }));

  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

export function cutDeck(cards: SessionCardState[]): SessionCardState[] {
  if (cards.length < 2) {
    return cards;
  }

  const cutIndex = randomInt(1, cards.length);
  return [...cards.slice(cutIndex), ...cards.slice(0, cutIndex)];
}

export function clampSelectedIndex(selectedIndex: number, remainingCount: number): number {
  if (!Number.isInteger(selectedIndex)) {
    throw new Error("所选牌索引必须是整数。");
  }

  if (selectedIndex < 0 || selectedIndex >= remainingCount) {
    throw new Error("所选牌索引超出剩余牌范围。");
  }

  return selectedIndex;
}

export function sanitizeFolderSegment(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-");
}

export function copyToRemaining<T>(items: T[], usedIndices: number[]): T[] {
  const excluded = new Set(usedIndices);
  return items.filter((_, index) => !excluded.has(index));
}

export function assertOrientation(value: string): Orientation {
  if (value !== "upright" && value !== "reversed") {
    throw new Error("无效的正逆位值。");
  }

  return value;
}
