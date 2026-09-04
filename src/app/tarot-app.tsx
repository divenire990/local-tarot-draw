"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";

import type {
  SaveResultPayload,
  SessionStatePayload,
} from "@/lib/tarot/client-types";
import {
  getDesktopSettings,
  getDesktopZoomPercent,
  isDesktopBridgeAvailable,
  onDesktopZoomChanged,
  openDesktopDirectory,
  setDesktopZoomPercent,
  saveDesktopSettings,
} from "@/lib/desktop/bridge";
import type { SessionDrawRecord, SpreadDefinition, SpreadId } from "@/lib/tarot/types";

const spreadOptions: Array<{
  id: SpreadId;
  label: string;
  icon: string;
}> = [
  { id: "single-card", label: "单张牌阵", icon: "single" },
  { id: "three-card", label: "三张牌阵", icon: "triple" },
  { id: "celtic-cross", label: "凯尔特十字", icon: "cross" },
];

interface DrawResponse {
  draw: SessionDrawRecord & {
    imagePath: string;
  };
  remainingCount: number;
  spread: SpreadDefinition;
  session: SessionStatePayload;
}

interface StepItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  active: boolean;
  actionLabel?: string;
}

interface ViewModel {
  currentSpreadName: string;
  readyToSave: boolean;
  stepItems: StepItem[];
  cardsForBoard: Array<SessionDrawRecord & { imagePath: string }>;
  cardsDrawnLabel: string;
  remainingSlotsLabel: string;
  statusHint: string;
}

const placeholderAssets = {
  candle: "/cards/rider-waite-smith/major/9m.jpg",
  spellbook: "/cards/rider-waite-smith/major/15m.jpg",
  crystal: "/cards/rider-waite-smith/major/17m.jpg",
};

type AnimationPhase =
  | "idle"
  | "shuffling"
  | "cutting"
  | "drawing"
  | "revealing"
  | "saving";

interface AnimatedDrawCard extends SessionDrawRecord {
  imagePath: string;
  targetX: number;
  targetY: number;
}

const animationDurations = {
  shuffle: 760,
  shuffleSettle: 220,
  cut: 620,
  cutSettle: 180,
  drawLift: 220,
  drawTravel: 320,
  reveal: 420,
  save: 280,
  saveSettle: 260,
} as const;

