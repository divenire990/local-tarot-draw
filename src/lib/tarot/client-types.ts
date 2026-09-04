import type { ReadingFile, SessionDrawRecord, SpreadDefinition } from "@/lib/tarot/types";

export interface RemainingCardPreview {
  index: number;
  previewId: string;
  backImagePath: string;
}

export interface SessionStatePayload {
  sessionId: string;
  readingId: string;
  spread: SpreadDefinition;
  shuffled: boolean;
  cutPerformed: boolean;
  remainingCount: number;
  drawCount: number;
  draws: SessionDrawRecord[];
  remainingDeck: RemainingCardPreview[];
}

export interface SaveResultPayload {
  readingId: string;
  folderPath: string;
  filePath: string;
  reading: ReadingFile;
}
