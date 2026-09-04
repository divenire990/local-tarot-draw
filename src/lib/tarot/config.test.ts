import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_RECORDS_DIR, getDefaultRecordsDir, getRecordsDirectory } from "./config";

describe("tarot config", () => {
  it("uses portable user documents directory by default", () => {
    const expected = path.join(os.homedir(), "Documents", "TarotDraws");
    expect(getDefaultRecordsDir()).toBe(expected);
    expect(DEFAULT_RECORDS_DIR).toBe(expected);
  });

  it("respects TAROT_RECORDS_DIR environment variable override", () => {
    const original = process.env.TAROT_RECORDS_DIR;
    try {
      const customPath = path.resolve("./custom-records");
      process.env.TAROT_RECORDS_DIR = "./custom-records";
      expect(getRecordsDirectory()).toBe(customPath);
    } finally {
      if (original === undefined) {
        delete process.env.TAROT_RECORDS_DIR;
      } else {
        process.env.TAROT_RECORDS_DIR = original;
      }
    }
  });
});