function waitForMotion(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getDrawTravelTarget(spreadId: SpreadId, slot: number) {
  if (spreadId === "single-card") {
    return { targetX: 0, targetY: 250 };
  }

  if (spreadId === "three-card") {
    const offsets = [-248, 0, 248];
    return {
      targetX: offsets[slot - 1] ?? 0,
      targetY: 248,
    };
  }

  const column = (slot - 1) % 3;
  const row = Math.floor((slot - 1) / 3);
  return {
    targetX: [-236, 0, 236][column] ?? 0,
    targetY: 224 + row * 72,
  };
}

export function TarotApp() {
  const [question, setQuestion] = useState("");
  const [spreadId, setSpreadId] = useState<SpreadId>("three-card");
  const [session, setSession] = useState<SessionStatePayload | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResultPayload | null>(null);
  const [feedback, setFeedback] = useState("请选择牌阵并创建会话。");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [cardImageMap, setCardImageMap] = useState<Record<string, string>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<"night" | "dusk">("night");
  const [recordsDir, setRecordsDir] = useState("~/Documents/TarotDraws");
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const [selectedDeckIndex, setSelectedDeckIndex] = useState<number | null>(null);
  const [animatedDrawCard, setAnimatedDrawCard] = useState<AnimatedDrawCard | null>(null);
  const [saveHighlightToken, setSaveHighlightToken] = useState(0);
  useEffect(() => {
    void (async () => {
      const settings = await getDesktopSettings();
      setThemeMode(settings.themeMode);
      setRecordsDir(settings.recordsDir);
      const desktopAvailable = isDesktopBridgeAvailable();
      setIsDesktopMode(desktopAvailable);
      if (desktopAvailable) {
        setZoomPercent(await getDesktopZoomPercent());
      }
    })();
  }, []);

  useEffect(() => {
    if (!isDesktopMode) {
      return;
    }

    return onDesktopZoomChanged((nextZoomPercent) => {
      setZoomPercent(nextZoomPercent);
    });
  }, [isDesktopMode]);

  const interactionLocked = isPending || animationPhase !== "idle";

  async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "请求失败。");
    }
    return data;
  }

  function withAction(action: () => Promise<void>) {
    startTransition(() => {
      void (async () => {
        try {
          setError("");
          await action();
        } catch (actionError) {
          setError(actionError instanceof Error ? actionError.message : "发生未知错误。");
        }
      })();
    });
  }

  function handleCreateSession() {
    if (interactionLocked) return;
    withAction(async () => {
      const created = await requestJson<{ sessionId: string; readingId: string }>(
        "/api/session",
        {
          method: "POST",
          body: JSON.stringify({
            spreadId,
            question: question.trim(),
          }),
        },
      );

      const state = await requestJson<SessionStatePayload>(
        `/api/session/${created.sessionId}/state`,
      );

      setSession(state);
      setSaveResult(null);
      setCardImageMap({});
      setSelectedDeckIndex(null);
      setAnimatedDrawCard(null);
      setAnimationPhase("idle");
      setFeedback("抽牌会话已创建，下一步先洗牌。");
    });
  }

  function handleShuffle() {
    if (!session || interactionLocked) return;
    withAction(async () => {
      setAnimationPhase("shuffling");
      setFeedback("正在洗牌...");
      setSaveResult(null);
      setSelectedDeckIndex(null);
      setAnimatedDrawCard(null);
      await waitForMotion(animationDurations.shuffle);
      const state = await requestJson<SessionStatePayload>(
        `/api/session/${session.sessionId}/shuffle`,
        { method: "POST", body: "{}" },
      );
      setSession(state);
      setSaveResult(null);
      setCardImageMap({});
      setFeedback("已完成洗牌，请继续切牌。");
      await waitForMotion(animationDurations.shuffleSettle);
      setAnimationPhase("idle");
    });
  }

  function handleCut() {
    if (!session || interactionLocked) return;
    withAction(async () => {
      setAnimationPhase("cutting");
      setFeedback("正在切牌...");
      await waitForMotion(animationDurations.cut);
      const state = await requestJson<SessionStatePayload>(
        `/api/session/${session.sessionId}/cut`,
        { method: "POST", body: "{}" },
      );
      setSession(state);
      setFeedback("切牌完成，请从下方牌堆中点击选牌。");
      await waitForMotion(animationDurations.cutSettle);
      setAnimationPhase("idle");
    });
  }

  function handleDraw(selectedIndex: number) {
    if (!session || interactionLocked) return;
    withAction(async () => {
      setAnimationPhase("drawing");
      setSelectedDeckIndex(selectedIndex);
      setFeedback("正在抽牌...");
      await waitForMotion(animationDurations.drawLift);
      const result = await requestJson<DrawResponse>(
        `/api/session/${session.sessionId}/draw`,
        {
          method: "POST",
          body: JSON.stringify({
            selectedIndex,
            slot: session.drawCount + 1,
          }),
        },
      );

      setSession(result.session);
      setCardImageMap((current) => ({
        ...current,
        [result.draw.cardId]: result.draw.imagePath,
      }));
      setAnimatedDrawCard({
        ...result.draw,
        imagePath: result.draw.imagePath,
        targetX: getDrawTravelTarget(result.session.spread.id, result.draw.slot).targetX,
        targetY: getDrawTravelTarget(result.session.spread.id, result.draw.slot).targetY,
      });
      await waitForMotion(animationDurations.drawTravel);
      setAnimatedDrawCard(null);
      setSelectedDeckIndex(null);
      setAnimationPhase("revealing");
      await waitForMotion(animationDurations.reveal);
      setFeedback(
        result.session.remainingCount > 0
          ? "已完成抽牌，请继续从牌堆中选择下一张。"
          : "本次抽牌已完成，可保存为本地 reading.json。",
      );
      setAnimationPhase("idle");
    });
  }

  function handleSave() {
    if (!session || interactionLocked) return;
    withAction(async () => {
      setAnimationPhase("saving");
      setFeedback("正在保存本次抽牌...");
      await waitForMotion(animationDurations.save);
      const result = await requestJson<SaveResultPayload>(
        `/api/session/${session.sessionId}/save`,
        { method: "POST", body: "{}" },
      );
      setSaveResult(result);
      setFeedback("已保存到本地目录，等待后续分析。");
      setSaveHighlightToken(Date.now());
      await waitForMotion(animationDurations.saveSettle);
      setAnimationPhase("idle");
    });
  }

  async function handleCopyReadingJson() {
    if (!saveResult) return;
    try {
      await navigator.clipboard.writeText(`${JSON.stringify(saveResult.reading, null, 2)}\n`);
      setFeedback("已复制 reading.json 内容。");
      setError("");
    } catch {
      setError("复制失败，请重试。");
    }
  }

  function handleOpenFolder() {
    withAction(async () => {
      const targetPath = saveResult?.folderPath ?? recordsDir;
      const result = await openDesktopDirectory(targetPath);
      if (!result.ok) {
        throw new Error(result.error ?? "打开目录失败。");
      }
      setFeedback("已打开目录。");
    });
  }

  function handleToggleTheme() {
    const nextMode = themeMode === "night" ? "dusk" : "night";
    setThemeMode(nextMode);
    setFeedback(`已切换到 ${nextMode === "night" ? "Night" : "Dusk"} 主题。`);
    void saveDesktopSettings({ themeMode: nextMode }).catch(() => undefined);
  }

  function handleZoomChange(nextZoomPercent: number) {
    if (!isDesktopMode) {
      return;
    }

    void (async () => {
      const updatedZoomPercent = await setDesktopZoomPercent(nextZoomPercent);
      setZoomPercent(updatedZoomPercent);
    })();
  }

  function handleSaveSettings() {
    withAction(async () => {
      const next = await saveDesktopSettings({ recordsDir, themeMode });
      setRecordsDir(next.recordsDir);
      setThemeMode(next.themeMode);
      setSettingsOpen(false);
      setFeedback("本地设置已保存。");
    });
  }

  const viewModel = useMemo<ViewModel>(() => {
    const cardsForBoard = (session?.draws ?? [])
      .slice(0, animationPhase === "drawing" ? -1 : undefined)
      .map((draw) => ({
        ...draw,
        imagePath: cardImageMap[draw.cardId] ?? "",
      }))
      .filter((draw) => Boolean(draw.imagePath));

    const rawReadyToSave = Boolean(session?.shuffled) && (session?.remainingCount ?? 1) === 0;
    const readyToSave =
      rawReadyToSave &&
      animationPhase !== "drawing" &&
      animationPhase !== "revealing";

    const stepItems: StepItem[] = [
      {
        id: "create",
        label: "创建会话",
        hint: "输入问题并选择牌阵",
        done: Boolean(session),
        active: !session,
      },
      {
        id: "shuffle",
        label: "洗牌",
        hint: "生成本次专属牌堆",
        done: Boolean(session?.shuffled) && animationPhase !== "shuffling",
        active: animationPhase === "shuffling" || (Boolean(session) && !session?.shuffled),
        actionLabel: session?.shuffled ? "已洗牌" : undefined,
      },
      {
        id: "cut",
        label: "切牌",
        hint: "切牌后方可进行抽牌",
        done: Boolean(session?.cutPerformed) && animationPhase !== "cutting",
        active:
          animationPhase === "cutting" ||
          (Boolean(session?.shuffled) && !session?.cutPerformed),
        actionLabel: session?.cutPerformed ? "已切牌" : undefined,
      },
      {
        id: "draw",
        label: "抽牌",
        hint:
          session?.spread.id === "single-card"
            ? "手动点击背面牌抽取"
            : `手动点击背面牌抽取 ${session?.spread.slotCount ?? 0} 张`,
        done:
          rawReadyToSave &&
          animationPhase !== "drawing" &&
          animationPhase !== "revealing",
        active:
          animationPhase === "drawing" ||
          animationPhase === "revealing" ||
          (Boolean(session?.cutPerformed) && !readyToSave),
      },
      {
        id: "save",
        label: "保存",
        hint: "保存为本地 reading.json",
        done: Boolean(saveResult) && animationPhase !== "saving",
        active: animationPhase === "saving" || (readyToSave && !saveResult),
      },
    ];

    return {
      currentSpreadName: session?.spread.nameZh ?? spreadOptions.find((item) => item.id === spreadId)?.label ?? "三张牌阵",
      readyToSave,
      stepItems,
      cardsForBoard,
      cardsDrawnLabel: `${session?.drawCount ?? 0} / ${session?.spread.slotCount ?? 0}`,
      remainingSlotsLabel: `${session?.remainingCount ?? 0}`,
      statusHint: saveResult
        ? "本地保存已完成，可交给 skills 分析"
        : readyToSave
          ? "本次抽牌已完成，可保存为本地 reading.json"
          : feedback,
    };
  }, [animationPhase, cardImageMap, feedback, saveResult, session, spreadId]);

  return (
    <div className={clsx("tarot-shell", `tarot-shell--${themeMode}`)}>
      <main className="tarot-desktop" data-testid="tarot-desktop">
        <TopBar
          isDesktopMode={isDesktopMode}
          zoomPercent={zoomPercent}
          onOpenFolder={handleOpenFolder}
          onToggleSettings={() => setSettingsOpen((value) => !value)}
          onToggleTheme={handleToggleTheme}
          onZoomChange={handleZoomChange}
        />

        <div className="tarot-grid">
          <LeftRail
            question={question}
            onQuestionChange={setQuestion}
            spreadId={spreadId}
            onSpreadChange={setSpreadId}
            onCreateSession={handleCreateSession}
            session={session}
            isPending={interactionLocked}
            onShuffle={handleShuffle}
            onCut={handleCut}
            readyToSave={viewModel.readyToSave}
            feedback={feedback}
            error={error}
            stepItems={viewModel.stepItems}
          />

          <CenterStage
            session={session}
            isPending={interactionLocked}
            viewModel={viewModel}
            onDraw={handleDraw}
            animationPhase={animationPhase}
            selectedDeckIndex={selectedDeckIndex}
            animatedDrawCard={animatedDrawCard}
          />

          <RightRail
            session={session}
            saveResult={saveResult}
            isPending={interactionLocked}
            onSave={handleSave}
            onCopyFilePath={handleCopyReadingJson}
            statusHint={viewModel.statusHint}
            readyToSave={viewModel.readyToSave}
            animationPhase={animationPhase}
            saveHighlightToken={saveHighlightToken}
          />
        </div>

        {settingsOpen ? (
          <div className="settings-popover">
            <div className="settings-popover__title">设置</div>
            <p>可在这里调整保存目录与主题模式。</p>
            <label className="settings-popover__label">
              保存目录
              <input
                value={recordsDir}
                onChange={(event) => setRecordsDir(event.target.value)}
              />
            </label>
            <label className="settings-popover__label">
              主题模式
              <select
                value={themeMode}
                onChange={(event) => setThemeMode(event.target.value as "night" | "dusk")}
              >
                <option value="night">Night</option>
                <option value="dusk">Dusk</option>
              </select>
            </label>
            <div className="settings-popover__actions">
              <button type="button" onClick={() => setSettingsOpen(false)}>
                关闭
              </button>
              <button type="button" onClick={handleSaveSettings}>
                保存设置
              </button>
            </div>
            <div className="settings-popover__footnote">
              {isDesktopMode ? "当前环境支持本地设置持久化。" : "浏览器模式下设置仅在当前页面生效。"}
            </div>
          </div>
        ) : null}

      </main>
    </div>
  );
}

