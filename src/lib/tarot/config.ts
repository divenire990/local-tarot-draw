import os from "node:os";
import path from "node:path";

export function getDefaultRecordsDir(): string {
  return path.join(os.homedir(), "Documents", "TarotDraws");
}

export const DEFAULT_RECORDS_DIR = getDefaultRecordsDir();

export function getRecordsDirectory(): string {
  const configured = process.env.TAROT_RECORDS_DIR?.trim();
  return configured ? path.resolve(configured) : getDefaultRecordsDir();
}
