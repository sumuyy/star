/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { GameState, PerspectiveType, TerminalLog, ParsedStoryContent, StoryOption } from "../types";
import { INITIAL_GAME_STATE } from "../data";
import { readStarGameData } from "../utils/variableReader";
import { FloorStoryEntry, loadAllAssistantFloors, loadFromLatestMessage } from "../utils/messageParser";
import { handleStarRequest } from "../utils/requestHandler";
import TopologyMap from "./TopologyMap";
import StatusPanel from "./StatusPanel";
import TeammatesPanel from "./TeammatesPanel";
import BattleAlertsPanel from "./BattleAlertsPanel";
import DarkWebPanel from "./DarkWebPanel";
import SocialPanel from "./SocialPanel";

import {
  Terminal,
  Send,
  Sliders,
  Activity,
  Cpu,
  RefreshCw,
  Clock,
  Sun,
  Moon,
  Wand2,
  Maximize2,
  Minimize2,
  Target,
  BookOpen,
  Archive,
  Map,
  Shield,
  VenetianMask,
  Users,
  RadioTower,
  Radar,
  Heart,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";

declare const tavern_events: {
  MESSAGE_UPDATED: string;
  MESSAGE_RECEIVED: string;
  CHAT_CHANGED: string;
};
declare function eventOn(event: string, callback: (...args: any[]) => void): { stop: () => void } | void;
declare function getChatMessages(
  range: string | number,
  options?: { role?: "all" | "system" | "assistant" | "user"; hide_state?: "all" | "hidden" | "unhidden" },
): Array<{ message_id: number; role: string; data?: Record<string, any> }>;
declare function updateVariablesWith(
  updater: (variables: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>,
  option: { type: "message"; message_id: number | "latest" },
): Promise<Record<string, any>>;
declare function triggerSlash(command: string): Promise<string>;

interface GameScreenProps {
  initialGameState?: GameState;
  perspective: PerspectiveType;
  onPerspectiveChange: (next: PerspectiveType) => void;
  dayNight: "day" | "night";
  onDayNightChange: (next: "day" | "night") => void;
  onRequestOpening?: () => void;
}

type InfoPanelKey = "plot" | "api" | "map" | "status" | "core" | "gear" | "anchor" | "team" | "observe" | "social" | "darkweb" | "battle";
type InfoTab = { key: InfoPanelKey; label: string; code: string; icon: LucideIcon; content: React.ReactNode };

const INFO_PANEL_KEYS_BY_PERSPECTIVE: Record<PerspectiveType, InfoPanelKey[]> = {
  xiumin: ["plot", "map", "status", "gear", "team", "battle", "social"],
  max: ["api", "map", "core", "anchor", "observe", "battle", "darkweb"],
};

const INFO_PANEL_MIRROR_MAP: Record<InfoPanelKey, InfoPanelKey> = {
  plot: "api",
  api: "plot",
  // 星图目前先保留同名入口；后续再做双方内容区分。
  map: "map",
  status: "core",
  core: "status",
  gear: "anchor",
  anchor: "gear",
  team: "observe",
  observe: "team",
  social: "darkweb",
  darkweb: "social",
  battle: "battle",
};

function ensureInfoPanelForPerspective(key: InfoPanelKey, target: PerspectiveType): InfoPanelKey {
  return INFO_PANEL_KEYS_BY_PERSPECTIVE[target].includes(key) ? key : INFO_PANEL_MIRROR_MAP[key];
}

function buildLog(source: TerminalLog["source"], message: string): TerminalLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toTimeString().split(" ")[0],
    source,
    message,
  };
}

function FullPageModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto star-shell p-4 md:p-6">
      <div className="max-w-4xl mx-auto rounded-lg p-4 md:p-6 star-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b pb-3 mb-4 star-border">
          <div>
            <h2 className="text-base font-black tracking-widest uppercase star-text-primary">{title}</h2>
            {subtitle && <p className="text-[12px] star-text-muted mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="star-btn rounded-md p-2 transition active:scale-95"
            title="关闭"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function GameScreen({
  initialGameState,
  perspective,
  onPerspectiveChange,
  dayNight,
  onDayNightChange,
  onRequestOpening,
}: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState || INITIAL_GAME_STATE);
  const [storyContent, setStoryContent] = useState<ParsedStoryContent>({
    maintext: "",
    options: [],
  });
  const [isPending, setIsPending] = useState(false);
  const [optionsDisabled, setOptionsDisabled] = useState(false);
  const [customAction, setCustomAction] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [localTimeStr, setLocalTimeStr] = useState("10:05:38 UTC");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNarrativeCollapsed, setIsNarrativeCollapsed] = useState(false);
  const [narrativeFontSize, setNarrativeFontSize] = useState<number>(() => {
    if (typeof window === "undefined") return 14;
    const stored = Number(window.localStorage?.getItem("star.narrativeFontSize"));
    return Number.isFinite(stored) && stored >= 10 && stored <= 28 ? stored : 14;
  });
  const [isNarrativeSettingsOpen, setIsNarrativeSettingsOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [activeInfoPanel, setActiveInfoPanel] = useState<InfoPanelKey>("plot");
  const [gearTab, setGearTab] = useState<"disguise" | "gear">("disguise");
  const [readingOpen, setReadingOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [floorEntries, setFloorEntries] = useState<FloorStoryEntry[]>([]);
  const [isLogCollapsed, setIsLogCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage?.getItem("star.logCollapsed") === "1";
  });
  const actionInputRef = useRef<HTMLInputElement>(null);
  const isRefreshingRef = useRef(false);

  // gameState 内部仍有 perspective，但显示控制由父组件 props.perspective 决定
  // 切换视角时同时更新 gameState（用于持久化）和 props
  useEffect(() => {
    if (gameState.perspective !== perspective) {
      setGameState(prev => ({ ...prev, perspective }));
    }
  }, [perspective, gameState.perspective]);

  // 实时战术时钟
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLocalTimeStr(now.toUTCString().replace("GMT", "UTC"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 持久化正文字号
  useEffect(() => {
    try {
      window.localStorage?.setItem("star.narrativeFontSize", String(narrativeFontSize));
    } catch {
      /* 忽略本地存储不可用 */
    }
  }, [narrativeFontSize]);

  // 持久化日志折叠状态
  useEffect(() => {
    try {
      window.localStorage?.setItem("star.logCollapsed", isLogCollapsed ? "1" : "0");
    } catch {
      /* 忽略本地存储不可用 */
    }
  }, [isLogCollapsed]);

  const getAccessibleTopDocument = useCallback((): Document | null => {
    try {
      return window.top?.document ?? null;
    } catch {
      return null;
    }
  }, []);

  // 全屏监听（兼容 iframe 内的 webkit 前缀）
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const topDoc = getAccessibleTopDocument() as (Document & { webkitFullscreenElement?: Element }) | null;
    const sync = () => {
      const fsEl = topDoc?.fullscreenElement || topDoc?.webkitFullscreenElement || doc.fullscreenElement || doc.webkitFullscreenElement || null;
      setIsFullscreen(!!fsEl);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    topDoc?.addEventListener("fullscreenchange", sync);
    topDoc?.addEventListener("webkitfullscreenchange", sync);
    sync();
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      topDoc?.removeEventListener("fullscreenchange", sync);
      topDoc?.removeEventListener("webkitfullscreenchange", sync);
    };
  }, [getAccessibleTopDocument]);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const topDoc = getAccessibleTopDocument() as (Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    }) | null;
    const fsEl = topDoc?.fullscreenElement || topDoc?.webkitFullscreenElement || doc.fullscreenElement || doc.webkitFullscreenElement;
    // 取最外层的可全屏目标：优先 iframe 自身的 frameElement（酒馆把 UI 塞 iframe 里），否则 body
    const target =
      (window.frameElement as HTMLElement | null) ||
      document.documentElement ||
      document.body;
    const targetEl = target as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    try {
      if (fsEl) {
        const exit =
          (topDoc?.fullscreenElement || topDoc?.webkitFullscreenElement
            ? topDoc.exitFullscreen?.bind(topDoc) || topDoc.webkitExitFullscreen?.bind(topDoc)
            : undefined) ||
          doc.exitFullscreen?.bind(doc) ||
          doc.webkitExitFullscreen?.bind(doc);
        await exit?.();
      } else {
        const req = targetEl.requestFullscreen?.bind(targetEl) || targetEl.webkitRequestFullscreen?.bind(targetEl);
        await req?.();
      }
    } catch (err) {
      console.warn("⚠️ [GameScreen] 切换全屏失败:", err);
    }
  }, [getAccessibleTopDocument]);

  // 刷新游戏数据
  const refreshAll = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log("⚠️ [GameScreen] 正在刷新中，跳过重复刷新");
      return;
    }

    isRefreshingRef.current = true;
    try {
      const data = await readStarGameData();
      const story = loadFromLatestMessage();
      setGameState(data);
      setStoryContent(story);
      // 从变量里读到的视角需要同步给父组件
      if (data.perspective !== perspective) {
        onPerspectiveChange(data.perspective);
      }
    } catch (error) {
      console.error("❌ [GameScreen] 刷新数据失败:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [perspective, onPerspectiveChange]);

  // 初始加载 + 事件监听
  useEffect(() => {
    refreshAll();

    let pendingTimer: number | null = null;

    const handleMessageUpdated = () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(refreshAll, 300);
    };

    const handleMessageReceived = () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(refreshAll, 1000);
    };

    const handleChatChanged = () => {
      refreshAll();
    };

    const listeners = [
      eventOn(tavern_events.MESSAGE_UPDATED, handleMessageUpdated),
      eventOn(tavern_events.MESSAGE_RECEIVED, handleMessageReceived),
      eventOn(tavern_events.CHAT_CHANGED, handleChatChanged),
    ];

    return () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      listeners.forEach(listener => listener?.stop?.());
    };
  }, [refreshAll]);

  const persistGameState = useCallback(async (nextState: GameState) => {
    try {
      const assistantMessages = getChatMessages(-1, { role: "assistant" });
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      const messageId = latestAssistant?.message_id ?? "latest";

      await updateVariablesWith(
        vars => {
          if (!vars) vars = { stat_data: {} };
          if (!vars.stat_data) vars.stat_data = {};
          if (!vars.stat_data.star) vars.stat_data.star = {};
          vars.stat_data.star.gameState = nextState;
          return vars;
        },
        { type: "message", message_id: messageId },
      );
    } catch (error) {
      console.warn("⚠️ [GameScreen] 写回 star.gameState 失败:", error);
    }
  }, []);

  const updateGameState = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(prev => {
      const nextState = updater(prev);
      void persistGameState(nextState);
      return nextState;
    });
  }, [persistGameState]);

  // 添加日志
  const handleAddLog = useCallback((source: TerminalLog["source"], message: string) => {
    const timestamp = new Date().toTimeString().split(" ")[0];
    const newLog: TerminalLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      source,
      message,
    };
    updateGameState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs].slice(0, 50),
    }));
  }, [updateGameState]);

  // 切换视角
  const handleSwitchPerspective = (target: PerspectiveType) => {
    if (perspective === target) return;
    setActiveInfoPanel(prev => ensureInfoPanelForPerspective(prev, target));
    onPerspectiveChange(target);

    const logMessage = `【拓扑切换】: 切换系统极光视界 -> ${
      target === "xiumin" ? "【金珉锡 - ACTIVE COGNITIVE ANCHOR】" : "【沈昌珉 - AI MATRIX OVERRIDE】"
    }`;

    updateGameState(prev => ({
      ...prev,
      perspective: target,
      logs: [buildLog("SYS", logMessage), ...prev.logs].slice(0, 50),
    }));
  };

  // 机甲展开态切换（仅前端模拟，写回需走酒馆生成）
  const handleToggleGear = () => {
    const currentlyDeployed = gameState.security.gearDeployed;
    const nextState = !currentlyDeployed;

    updateGameState(prev => ({
      ...prev,
      security: {
        ...prev.security,
        gearDeployed: nextState,
        gearDeployState: nextState ? "完全展开" : "高维折叠",
      },
      xiumin: {
        ...prev.xiumin,
        power: nextState ? Math.min(100, prev.xiumin.power + 15) : prev.xiumin.power,
        hp: nextState ? Math.max(10, prev.xiumin.hp - 10) : prev.xiumin.hp,
      },
    }));
  };

  // 饰品调频
  const handleTuneAccessory = (accName: string) => {
    updateGameState(prev => {
      const isXiumin = prev.perspective === "xiumin";
      return {
        ...prev,
        xiumin: {
          ...prev.xiumin,
          hp: isXiumin ? Math.min(100, prev.xiumin.hp + 2) : prev.xiumin.hp,
        },
        max: {
          ...prev.max,
          computation: !isXiumin ? Math.min(100, prev.max.computation + 5) : prev.max.computation,
        },
        logs: [
          buildLog(
            prev.perspective === "xiumin" ? "XIUMIN" : "MAX",
            `【饰品调频】: 正在校调 “${accName}” 的物理极光共振阻断码...`,
          ),
          ...prev.logs,
        ].slice(0, 50),
      };
    });

    setTimeout(() => {
      handleAddLog(
        "SYS",
        `【认证成功】: “${accName}” 已经与 ${
          gameState.perspective === "xiumin" ? "FC频率发生器" : "核编译隔离沙盒"
        } 完成隐秘对齐。`
      );
    }, 600);
  };

  // 清空日志
  const handleClearLogs = () => {
    updateGameState(prev => ({
      ...prev,
      logs: [buildLog("SYS", "中控控制台底层状态日志已清空。重新捕获端口中...")],
    }));
  };

  const openReadingMode = () => {
    setFloorEntries(loadAllAssistantFloors());
    setArchiveOpen(false);
    setReadingOpen(true);
  };

  const openArchiveMode = () => {
    setFloorEntries(loadAllAssistantFloors());
    setReadingOpen(false);
    setArchiveOpen(true);
  };

  const handleCreateBranch = async (messageId: number) => {
    try {
      handleAddLog("SYS", `【存档分支】: 正在为楼层 #${messageId} 创建分支...`);
      await triggerSlash(`/branch-create ${messageId}`);
      setArchiveOpen(false);
      handleAddLog("SYS", `【存档分支】: 已从楼层 #${messageId} 创建分支。`);
    } catch (error) {
      handleAddLog("WARN", `【分支创建失败】: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 提交玩家行动
  const submitNarrativeAction = async (inputText: string, requestType: "option" | "custom" = "custom") => {
    if (!inputText.trim() || isPending) return;

    setIsPending(true);
    setOptionsDisabled(true);
    setStreamingText("");
    setLoadingMsg(
      gameState.perspective === "xiumin"
        ? "【算力协调中】正在调取生体平衡抑制码，向AI发出引导求援..."
        : "【系统编译中】深渊瞒报跳线生成中，全面改写雷达网络..."
    );

    handleAddLog(
      gameState.perspective === "xiumin" ? "XIUMIN" : "MAX",
      `【选择指令】: “${inputText}”`
    );

    const success = await handleStarRequest(
      {
        type: requestType,
        content: inputText.trim(),
        gameState,
      },
      {
        onDisableOptions: () => setOptionsDisabled(true),
        onShowGenerating: () => setIsPending(true),
        onHideGenerating: () => setIsPending(false),
        onEnableOptions: () => setOptionsDisabled(false),
        onStreamingUpdate: setStreamingText,
        onRefreshStory: refreshAll,
        onError: (error) => {
          handleAddLog("WARN", `【生成失败】: ${error}`);
        },
      },
    );

    setStreamingText("");
    if (success) {
      handleAddLog("SYS", "【战术回执】: 新楼层已生成，变量与编年史同步完成。");
    }
  };

  const handleSelectPrebuiltChoice = (choice: StoryOption) => {
    if (isPending || optionsDisabled) return;
    setCustomAction(choice.text);
    actionInputRef.current?.focus();
  };

  const handleCustomActionFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitNarrativeAction(customAction);
    setCustomAction("");
  };

  useEffect(() => {
    if (!readingOpen && !archiveOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReadingOpen(false);
        setArchiveOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readingOpen, archiveOpen]);

  const isXiuminTheme = perspective === "xiumin";

  // 当前时空 → header 副标 / 时钟显示
  const st = gameState.spaceTime;
  const locationLine = (() => {
    const segs = [st.galaxy, st.planet, st.region, st.spot]
      .map(s => (s || "").trim())
      .filter(s => s && s !== "未知");
    return segs.length > 0 ? segs.join(" · ") : "未知坐标";
  })();
  const inGameDateLineCN = `${st.time.year}.${String(st.time.month).padStart(2, "0")}.${String(st.time.day).padStart(2, "0")} ${String(st.time.hour).padStart(2, "0")}:${String(st.time.minute).padStart(2, "0")}${st.time.phase !== "未知" ? ` · ${st.time.phase}` : ""}`;
  const inGameDateLineEN = (() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const m = months[Math.min(11, Math.max(0, (st.time.month || 1) - 1))];
    const d = String(st.time.day).padStart(2, "0");
    const hh = String(st.time.hour).padStart(2, "0");
    const mm = String(st.time.minute).padStart(2, "0");
    const phaseEN: Record<string, string> = {
      "黎明": "Dawn",
      "白天": "Day",
      "黄昏": "Dusk",
      "夜晚": "Night",
      "深夜": "Late Night",
    };
    const tail = st.time.phase && st.time.phase !== "未知"
      ? ` · ${phaseEN[st.time.phase] ?? st.time.phase}`
      : "";
    return `${m} ${d}, ${st.time.year} ${hh}:${mm}${tail}`;
  })();

  // 选项来源优先使用最新消息解析结果，否则使用 gameState.currentChoices
  const displayOptions =
    storyContent.options.length > 0
      ? storyContent.options
      : gameState.currentChoices.map((text, index) => ({
          id: String.fromCharCode(65 + index),
          text,
        }));

  const plotHudPanel = (
    <div
      id="main-plot-hud"
      className="rounded-lg p-3 md:p-4 relative overflow-hidden star-card"
    >
      <div className="flex items-center justify-between border-b pb-2 mb-2.5 star-border">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 star-text-primary" />
          <span className="text-[12px] uppercase tracking-widest font-bold star-text-muted">
            主线 HUD · MAIN ARC TRACKER
          </span>
        </div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded border font-bold ${
            gameState.plot.hasLocator
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/5 text-rose-400"
          }`}
        >
          {gameState.plot.hasLocator ? "定位仪：已获取" : "定位仪：未到手"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="p-2 rounded star-card-soft">
          <div className="text-[11px] uppercase tracking-widest font-bold star-text-muted mb-1">
            主线进度
          </div>
          <div className="star-text-primary font-bold leading-relaxed text-justify">
            {gameState.plot.mainProgress}
          </div>
        </div>
        <div className="p-2 rounded star-card-soft">
          <div className="text-[11px] uppercase tracking-widest font-bold star-text-muted mb-1">
            当前主要目标
          </div>
          <div className="star-text-primary font-bold leading-relaxed text-justify">
            {gameState.plot.currentObjective}
          </div>
        </div>
      </div>
    </div>
  );

  const topologyPanel = (
    <TopologyMap
      spaceTime={gameState.spaceTime}
      systemStatuses={gameState.systemStatuses}
    />
  );

  const statusPanel = (
    <StatusPanel
      perspective={gameState.perspective}
      xiuminStats={gameState.xiumin}
      maxStats={gameState.max}
    />
  );

  const gearPanel = (
    <div
      id="camouflage-armament-card"
      className="rounded-lg p-4 font-mono select-none relative overflow-hidden"
    >
      {/* Tab switcher: 伪装 / 装备 */}
      <div className="grid grid-cols-2 gap-1 border-b star-border mb-3">
        {(
          [
            { id: "disguise", label: "伪装", icon: <VenetianMask className="w-3.5 h-3.5" /> },
            { id: "gear", label: "装备", icon: <Shield className="w-3.5 h-3.5" /> },
          ] as const
        ).map((t) => {
          const active = gearTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setGearTab(t.id)}
              className={`flex items-center justify-center gap-1.5 py-2 text-[13px] font-bold transition border-b-2 ${
                active
                  ? "star-text-primary"
                  : "star-text-muted border-transparent hover:opacity-80"
              }`}
              style={active ? { borderColor: "var(--theme-primary)" } : undefined}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {gearTab === "disguise" ? (
        /* -------- 伪装 tab：ID 卡 + 掉马评估 -------- */
        <div className="space-y-3">
          {/* ID 卡 */}
          <div className="p-4 star-card-soft rounded-lg relative overflow-hidden">
            {/* 右侧 HC/FC 水印 */}
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 text-5xl font-black tracking-widest pointer-events-none select-none"
              style={{
                color:
                  gameState.security.fcStatus === "重编码FC"
                    ? "var(--theme-primary)"
                    : "var(--theme-battle)",
                opacity: 0.18,
              }}
            >
              {gameState.security.fcStatus === "重编码FC" ? "FC" : "HC"}
            </div>

            <div className="text-center text-[11px] star-text-muted tracking-[0.4em] font-bold pb-2 mb-3 border-b star-border-dashed">
              ID 卡
            </div>

            <div className="space-y-2 text-[13px] relative z-10">
              {[
                { lbl: "姓名", val: gameState.security.disguise.name },
                { lbl: "身份", val: gameState.security.disguise.role },
                { lbl: "注册地", val: gameState.security.disguise.registeredSystem },
                { lbl: "FC编号", val: gameState.security.disguise.registrationId },
              ].map((r) => (
                <div key={r.lbl} className="flex items-center justify-between gap-3">
                  <span className="star-text-muted shrink-0">{r.lbl}：</span>
                  <span className="font-bold text-right star-text-primary">{r.val}</span>
                </div>
              ))}

              <div className="pt-2 mt-2 border-t star-border-dashed flex items-center justify-between">
                <span className="star-text-muted">认证状态：</span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      gameState.security.fcStatus === "重编码FC"
                        ? "var(--theme-primary)"
                        : "var(--theme-battle)",
                  }}
                >
                  [ {gameState.security.fcStatus === "重编码FC" ? "已注册" : "未注册"} ]
                </span>
              </div>
            </div>
          </div>

          {/* 掉马评估 */}
          <div className="px-3 py-2 flex items-center justify-between text-[13px]">
            <span className="star-text-muted">掉马评估：</span>
            <span
              className="font-bold"
              style={{
                color: gameState.security.maxExposed
                  ? "var(--theme-battle)"
                  : "var(--theme-primary)",
              }}
            >
              [ {gameState.security.maxExposed ? "暴露 / 已锁定" : "安全 / 未锁定"} ]
            </span>
          </div>
        </div>
      ) : (
        /* -------- 装备 tab：机甲 / 饰品装配 / 背包载荷 -------- */
        <div className="space-y-3">
          {/* 机甲 */}
          <div className="p-4 star-card-soft rounded-lg">
            <div className="text-[11px] star-text-muted italic mb-2 flex items-center gap-1">
              <span className="star-text-primary">|</span>
              <span>【机甲】</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="star-text-muted">当前状态：</span>
              <div className="flex items-center gap-2">
                <span
                  className="font-bold"
                  style={{
                    color: gameState.security.gearDeployed
                      ? "var(--theme-primary)"
                      : "var(--theme-battle)",
                  }}
                >
                  {gameState.security.gearDeployState}
                </span>
                {/* 仅在机甲在身（非"遗失"/"未知"/"原石"）时才显示展开/收拢按钮 */}
                {!["遗失", "未知", "原石"].includes(gameState.security.gearDeployState) && (
                  <button
                    onClick={handleToggleGear}
                    className={`text-[11px] px-2 py-0.5 rounded transition font-bold ${
                      gameState.security.gearDeployed ? "star-btn-active animate-pulse" : "star-btn"
                    }`}
                  >
                    {gameState.security.gearDeployed ? "收拢" : "展开"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 饰品装配 */}
          <div className="p-4 star-card-soft rounded-lg">
            <div className="text-[11px] star-text-muted italic mb-2 flex items-center gap-1">
              <span className="star-text-primary">|</span>
              <span>【饰品装配】</span>
            </div>
            {gameState.security.accessories.length === 0 ? (
              <div className="py-3 text-center text-[13px] font-bold" style={{ color: "var(--theme-battle)" }}>
                【无饰品装配】
              </div>
            ) : (
              <div className="space-y-1.5">
                {gameState.security.accessories.map((acc, index) => (
                  <div
                    key={index}
                    className="p-1.5 rounded flex items-center justify-between text-[13px]"
                    style={{ background: "var(--bg-soft)" }}
                  >
                    <span style={{ color: "var(--text-main)" }}>{acc}</span>
                    <button
                      onClick={() => handleTuneAccessory(acc)}
                      className="text-[11px] px-2 py-0.5 rounded transition star-btn"
                    >
                      精密调频
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 背包载荷 */}
          <div className="p-4 star-card-soft rounded-lg">
            <div className="text-[11px] star-text-muted italic mb-2 flex items-center gap-1">
              <span className="star-text-primary">|</span>
              <span>【背包载荷】</span>
            </div>
            {gameState.security.backpack.length === 0 ? (
              <div className="py-3 text-center text-[13px] star-text-muted italic">
                ( 背包为空 )
              </div>
            ) : (
              <div className="space-y-2">
                {gameState.security.backpack.map((item) => (
                  <div
                    key={item.name}
                    className="px-3 py-2 rounded text-[13px] star-card-soft"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold star-text-primary">{item.name}</span>
                      <span className="text-[12px] star-text-muted">x{item.count}</span>
                    </div>
                    {item.description ? (
                      <div className="text-[12px] star-text-muted leading-tight">{item.description}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const teammatesPanel = (
    <TeammatesPanel
      teammates={gameState.teammates}
      bonds={gameState.bonds}
    />
  );

  const battleAlertsPanel = <BattleAlertsPanel alerts={gameState.alerts} />;

  const darkWebPanel = <DarkWebPanel posts={gameState.posts} forumMeta={gameState.forumMeta} onAddLog={handleAddLog} />;
  const socialPanel = <SocialPanel bonds={gameState.bonds} />;

  const allInfoTabs: InfoTab[] = [
    { key: "plot", label: "主线", code: "ARC", icon: Target, content: plotHudPanel },
    { key: "api", label: "API", code: "API", icon: Cpu, content: plotHudPanel },
    { key: "map", label: "星图", code: "MAP", icon: Map, content: topologyPanel },
    { key: "status", label: "状态", code: "BIO", icon: Activity, content: statusPanel },
    { key: "core", label: "核心", code: "CORE", icon: Activity, content: statusPanel },
    { key: "gear", label: "装备", code: "GEAR", icon: Shield, content: gearPanel },
    { key: "anchor", label: "锚点", code: "SYNC", icon: Shield, content: gearPanel },
    { key: "team", label: "队友", code: "TEAM", icon: Users, content: teammatesPanel },
    { key: "observe", label: "观测", code: "OBS", icon: Users, content: teammatesPanel },
    { key: "battle", label: "战局", code: "WATCH", icon: Radar, content: battleAlertsPanel },
    { key: "social", label: "社交", code: "SOC", icon: Heart, content: socialPanel },
    { key: "darkweb", label: "暗网", code: "DARK", icon: RadioTower, content: darkWebPanel },
  ];

  const activeInfoPanelForPerspective = ensureInfoPanelForPerspective(activeInfoPanel, perspective);
  const infoTabs = INFO_PANEL_KEYS_BY_PERSPECTIVE[perspective]
    .map(key => allInfoTabs.find(tab => tab.key === key))
    .filter((tab): tab is InfoTab => Boolean(tab));
  const activeInfoTab = infoTabs.find(tab => tab.key === activeInfoPanelForPerspective) ?? infoTabs[0];

  return (
    <div
      className={`star-shell flex flex-col font-mono select-none overflow-x-hidden transition-all duration-700 relative ${isFullscreen ? "min-h-screen justify-between" : ""}`}
    >
      {/* Immersive Scanlines and background aesthetic glitch filters */}
      <div className="absolute inset-0 scanline-overlay opacity-[0.05] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient-effect" />

      {readingOpen && (
        <FullPageModal
          title="阅读模式 / MAIN TEXT ARCHIVE"
          subtitle="按 assistant 楼层读取正文记录"
          onClose={() => setReadingOpen(false)}
        >
          <div className="space-y-3">
            {floorEntries.length === 0 ? (
              <div className="rounded-lg p-4 text-sm text-center star-card-soft star-text-muted">
                暂无可读取正文。
              </div>
            ) : (
              floorEntries.map(entry => (
                <section key={entry.messageId} className="rounded-lg p-3 star-card-soft">
                  <div className="text-[12px] uppercase tracking-widest font-bold star-text-muted mb-2">
                    楼层 #{entry.messageId}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
                    {entry.maintext || "（无 maintext / scene 正文）"}
                  </div>
                </section>
              ))
            )}
          </div>
        </FullPageModal>
      )}

      {archiveOpen && (
        <FullPageModal
          title="读档列表 / BRANCH ARCHIVE"
          subtitle="点击楼层摘要后，将使用 /branch-create 创建分支"
          onClose={() => setArchiveOpen(false)}
        >
          <div className="space-y-2">
            {floorEntries.length === 0 ? (
              <div className="rounded-lg p-4 text-sm text-center star-card-soft star-text-muted">
                暂无可读档楼层。
              </div>
            ) : (
              floorEntries.map(entry => (
                <button
                  key={entry.messageId}
                  type="button"
                  onClick={() => handleCreateBranch(entry.messageId)}
                  disabled={isPending}
                  className="w-full rounded-lg p-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed star-card-soft hover:star-card"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[12px] uppercase tracking-widest font-bold star-text-primary">
                      楼层 #{entry.messageId}
                    </span>
                    <span className="text-[11px] star-text-muted">点击创建分支</span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
                    {entry.sum || "（无摘要，可点击从该楼层创建分支）"}
                  </div>
                </button>
              ))
            )}
          </div>
        </FullPageModal>
      )}

      {/* -------------------- DUAL TERMINAL TOP METADATA ROW -------------------- */}
      <header
        className="border-b py-3.5 px-4 md:px-6 relative z-30 star-border"
        style={{ background: "var(--bg-header)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col items-stretch gap-2">
          {/* 第一排：视角切换居中 + 设置按钮靠右 */}
          <div className="relative flex items-center justify-center min-h-[40px]">
            <div className="flex star-card-soft p-1 rounded-lg gap-1.5 shadow-inner">
              <button
                onClick={() => handleSwitchPerspective("xiumin")}
                className={`flex items-center gap-2 text-sm font-bold py-1.5 px-4 rounded-md transition-all ${
                  isXiuminTheme ? "star-btn-active" : "star-btn"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>金珉锡视界</span>
              </button>
              <button
                onClick={() => handleSwitchPerspective("max")}
                className={`flex items-center gap-2 text-sm font-bold py-1.5 px-4 rounded-md transition-all ${
                  !isXiuminTheme ? "star-btn-active" : "star-btn"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>沈昌珉内核</span>
              </button>
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen(prev => !prev)}
                className="p-1.5 rounded-md transition star-btn"
                title="工具菜单"
                aria-label="工具菜单"
                aria-haspopup="menu"
                aria-expanded={isHeaderMenuOpen}
              >
                <Settings className="w-4 h-4" />
              </button>
              {isHeaderMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsHeaderMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    aria-label="工具菜单"
                    className="absolute right-0 top-full mt-1 w-44 rounded-lg p-1.5 z-40 star-card shadow-xl"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        toggleFullscreen();
                      }}
                      className="w-full flex items-center gap-2 text-[13px] font-bold py-1.5 px-2 rounded-md transition star-btn justify-start"
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span>退出全屏</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>进入全屏</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        openReadingMode();
                      }}
                      className="w-full flex items-center gap-2 text-[13px] font-bold py-1.5 px-2 rounded-md transition star-btn justify-start"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>阅读模式</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        openArchiveMode();
                      }}
                      className="w-full flex items-center gap-2 text-[13px] font-bold py-1.5 px-2 rounded-md transition star-btn justify-start"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>读档分支</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        onDayNightChange(dayNight === "day" ? "night" : "day");
                      }}
                      className="w-full flex items-center gap-2 text-[13px] font-bold py-1.5 px-2 rounded-md transition star-btn justify-start"
                    >
                      {dayNight === "day" ? (
                        <>
                          <Sun className="w-3.5 h-3.5" />
                          <span>切换为夜间</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-3.5 h-3.5" />
                          <span>切换为日间</span>
                        </>
                      )}
                    </button>
                    {onRequestOpening && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onRequestOpening();
                        }}
                        className="w-full flex items-center gap-2 text-[13px] font-bold py-1.5 px-2 rounded-md transition star-btn justify-start"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>重新初始化</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 第二排：时间（视角联动：金珉锡=数字+中文，沈昌珉=英文月份+UTC) */}
          <div className="flex items-center justify-center gap-2 text-[12px] star-text-muted font-bold leading-tight">
            <Clock className="w-3.5 h-3.5" />
            {isXiuminTheme ? (
              <>
                <span className="text-[11px] tracking-wide opacity-70">星历</span>
                <span>{inGameDateLineCN}</span>
              </>
            ) : (
              <>
                <span className="text-[11px] uppercase tracking-widest opacity-70">STAR_LOG</span>
                <span>{inGameDateLineEN}</span>
                <span className="text-[11px] opacity-70 hidden md:inline">// {localTimeStr}</span>
              </>
            )}
          </div>

          {/* 第三排：地点（原标题） */}
          <p className="text-center text-[11px] star-text-muted font-bold uppercase tracking-widest font-mono truncate">
            {locationLine}
          </p>
        </div>
      </header>

      {/* -------------------- TICKING IMMERSIVE BROADCAST NEWS ROW -------------------- */}
      <div
        className="border-b py-1 px-4 relative overflow-hidden z-10 flex items-center star-border"
        style={{ background: "var(--bg-soft)" }}
      >
        <span className="text-[11px] font-black tracking-wider star-text-battle px-2 py-0.5 rounded mr-4 z-10 shrink-0"
              style={{ background: "var(--bg-card)" }}
        >
          星际网情报
        </span>
        <div className="marquee-wrapper whitespace-nowrap overflow-hidden text-[12px] star-text-muted">
          <div className="marquee">
            &lt;&lt;&lt; 【星际网情报】 信道接入中，待接收... &gt;&gt;&gt;
          </div>
        </div>
      </div>

      {/* -------------------- MAIN DOUBLE COLUMN SYSTEM PANELS -------------------- */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
        {/* LEFT COLUMN: RPG Dialogue Console (Center) & Dark Web (BBS Feed) */}
        <div className={`${isFullscreen ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-6`}>
          {/* Active Dialog Console */}
          <div
            id="narrative-dialog-console"
            className="flex flex-col rounded-lg p-4 md:p-5 relative overflow-hidden border star-border"
            style={{ background: "var(--bg-content)" }}
          >
            <div className="flex items-center justify-between gap-3 border-b pb-2 mb-3 text-[12px] star-text-muted font-bold star-border">
              <span className="flex items-center gap-1 min-w-0">
                <Terminal className="w-3.5 h-3.5 star-text-primary shrink-0" />
                <span className="truncate">ACTIVE PERSPECTIVE DEVIATOR TERMINAL v6.2</span>
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:flex items-center gap-1 animate-pulse star-text-loc">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--theme-loc)" }} />
                  战术链接正常
                </span>
                <button
                  type="button"
                  onClick={() => setIsNarrativeCollapsed(prev => !prev)}
                  className="text-[11px] px-2 py-0.5 rounded transition star-btn"
                  aria-expanded={!isNarrativeCollapsed}
                  aria-controls="narrative-maintext-panel"
                  title={isNarrativeCollapsed ? "展开正文" : "折叠正文"}
                >
                  {isNarrativeCollapsed ? "[+] 展开正文" : "[-] 折叠正文"}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsNarrativeSettingsOpen(prev => !prev)}
                    className="p-1 rounded transition star-btn"
                    aria-expanded={isNarrativeSettingsOpen}
                    aria-haspopup="dialog"
                    title="正文显示设置"
                    aria-label="正文显示设置"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  {isNarrativeSettingsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsNarrativeSettingsOpen(false)}
                        aria-hidden="true"
                      />
                      <div
                        role="dialog"
                        aria-label="正文显示设置"
                        className="absolute right-0 top-full mt-1 w-56 rounded-lg p-3 z-40 star-card shadow-xl"
                      >
                        <div className="flex items-center justify-between border-b pb-2 mb-2 star-border">
                          <span className="text-[12px] uppercase tracking-widest font-bold star-text-primary">
                            正文显示设置
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsNarrativeSettingsOpen(false)}
                            className="p-0.5 rounded star-btn"
                            aria-label="关闭设置"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[12px] star-text-muted">
                            <span className="font-bold">字体大小</span>
                            <span className="star-text-primary font-bold">{narrativeFontSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={28}
                            step={1}
                            value={narrativeFontSize}
                            onChange={e => setNarrativeFontSize(Number(e.target.value))}
                            className="w-full"
                            aria-label="正文字体大小"
                          />
                          <div className="flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() => setNarrativeFontSize(prev => Math.max(10, prev - 1))}
                              className="flex-1 text-[12px] py-1 rounded star-btn"
                            >
                              A-
                            </button>
                            <button
                              type="button"
                              onClick={() => setNarrativeFontSize(14)}
                              className="flex-1 text-[12px] py-1 rounded star-btn"
                              title="恢复默认 14px"
                            >
                              默认
                            </button>
                            <button
                              type="button"
                              onClick={() => setNarrativeFontSize(prev => Math.min(28, prev + 1))}
                              className="flex-1 text-[12px] py-1 rounded star-btn"
                            >
                              A+
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Story maintext display */}
            {isNarrativeCollapsed ? (
              <div
                id="narrative-maintext-panel"
                className="mb-4 rounded-lg px-3 py-2 text-[12px] star-card-soft star-text-muted"
              >
                正文显示已折叠，行动选项与自定义指令仍可继续使用。
              </div>
            ) : (
              <div id="narrative-maintext-panel" className="space-y-4 mb-4 pr-1.5 overflow-y-auto max-h-[min(42vh,520px)]">
                {storyContent.maintext || streamingText ? (
                  <div
                    className="p-3 rounded-lg leading-relaxed whitespace-pre-wrap star-card-soft"
                    style={{ fontSize: `${narrativeFontSize}px`, textIndent: "2em" }}
                  >
                    {streamingText || storyContent.maintext}
                  </div>
                ) : (
                  <div
                    className="p-3 rounded-lg leading-relaxed star-card-soft star-text-muted"
                    style={{ fontSize: `${narrativeFontSize}px`, textIndent: "2em" }}
                  >
                    （等待战术通信建立...）
                  </div>
                )}

                {isPending && (
                  <div className="flex flex-col items-start animate-pulse">
                    <span className="text-[11px] star-text-muted font-bold mb-1">战局核编译算力推演中...</span>
                    <div className="p-3 rounded-lg text-sm flex items-center gap-2 star-card-soft star-text-primary">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{loadingMsg}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Decision Choices */}
            <div className="space-y-2 mb-3.5">
              <span className="text-[11px] uppercase tracking-widest block font-bold star-text-muted">
                提出战术行动命令 (快捷选项):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {displayOptions.map((option) => (
                  <button
                    key={option.id}
                    disabled={isPending || optionsDisabled}
                    onClick={() => handleSelectPrebuiltChoice(option)}
                    className="text-[13px] p-2 rounded-md text-left leading-relaxed cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed star-card-soft hover:star-card"
                  >
                    <span className="star-text-primary font-bold mr-1">{option.id}.</span>
                    {option.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom action input */}
            <form onSubmit={handleCustomActionFormSubmit} className="flex gap-2">
              <input
                ref={actionInputRef}
                type="text"
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                disabled={isPending}
                placeholder={
                  isXiuminTheme
                    ? "输入金珉锡的自主异能突破或生存动作..."
                    : "输入沈昌珉的人工智能编译强侵指令..."
                }
                className="star-input flex-grow rounded-md px-3.5 py-2.5 text-sm font-mono disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isPending || !customAction.trim()}
                className="star-btn px-3 rounded-md text-sm font-bold transition flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                title="下达战术决策"
                aria-label="下达战术决策"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {isFullscreen ? (
            <>
              <div>{plotHudPanel}</div>
              <div>{topologyPanel}</div>
            </>
          ) : (
            <div
              className="rounded-lg p-3 md:p-4 border star-border"
              style={{ background: "var(--bg-content)" }}
            >
              <div className="flex items-center justify-between gap-3 border-b pb-3 mb-4 star-border">
                <div>
                  <div className="text-[12px] uppercase tracking-widest font-bold star-text-primary">
                    INFO PANEL SWITCHER
                  </div>
                  <div className="text-[11px] star-text-muted mt-1">
                    非全屏状态下以标签形态查看正文下方系统面板
                  </div>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-4">
                <div
                  role="tablist"
                  aria-label="正文下方系统面板"
                  className="flex xl:flex-col star-card-soft p-1 rounded-lg gap-1.5 shadow-inner overflow-x-auto xl:overflow-x-visible xl:overflow-y-auto xl:w-[96px] xl:shrink-0 xl:max-h-[620px]"
                >
                  {infoTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeInfoPanelForPerspective === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveInfoPanel(tab.key)}
                        className={`relative shrink-0 min-w-[74px] xl:min-w-0 xl:w-full rounded-md border px-3 py-2.5 text-center transition-all overflow-hidden ${
                          isActive
                            ? "bg-[var(--bg-card)] border-[var(--theme-primary)] star-text-primary shadow-sm"
                            : "star-btn opacity-80 hover:opacity-100"
                        }`}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-[var(--theme-primary)]"
                          />
                        )}
                        <span className="flex flex-col items-center gap-1 leading-none">
                          <Icon className="w-4 h-4" />
                          <span className="text-[13px] font-black tracking-wider">{tab.label}</span>
                          <span className="text-[10px] font-bold tracking-[0.18em] opacity-60">{tab.code}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div role="tabpanel" className="min-w-0 flex-1 animate-fadeIn h-[450px] overflow-hidden">
                  {activeInfoTab.content}
                </div>
              </div>
            </div>
          )}
        </div>

        {isFullscreen && (
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div>{statusPanel}</div>
            <div>{gearPanel}</div>
            <div>{teammatesPanel}</div>
            <div>{battleAlertsPanel}</div>
            <div>{isXiuminTheme ? socialPanel : darkWebPanel}</div>
          </div>
        )}
      </main>

      {/* -------------------- UNIFIED TERMINAL BOTTOM SYSTEM BAR -------------------- */}
      <footer
        className="border-t py-3.5 px-4 md:px-6 relative z-10 font-mono star-border"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between gap-4">
          <div className="flex-grow">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={!isLogCollapsed}
              aria-controls="bottom-log-stream"
              onClick={() => setIsLogCollapsed(prev => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsLogCollapsed(prev => !prev);
                }
              }}
              className={`flex items-center justify-between border-b pb-2 text-[12px] star-text-muted star-border cursor-pointer select-none hover:opacity-80 transition ${isLogCollapsed ? "" : "mb-2"}`}
              title={isLogCollapsed ? "展开日志" : "折叠日志"}
            >
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider star-text-primary">
                {isLogCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                <Sliders className="w-3.5 h-3.5" />
                XIUMIN_TERM // 底层全局核异常观测节点日志 (LOG STREAM)
                {isLogCollapsed && gameState.logs.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[11px] font-bold star-card-soft">
                    {gameState.logs.length}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearLogs();
                }}
                className="text-[11px] px-2 py-0.5 rounded transition star-btn"
              >
                复位内核日志
              </button>
            </div>

            {!isLogCollapsed && (
              <div id="bottom-log-stream" className="rounded p-2 text-[12px] font-mono space-y-1 star-card-soft">
                {gameState.logs.length === 0 ? (
                  <div className="star-text-muted text-center py-4">
                    ( 暂无新异常数据，多频监测核心正在等待系统极化动作... )
                  </div>
                ) : (
                  gameState.logs.slice(0, 8).map((log) => {
                    let badgeColor = "var(--text-muted)";
                    if (log.source === "XIUMIN") badgeColor = "var(--theme-time)";
                    if (log.source === "MAX") badgeColor = "var(--theme-battle)";
                    if (log.source === "WARN") badgeColor = "var(--theme-battle)";
                    if (log.source === "NET") badgeColor = "var(--theme-loc)";
                    if (log.source === "SYS") badgeColor = "var(--theme-primary)";

                    return (
                      <div key={log.id} className="flex gap-2 text-justify">
                        <span className="shrink-0 select-none star-text-muted">[{log.timestamp}]</span>
                        <span className="shrink-0 select-none font-bold" style={{ color: badgeColor }}>[{log.source}]</span>
                        <span style={{ color: "var(--text-main)" }}>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