function TopBar({
  isDesktopMode,
  zoomPercent,
  onOpenFolder,
  onToggleSettings,
  onToggleTheme,
  onZoomChange,
}: {
  isDesktopMode: boolean;
  zoomPercent: number;
  onOpenFolder: () => void;
  onToggleSettings: () => void;
  onToggleTheme: () => void;
  onZoomChange: (zoomPercent: number) => void;
}) {
  const [prevZoomPercent, setPrevZoomPercent] = useState(zoomPercent);
  const [zoomInputValue, setZoomInputValue] = useState(String(zoomPercent));
  if (prevZoomPercent !== zoomPercent) {
    setPrevZoomPercent(zoomPercent);
    setZoomInputValue(String(zoomPercent));
  }

  function commitZoomInput() {
    const parsed = Number.parseInt(zoomInputValue.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(parsed)) {
      setZoomInputValue(String(zoomPercent));
      return;
    }

    onZoomChange(parsed);
  }

  return (
    <header className="topbar-panel">
      <div className="brand-lockup">
        <div className="brand-orb">
          <span>✦</span>
        </div>
        <div>
          <div className="brand-title">本地塔罗抽牌器</div>
          <div className="brand-subtitle">Local Tarot Draw Tool</div>
        </div>
        <div className="session-tag">Local Session</div>
      </div>

      <div className="topbar-actions">
        {isDesktopMode ? (
          <label className="zoom-input" aria-label="自定义缩放百分比">
            <span className="zoom-input__prefix">缩放</span>
            <input
              type="text"
              inputMode="numeric"
              value={zoomInputValue}
              onChange={(event) =>
                setZoomInputValue(event.target.value.replace(/[^\d]/g, ""))
              }
              onBlur={commitZoomInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitZoomInput();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setZoomInputValue(String(zoomPercent));
                }
              }}
            />
            <button
              type="button"
              className="zoom-input__apply"
              onClick={commitZoomInput}
            >
              %
            </button>
          </label>
        ) : null}
        <TopbarButton label="打开目录" onClick={onOpenFolder} />
        <TopbarButton label="设置" onClick={onToggleSettings} />
        <TopbarButton label="☾" onClick={onToggleTheme} iconOnly testId="theme-toggle-button" />
      </div>
    </header>
  );
}

