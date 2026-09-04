import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { tarotDeck } from "@/lib/tarot/cards";
import { getRecordsDirectory } from "@/lib/tarot/config";
import type { DrawCardInput } from "@/lib/tarot/schemas";
import { getSpreadDefinition } from "@/lib/tarot/spreads";
import type { ReadingFile, SessionDrawRecord, TarotSession } from "@/lib/tarot/types";
import {
  clampSelectedIndex,
  copyToRemaining,
  createIsoTimestamp,
  createTimestamp,
  cutDeck,
  generateId,
  sanitizeFolderSegment,
  shuffleDeck,
} from "@/lib/tarot/utils";

function getSessionsDirectory() {
  return path.join(getRecordsDirectory(), ".tarot-sessions");
}

function getSessionFilePath(sessionId: string) {
  return path.join(getSessionsDirectory(), `${sessionId}.json`);
}

async function persistSession(session: TarotSession) {
  await mkdir(getSessionsDirectory(), { recursive: true });
  await writeFile(
    getSessionFilePath(session.sessionId),
    `${JSON.stringify(session, null, 2)}\n`,
    "utf8",
  );
}

async function loadSession(sessionId: string): Promise<TarotSession> {
  try {
    const raw = await readFile(getSessionFilePath(sessionId), "utf8");
    return JSON.parse(raw) as TarotSession;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error("抽牌会话不存在或已失效。");
    }

    throw error;
  }
}

export async function createSession(
  spreadId: TarotSession["spreadId"],
  question = "",
) {
  const spread = getSpreadDefinition(spreadId);
  const sessionId = generateId();
  const readingId = generateId();

  const session: TarotSession = {
    sessionId,
    readingId,
    createdAt: createIsoTimestamp(),
    question,
    spreadId,
    shuffled: false,
    cutPerformed: false,
    deckOrder: [],
    draws: [],
    consumedIndices: [],
  };

  await persistSession(session);

  return {
    sessionId,
    spread,
    remainingCount: spread.slotCount,
    readingId,
  };
}

export async function requireSession(sessionId: string): Promise<TarotSession> {
  return loadSession(sessionId);
}

export async function shuffleSession(sessionId: string) {
  const session = await requireSession(sessionId);
  session.deckOrder = shuffleDeck(tarotDeck);
  session.shuffled = true;
  session.cutPerformed = false;
  session.draws = [];
  session.consumedIndices = [];
  await persistSession(session);

  return summarizeSession(session);
}

export async function cutSession(sessionId: string) {
  const session = await requireSession(sessionId);
  if (!session.shuffled) {
    throw new Error("尚未洗牌，不能切牌。");
  }

  if (session.draws.length > 0) {
    throw new Error("已开始抽牌，不能再切牌。");
  }

  session.deckOrder = cutDeck(session.deckOrder);
  session.cutPerformed = true;
  await persistSession(session);

  return summarizeSession(session);
}

export async function drawCard(sessionId: string, input: DrawCardInput) {
  const session = await requireSession(sessionId);
  const spread = getSpreadDefinition(session.spreadId);

  if (!session.shuffled) {
    throw new Error("尚未洗牌，不能抽牌。");
  }

  if (session.draws.length >= spread.slotCount) {
    throw new Error("当前牌阵已抽满。");
  }

  if (input.slot !== session.draws.length + 1) {
    throw new Error("抽牌顺序不正确。");
  }

  const remainingDeck = copyToRemaining(session.deckOrder, session.consumedIndices);
  const selectedIndex = clampSelectedIndex(input.selectedIndex, remainingDeck.length);
  const selectedCard = remainingDeck[selectedIndex];
  const absoluteIndex = session.deckOrder.findIndex(
    (item, index) =>
      !session.consumedIndices.includes(index) &&
      item.card.cardId === selectedCard.card.cardId &&
      item.orientation === selectedCard.orientation,
  );

  if (absoluteIndex < 0) {
    throw new Error("未找到所选卡牌。");
  }

  const position = spread.positions[input.slot - 1];
  const record: SessionDrawRecord = {
    slot: input.slot,
    positionId: position.positionId,
    positionZh: position.positionZh,
    cardId: selectedCard.card.cardId,
    nameZh: selectedCard.card.nameZh,
    nameEn: selectedCard.card.nameEn,
    orientation: selectedCard.orientation,
    selectedIndex,
    drawnAt: createIsoTimestamp(),
  };

  session.draws.push(record);
  session.consumedIndices.push(absoluteIndex);
  await persistSession(session);

  return {
    draw: {
      ...record,
      imagePath: selectedCard.card.imagePath,
    },
    remainingCount: spread.slotCount - session.draws.length,
    spread,
  };
}

export async function saveSession(sessionId: string) {
  const session = await requireSession(sessionId);
  const spread = getSpreadDefinition(session.spreadId);

  if (!session.shuffled) {
    throw new Error("尚未洗牌，不能保存。");
  }

  if (session.draws.length !== spread.slotCount) {
    throw new Error("牌阵尚未抽满，不能保存。");
  }

  const folderName = sanitizeFolderSegment(
    `${createTimestamp(new Date())}_${spread.id}_${session.readingId}`,
  );
  const folderPath = path.join(getRecordsDirectory(), folderName);
  const filePath = path.join(folderPath, "reading.json");

  const reading: ReadingFile = {
    version: 1,
    readingId: session.readingId,
    createdAt: session.createdAt,
    question: session.question,
    deck: {
      id: "rider-waite-smith",
      nameZh: "韦特塔罗",
      size: 78,
    },
    spread: {
      id: spread.id,
      nameZh: spread.nameZh,
      slotCount: spread.slotCount,
    },
    ritual: {
      shuffled: session.shuffled,
      cutPerformed: session.cutPerformed,
    },
    cards: session.draws,
  };

  await mkdir(folderPath, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(reading, null, 2)}\n`, "utf8");

  return {
    readingId: session.readingId,
    folderPath,
    filePath,
    reading,
  };
}

export function summarizeSession(session: TarotSession) {
  const spread = getSpreadDefinition(session.spreadId);
  return {
    sessionId: session.sessionId,
    readingId: session.readingId,
    spread,
    shuffled: session.shuffled,
    cutPerformed: session.cutPerformed,
    remainingCount: spread.slotCount - session.draws.length,
    drawCount: session.draws.length,
  };
}

export async function getRemainingDeckPreview(sessionId: string) {
  const session = await requireSession(sessionId);
  const remainingDeck = copyToRemaining(session.deckOrder, session.consumedIndices);

  return remainingDeck.map((item, index) => ({
    index,
    previewId: `${session.sessionId}-${index}`,
    backImagePath: "/cards/rider-waite-smith/back.png",
  }));
}

export async function getSessionState(sessionId: string) {
  const session = await requireSession(sessionId);
  return {
    ...summarizeSession(session),
    draws: session.draws,
    remainingDeck: await getRemainingDeckPreview(sessionId),
  };
}

export async function getSessionForTesting(sessionId: string) {
  return requireSession(sessionId);
}

export async function clearSessions() {
  const sessionsDirectory = getSessionsDirectory();

  try {
    const files = await readdir(sessionsDirectory);
    await Promise.all(
      files
        .filter((fileName) => fileName.endsWith(".json"))
        .map((fileName) => rm(path.join(sessionsDirectory, fileName), { force: true })),
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
}
