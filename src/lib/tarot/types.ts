export type Arcana = "major" | "minor";

export type Suit = "wands" | "cups" | "swords" | "pentacles" | null;

export type Orientation = "upright" | "reversed";

export type SpreadId = "single-card" | "three-card" | "celtic-cross";

export interface TarotCard {
  cardId: string;
  nameZh: string;
  nameEn: string;
  arcana: Arcana;
  suit: Suit;
  rank: string;
  imagePath: string;
}

export interface SpreadPosition {
  slot: number;
  positionId: string;
  positionZh: string;
}

export interface SpreadDefinition {
  id: SpreadId;
  nameZh: string;
  slotCount: number;
  positions: SpreadPosition[];
}

export interface SessionDrawRecord {
  slot: number;
  positionId: string;
  positionZh: string;
  cardId: string;
  nameZh: string;
  nameEn: string;
  orientation: Orientation;
  selectedIndex: number;
  drawnAt: string;
}

export interface SessionCardState {
  card: TarotCard;
  orientation: Orientation;
}

export interface TarotSession {
  sessionId: string;
  readingId: string;
  createdAt: string;
  question: string;
  spreadId: SpreadId;
  shuffled: boolean;
  cutPerformed: boolean;
  deckOrder: SessionCardState[];
  draws: SessionDrawRecord[];
  consumedIndices: number[];
}

export interface ReadingFile {
  version: 1;
  readingId: string;
  createdAt: string;
  question: string;
  deck: {
    id: "rider-waite-smith";
    nameZh: "韦特塔罗";
    size: 78;
  };
  spread: {
    id: SpreadId;
    nameZh: string;
    slotCount: number;
  };
  ritual: {
    shuffled: boolean;
    cutPerformed: boolean;
  };
  cards: SessionDrawRecord[];
}
