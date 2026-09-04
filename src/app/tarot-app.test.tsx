import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TarotApp } from "@/app/tarot-app";
import type { SessionStatePayload } from "@/lib/tarot/client-types";

const initialSession: SessionStatePayload = {
  sessionId: "session-1",
  readingId: "reading-1",
  spread: {
    id: "three-card",
    nameZh: "三张牌阵",
    slotCount: 3,
    positions: [
      { slot: 1, positionId: "past", positionZh: "过去" },
      { slot: 2, positionId: "present", positionZh: "现在" },
      { slot: 3, positionId: "future", positionZh: "未来" },
    ],
  },
  shuffled: false,
  cutPerformed: false,
  remainingCount: 3,
  drawCount: 0,
  draws: [],
  remainingDeck: [],
};

describe("TarotApp", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("未洗牌时，抽牌和保存流程不可用", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: "session-1", readingId: "reading-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialSession,
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TarotApp />);

    fireEvent.click(screen.getByRole("button", { name: /创建抽牌会话/i }));

    await waitFor(() => {
      expect(screen.getAllByText("抽牌会话已创建，下一步先洗牌。").length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("button", { name: "切牌" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "⌘ 保存本次抽牌" })).toBeDisabled();
    expect(screen.getByText("先点击“洗牌”，牌堆才会铺开。")).toBeInTheDocument();
  });

  it("保存成功后显示绝对文件路径", async () => {
    const shuffledSession: SessionStatePayload = {
      ...initialSession,
      shuffled: true,
      cutPerformed: true,
      remainingCount: 0,
      drawCount: 3,
      draws: [
        {
          slot: 1,
          positionId: "past",
          positionZh: "过去",
          cardId: "major-00-fool",
          nameZh: "愚者",
          nameEn: "The Fool",
          orientation: "upright",
          selectedIndex: 1,
          drawnAt: "2026-05-16T21:31:02+08:00",
        },
        {
          slot: 2,
          positionId: "present",
          positionZh: "现在",
          cardId: "major-09-hermit",
          nameZh: "隐者",
          nameEn: "The Hermit",
          orientation: "reversed",
          selectedIndex: 3,
          drawnAt: "2026-05-16T21:31:05+08:00",
        },
        {
          slot: 3,
          positionId: "future",
          positionZh: "未来",
          cardId: "major-10-wheel-of-fortune",
          nameZh: "命运之轮",
          nameEn: "Wheel of Fortune",
          orientation: "upright",
          selectedIndex: 7,
          drawnAt: "2026-05-16T21:31:12+08:00",
        },
      ],
      remainingDeck: [],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: "session-1", readingId: "reading-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => shuffledSession,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          readingId: "reading-1",
          folderPath:
            "~/Documents/TarotDraws/2026-05-16_21-30-45_three-card_reading-1",
          filePath:
            "~/Documents/TarotDraws/2026-05-16_21-30-45_three-card_reading-1/reading.json",
          reading: {
            version: 1,
            readingId: "reading-1",
            createdAt: "2026-05-16T21:30:45+08:00",
            question: "",
            deck: {
              id: "rider-waite-smith",
              nameZh: "韦特塔罗",
              size: 78,
            },
            spread: {
              id: "three-card",
              nameZh: "三张牌阵",
              slotCount: 3,
            },
            ritual: {
              shuffled: true,
              cutPerformed: true,
            },
            cards: shuffledSession.draws,
          },
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TarotApp />);

    fireEvent.click(screen.getByRole("button", { name: /创建抽牌会话/i }));
    await screen.findByText("已保存到本地目录，等待后续分析。", {}, { timeout: 1000 }).catch(() => undefined);
    await screen.findByText("抽牌会话已创建，下一步先洗牌。");

    fireEvent.click(screen.getByRole("button", { name: "⌘ 保存本次抽牌" }));

    await waitFor(() => {
      expect(screen.getByText(/已保存为本地 reading\.json/)).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /~\/Documents\/TarotDraws\/2026-05-16_21-30-45_three-card_reading-1\/reading\.json/,
      ),
    ).toBeInTheDocument();
  });

  it("点击洗牌后会立即进入锁定态", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: "session-1", readingId: "reading-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialSession,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...initialSession,
          shuffled: true,
          remainingDeck: Array.from({ length: 78 }, (_, index) => ({
            index,
            previewId: `deck-${index}`,
            backImagePath: "/cards/rider-waite-smith/back.png",
          })),
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TarotApp />);

    fireEvent.click(screen.getByRole("button", { name: /创建抽牌会话/i }));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-line")).toHaveTextContent("抽牌会话已创建，下一步先洗牌。");
    });

    const shuffleButton = screen.getByRole("button", { name: "洗牌" });
    fireEvent.click(shuffleButton);

    expect(shuffleButton).toBeDisabled();
    expect(screen.getByTestId("feedback-line")).toHaveTextContent("正在洗牌...");
  });

  it("抽牌后会保持保存禁用，直到牌阵抽满", async () => {
    const cutReadySession: SessionStatePayload = {
      ...initialSession,
      shuffled: true,
      cutPerformed: true,
      remainingCount: 3,
      remainingDeck: Array.from({ length: 78 }, (_, index) => ({
        index,
        previewId: `deck-${index}`,
        backImagePath: "/cards/rider-waite-smith/back.png",
      })),
    };

    const afterFirstDraw: SessionStatePayload = {
      ...cutReadySession,
      remainingCount: 2,
      drawCount: 1,
      draws: [
        {
          slot: 1,
          positionId: "past",
          positionZh: "过去",
          cardId: "major-00-fool",
          nameZh: "愚者",
          nameEn: "The Fool",
          orientation: "upright",
          selectedIndex: 0,
          drawnAt: "2026-05-16T21:31:02+08:00",
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: "session-1", readingId: "reading-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cutReadySession,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          draw: {
            ...afterFirstDraw.draws[0],
            imagePath: "/cards/rider-waite-smith/major/0m.jpg",
          },
          remainingCount: 2,
          spread: cutReadySession.spread,
          session: afterFirstDraw,
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TarotApp />);

    fireEvent.click(screen.getByRole("button", { name: /创建抽牌会话/i }));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-line")).toHaveTextContent("抽牌会话已创建，下一步先洗牌。");
    });

    fireEvent.click(screen.getByTestId("deck-card-0"));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-line")).toHaveTextContent("正在抽牌...");
    });

    expect(screen.getByRole("button", { name: "⌘ 保存本次抽牌" })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByTestId("feedback-line")).toHaveTextContent("已完成抽牌，请继续从牌堆中选择下一张。");
    });
  });

  it("洗牌后会渲染完整 78 张可视牌", async () => {
    const cutReadySession: SessionStatePayload = {
      ...initialSession,
      shuffled: true,
      cutPerformed: true,
      remainingCount: 3,
      remainingDeck: Array.from({ length: 78 }, (_, index) => ({
        index,
        previewId: `deck-${index}`,
          backImagePath: "/cards/rider-waite-smith/back.png",
        })),
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: "session-1", readingId: "reading-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cutReadySession,
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TarotApp />);

    fireEvent.click(screen.getByRole("button", { name: /创建抽牌会话/i }));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-line")).toHaveTextContent("抽牌会话已创建，下一步先洗牌。");
    });

    await waitFor(() => {
      expect(screen.getByTestId("deck-card-77")).toBeInTheDocument();
    });
  });

  it("点击某张可视牌时会直接发送该真实剩余牌索引", async () => {
    const cutReadySession: SessionStatePayload = {
      ...initialSession,
      shuffled: true,
      cutPerformed: true,
      remainingCount: 3,
      remainingDeck: Array.from({ length: 78 }, (_, index) => ({
        index,
        previewId: `deck-${index}`,
        backImagePath: "/cards/rider-waite-smith/back.png",
      })),
    };

    const afterFirstDraw: SessionStatePayload = {
      ...cutReadySession,
      remainingCount: 2,
      drawCount: 1,
      draws: [
        {
          slot: 1,
          positionId: "past",
          positionZh: "过去",
          cardId: "major-00-fool",
          nameZh: "愚者",
          nameEn: "The Fool",
          orientation: "upright",
          selectedIndex: 40,
          drawnAt: "2026-05-16T21:31:02+08:00",
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: "session-1", readingId: "reading-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => cutReadySession,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          draw: {
            ...afterFirstDraw.draws[0],
            imagePath: "/cards/rider-waite-smith/major/0m.jpg",
          },
          remainingCount: 2,
          spread: cutReadySession.spread,
          session: afterFirstDraw,
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<TarotApp />);

    fireEvent.click(screen.getByRole("button", { name: /创建抽牌会话/i }));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-line")).toHaveTextContent("抽牌会话已创建，下一步先洗牌。");
    });

    fireEvent.click(screen.getByTestId("deck-card-40"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "/api/session/session-1/draw",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            selectedIndex: 40,
            slot: 1,
          }),
        }),
      );
    });
  });
});