function LeftRail({
  question,
  onQuestionChange,
  spreadId,
  onSpreadChange,
  onCreateSession,
  session,
  isPending,
  onShuffle,
  onCut,
  readyToSave,
  feedback,
  error,
  stepItems,
}: {
  question: string;
  onQuestionChange: (value: string) => void;
  spreadId: SpreadId;
  onSpreadChange: (value: SpreadId) => void;
  onCreateSession: () => void;
  session: SessionStatePayload | null;
  isPending: boolean;
  onShuffle: () => void;
  onCut: () => void;
  readyToSave: boolean;
  feedback: string;
  error: string;
  stepItems: StepItem[];
}) {
  return (
    <aside className="left-rail">
      <PanelFrame index={1} title="创建会话">
        <div className="field-label">问题输入</div>
        <div className="question-box">
          <textarea
            value={question}
            maxLength={200}
            onChange={(event) => onQuestionChange(event.target.value)}
          />
          <div className="question-counter">{question.length} / 200</div>
        </div>

        <div className="field-label field-label--with-hint">
          牌阵选择
          <span>（选择固定牌阵）</span>
        </div>

        <div className="spread-grid">
          {spreadOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={clsx(
                "spread-card",
                option.id === spreadId && "spread-card--active",
              )}
              onClick={() => onSpreadChange(option.id)}
            >
              {option.id === spreadId ? <div className="spread-card__check">✓</div> : null}
              <SpreadPreview icon={option.icon} />
              <div className="spread-card__label">{option.label}</div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="primary-action primary-action--violet"
          onClick={onCreateSession}
          disabled={isPending}
          data-testid="create-session-button"
        >
          ✣ 创建抽牌会话
        </button>

        {session ? (
          <div className="session-strip">
            <div>
              <div>sessionId: {session.sessionId}</div>
              <div>readingId: {session.readingId}</div>
            </div>
            <div className="session-strip__status">
              当前状态：
              <span>{readyToSave ? "已保存待确认" : "已就绪"}</span>
            </div>
          </div>
        ) : null}
      </PanelFrame>

      <PanelFrame
        index={2}
        title="流程控制"
        extra="（流程受步骤约束）"
      >
        <div className="step-list">
          {stepItems.map((item, index) => (
            <div
              key={item.id}
              className={clsx(
                "step-item",
                item.done && "step-item--done",
                item.active && "step-item--active",
              )}
            >
              <div className="step-item__index">{index + 1}</div>
              <div className="step-item__body">
                <div className="step-item__label">{item.label}</div>
                <div className="step-item__hint">{item.hint}</div>
              </div>
              {item.actionLabel ? (
                <div className="step-item__badge">{item.actionLabel}</div>
              ) : item.done ? (
                <div className="step-item__check">✓</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="process-actions">
          <button
            type="button"
            className="control-button"
            onClick={onShuffle}
            disabled={!session || isPending}
            data-testid="shuffle-button"
          >
            洗牌
          </button>
          <button
            type="button"
            className="control-button"
            onClick={onCut}
            disabled={!session || !session.shuffled || session.drawCount > 0 || isPending}
            data-testid="cut-button"
          >
            切牌
          </button>
        </div>

        <div className="status-line" data-testid="feedback-line">{feedback}</div>
        {error ? <div className="status-line status-line--error">{error}</div> : null}
      </PanelFrame>
    </aside>
  );
}

function CenterStage({
  session,
  isPending,
  viewModel,
  onDraw,
  animationPhase,
  selectedDeckIndex,
  animatedDrawCard,
}: {
  session: SessionStatePayload | null;
  isPending: boolean;
  viewModel: ViewModel;
  onDraw: (selectedIndex: number) => void;
  animationPhase: AnimationPhase;
  selectedDeckIndex: number | null;
  animatedDrawCard: AnimatedDrawCard | null;
}) {
  return (
    <section className="center-stage">
      <motion.div
        className="stage-steps"
        animate={{
          boxShadow:
            animationPhase === "saving"
              ? "inset 0 -1px 0 rgba(255, 226, 160, 0.08), 0 0 28px rgba(95, 203, 98, 0.08)"
              : "inset 0 -1px 0 rgba(255, 226, 160, 0.03), 0 0 0 rgba(0, 0, 0, 0)",
        }}
        transition={{ duration: 0.28 }}
      >
        {viewModel.stepItems.map((item, index) => (
          <motion.div
            key={item.id}
            className="stage-steps__item"
            layout
            animate={{
              opacity: item.active || item.done ? 1 : 0.72,
              y: item.active ? -1 : 0,
            }}
            transition={{ duration: 0.24 }}
          >
            <motion.div
              className={clsx(
                "stage-steps__dot",
                item.done && "stage-steps__dot--done",
                item.active && "stage-steps__dot--active",
              )}
              animate={{
                scale: item.active ? 1.08 : 1,
              }}
              transition={{ duration: 0.24 }}
            >
              {index + 1}
            </motion.div>
            <motion.div
              className={clsx("stage-steps__label", item.active && "is-active")}
              animate={{
                opacity: item.active || item.done ? 1 : 0.76,
              }}
              transition={{ duration: 0.24 }}
            >
              {item.label}
            </motion.div>
            {index < viewModel.stepItems.length - 1 ? (
              <div className="stage-steps__line" />
            ) : null}
          </motion.div>
        ))}
      </motion.div>

      <div className="stage-scene">
        <div className="scene-props scene-props--candle">
          <Image src={placeholderAssets.candle} alt="" width={138} height={138} unoptimized />
        </div>
        <div className="scene-props scene-props--book">
          <Image src={placeholderAssets.spellbook} alt="" width={222} height={164} unoptimized />
        </div>
        <div className="scene-props scene-props--crystal">
          <Image src={placeholderAssets.crystal} alt="" width={88} height={88} unoptimized />
        </div>

        <div className="stage-copy">
          <div className="stage-copy__title">✦ 点击某张背面牌即可抽取 ✦</div>
          <div className="stage-copy__subtitle">
            请从下方完整牌堆中选择，手动抽取
            {session?.spread.slotCount ?? 0} 张牌
          </div>
        </div>

        <motion.div
          className={clsx(
            "deck-fan",
            animationPhase === "shuffling" && "deck-fan--shuffling",
            animationPhase === "cutting" && "deck-fan--cutting",
          )}
          data-testid="deck-fan"
        >
          {session?.remainingDeck.length ? (
            session.remainingDeck.map((card, index, array) => {
              const ratio = array.length > 1 ? index / (array.length - 1) : 0.5;
              const arc = (ratio - 0.5) * 2;
              const rotate = arc * 24;
              const x = arc * 292;
              const y = Math.abs(arc) * 34 + arc * arc * 26;
              const isSelected = selectedDeckIndex === card.index;
              const isTopHalf = index < array.length / 2;
              return (
                <motion.button
                  key={card.previewId}
                  type="button"
                  className="deck-card"
                  data-testid={`deck-card-${index}`}
                  initial={false}
                  animate={{
                    x:
                      animationPhase === "shuffling"
                        ? ((index % 2 === 0 ? -1 : 1) * (18 + (index % 4) * 10))
                        : animationPhase === "cutting"
                          ? x + (isTopHalf ? -42 : 42)
                          : x,
                    y:
                      animationPhase === "shuffling"
                        ? -18 + (index % 3) * 10
                        : animationPhase === "cutting"
                          ? y + (isTopHalf ? -12 : 12)
                          : animationPhase === "drawing" && isSelected
                            ? y - 88
                          : animationPhase === "revealing" && isSelected
                              ? y - 120
                              : y,
                    rotate:
                      animationPhase === "shuffling"
                        ? ((index % 5) - 2) * 7
                        : animationPhase === "cutting"
                          ? rotate + (isTopHalf ? -6 : 6)
                          : rotate,
                    scale:
                      animationPhase === "drawing" && isSelected
                        ? 1.06
                        : animationPhase === "revealing" && isSelected
                          ? 1.08
                          : 1,
                    opacity:
                      (animationPhase === "drawing" || animationPhase === "revealing") && isSelected
                        ? 0
                        : selectedDeckIndex !== null && selectedDeckIndex !== card.index
                          ? 0.76
                          : 1,
                  }}
                  transition={{
                    duration:
                      animationPhase === "shuffling"
                        ? 0.48
                        : animationPhase === "cutting"
                          ? 0.42
                          : 0.28,
                    ease: "easeInOut",
                  }}
                  style={{ zIndex: index + 1 }}
                  onClick={() => onDraw(card.index)}
                  disabled={!session.shuffled || isPending}
                >
                  <Image
                    src={card.backImagePath}
                    alt="塔罗牌背面"
                    width={176}
                    height={288}
                    unoptimized
                  />
                </motion.button>
              );
            })
          ) : (
            <div className="deck-placeholder">
              {session ? "先点击“洗牌”，牌堆才会铺开。" : "先创建抽牌会话。"}
            </div>
          )}
          <AnimatePresence>
            {animatedDrawCard ? (
              <motion.div
                key={`${animatedDrawCard.slot}-${animatedDrawCard.cardId}`}
                className="flying-draw-card"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.82, rotate: -8 }}
                animate={{
                  x: animatedDrawCard.targetX,
                  y: animatedDrawCard.targetY,
                  opacity: 1,
                  scale: 0.74,
                  rotate: 0,
                }}
                exit={{ opacity: 0, scale: 0.72 }}
                transition={{ duration: 0.34, ease: "easeInOut" }}
              >
                <Image
                  src={animatedDrawCard.imagePath}
                  alt={animatedDrawCard.nameZh}
                  width={176}
                  height={288}
                  className={animatedDrawCard.orientation === "reversed" ? "is-reversed" : ""}
                  unoptimized
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <div className="deck-counter">
          <div className="deck-counter__pill">
            <span>已抽</span>
            <strong>{viewModel.cardsDrawnLabel}</strong>
            <span className="divider" />
            <span>剩余牌位</span>
            <strong className="danger">{viewModel.remainingSlotsLabel}</strong>
          </div>
        </div>

        <div className="deck-sidebox">
          <div>剩余牌堆</div>
          <strong>{session?.remainingDeck.length ?? 0} 张</strong>
          <small>总牌数: 78 张</small>
          <small>限定上限</small>
        </div>
      </div>

      <motion.div
        className="revealed-grid"
        data-testid="revealed-grid"
        animate={{
          opacity: animationPhase === "revealing" ? 0.98 : 1,
        }}
        transition={{ duration: 0.24 }}
      >
        {viewModel.cardsForBoard.length ? (
          <AnimatePresence initial={false}>
            {viewModel.cardsForBoard.map((card) => (
            <motion.article
              key={`${card.slot}-${card.cardId}`}
              className="reading-card"
              data-testid={`reading-card-${card.slot}`}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.92 }}
              transition={{
                duration: 0.36,
                ease: "easeOut",
                delay: 0.04 * (card.slot - 1),
              }}
            >
              <div className="reading-card__title">{card.positionZh}</div>
              <motion.div
                className="reading-card__frame"
                initial={{ rotateY: 90, opacity: 0.4 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.42, ease: "easeOut" }}
              >
                <Image
                  src={card.imagePath}
                  alt={card.nameZh}
                  width={250}
                  height={412}
                  className={card.orientation === "reversed" ? "is-reversed" : ""}
                  unoptimized
                />
              </motion.div>
              <div className="reading-card__name">{card.nameZh}</div>
              <div className="reading-card__en">{card.nameEn}</div>
              <motion.div
                className={clsx(
                  "reading-card__badge",
                  card.orientation === "reversed" && "reading-card__badge--reversed",
                )}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, delay: 0.18 }}
              >
                {card.orientation === "upright" ? "正位" : "逆位"}
              </motion.div>
            </motion.article>
          ))}
          </AnimatePresence>
        ) : (
          <div className="revealed-empty">抽牌结果将显示在这里。</div>
        )}
      </motion.div>
    </section>
  );
}

function RightRail({
  session,
  saveResult,
  isPending,
  onSave,
  onCopyFilePath,
  statusHint,
  readyToSave,
  animationPhase,
  saveHighlightToken,
}: {
  session: SessionStatePayload | null;
  saveResult: SaveResultPayload | null;
  isPending: boolean;
  onSave: () => void;
  onCopyFilePath: () => void;
  statusHint: string;
  readyToSave: boolean;
  animationPhase: AnimationPhase;
  saveHighlightToken: number;
}) {
  return (
    <aside className="right-rail">
      <PanelFrame index={3} title="当前会话状态">
        <motion.div
          className="status-summary"
          data-testid="status-summary"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0.92, y: 6 }}
          transition={{ duration: 0.28 }}
        >
          <StatusRow label="当前牌阵" value={session?.spread.nameZh ?? "三张牌阵"} />
          <StatusRow label="是否已洗牌" value={session?.shuffled ? "是" : "否"} positive={session?.shuffled} />
          <StatusRow label="是否已切牌" value={session?.cutPerformed ? "是" : "否"} positive={session?.cutPerformed} />
          <StatusRow label="已抽张数" value={`${session?.drawCount ?? 0}`} />
          <StatusRow label="剩余牌位数" value={`${session?.remainingCount ?? 0}`} />
          <StatusRow label="当前提示" value={statusHint} multiline positive={readyToSave} />
        </motion.div>

        <div className="session-meta">
          <div>sessionId: {session?.sessionId ?? "—"}</div>
          <div>readingId: {session?.readingId ?? "—"}</div>
        </div>

        <motion.div
          className={clsx("ready-banner", readyToSave && "ready-banner--active")}
          animate={{
            scale: readyToSave ? 1 : 0.98,
            boxShadow: readyToSave
              ? "0 0 22px rgba(95, 203, 98, 0.16)"
              : "0 0 0 rgba(0, 0, 0, 0)",
          }}
          transition={{ duration: 0.28 }}
        >
          <span className="ready-banner__dot">✓</span>
          <span>{saveResult ? "Ready 已完成，已保存" : "Ready 已完成，等待保存"}</span>
        </motion.div>
      </PanelFrame>

      <PanelFrame index={4} title="保存结果" extra="（本地保存，无云端同步）">
        <button
          type="button"
          className="primary-action primary-action--gold"
          onClick={onSave}
          disabled={!session || !readyToSave || Boolean(saveResult) || isPending}
          data-testid="save-reading-button"
        >
          ⌘ 保存本次抽牌
        </button>

        <motion.div
          className="save-hint"
          animate={{
            opacity: animationPhase === "saving" ? 0.88 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {saveResult ? "已保存为本地 reading.json" : "保存后将写入本地 reading.json"}
        </motion.div>

        <motion.div
          key={saveHighlightToken || "save-box"}
          className="save-box"
          data-testid="save-box"
          initial={false}
          animate={{
            scale: saveResult ? [1, 1.01, 1] : 1,
            boxShadow: saveResult
              ? [
                  "0 0 0 rgba(0, 0, 0, 0)",
                  "0 0 22px rgba(95, 203, 98, 0.16)",
                  "0 0 0 rgba(0, 0, 0, 0)",
                ]
              : "0 0 0 rgba(0, 0, 0, 0)",
          }}
          transition={{ duration: 0.4 }}
        >
          <div>readingId: {saveResult?.readingId ?? session?.readingId ?? "—"}</div>
          <div>folderPath: {saveResult?.folderPath ?? "等待保存后生成"}</div>
          <div>filePath: {saveResult?.filePath ?? "等待保存后生成"}</div>
        </motion.div>

        <button
          type="button"
          className="primary-action primary-action--purple"
          onClick={onCopyFilePath}
          disabled={!saveResult}
        >
          复制 reading.json 内容
        </button>

        <ul className="save-notes">
          <li>默认保存到本地 TarotDraws 文件夹</li>
          <li>后续可将 reading.json 交给本地 skills 分析</li>
        </ul>
      </PanelFrame>
    </aside>
  );
}

function PanelFrame({
  index,
  title,
  extra,
  children,
}: {
  index: number;
  title: string;
  extra?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="frame-panel">
      <div className="frame-panel__title">
        <div className="frame-panel__index">{index}</div>
        <div>{title}</div>
        {extra ? <small>{extra}</small> : null}
      </div>
      <div className="frame-panel__body">{children}</div>
    </section>
  );
}

function StatusRow({
  label,
  value,
  positive = false,
  multiline = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  multiline?: boolean;
}) {
  return (
    <motion.div
      className={clsx("status-row", multiline && "status-row--multiline")}
      layout
      transition={{ duration: 0.22 }}
    >
      <span>{label}:</span>
      <strong className={positive ? "positive" : ""}>{value}</strong>
    </motion.div>
  );
}

function TopbarButton({
  label,
  onClick,
  iconOnly = false,
  testId,
}: {
  label: string;
  onClick: () => void;
  iconOnly?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      className={clsx("topbar-button", iconOnly && "topbar-button--icon")}
      onClick={onClick}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function SpreadPreview({ icon }: { icon: string }) {
  if (icon === "single") {
    return (
      <div className="spread-card__icon spread-card__icon--single" aria-hidden="true">
        <span className="spread-card__mini spread-card__mini--single" />
      </div>
    );
  }

  if (icon === "triple") {
    return (
      <div className="spread-card__icon spread-card__icon--triple" aria-hidden="true">
        <span className="spread-card__mini spread-card__mini--left" />
        <span className="spread-card__mini spread-card__mini--center" />
        <span className="spread-card__mini spread-card__mini--right" />
      </div>
    );
  }

  return (
    <div className="spread-card__icon spread-card__icon--cross" aria-hidden="true">
      <span className="spread-card__cross-card spread-card__cross-card--center-vertical" />
      <span className="spread-card__cross-card spread-card__cross-card--center-horizontal" />
      <span className="spread-card__cross-card spread-card__cross-card--top" />
      <span className="spread-card__cross-card spread-card__cross-card--bottom" />
      <span className="spread-card__cross-card spread-card__cross-card--left" />
      <span className="spread-card__cross-card spread-card__cross-card--right" />
      <span className="spread-card__cross-card spread-card__cross-card--column-1" />
      <span className="spread-card__cross-card spread-card__cross-card--column-2" />
      <span className="spread-card__cross-card spread-card__cross-card--column-3" />
      <span className="spread-card__cross-card spread-card__cross-card--column-4" />
    </div>
  );
}
