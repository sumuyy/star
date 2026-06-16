/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { OpeningFormData, GameState, PerspectiveType } from "./types";
import { readStarGameData } from "./utils/variableReader";
import { buildInitialGameState, initializeGameVariables, createOpeningStoryMessage } from "./utils/gameInitializer";
import GameScreen from "./components/GameScreen";
import OpeningForm from "./components/OpeningForm";

declare function getLastMessageId(): number;
declare function getVariables(option: { type: "message"; message_id: number | "latest" } | { type: "chat" }): Record<string, any>;

enum GamePhase {
  LOADING = "loading",
  OPENING = "opening",
  GAME = "game",
}

export type DayNight = "day" | "night";

const DAY_NIGHT_KEY = "star.dayNight";

function loadDayNight(): DayNight {
  try {
    const stored = localStorage.getItem(DAY_NIGHT_KEY);
    if (stored === "day" || stored === "night") return stored;
  } catch {}
  // 默认按当前时间猜：6:00–18:00 算白天
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

function persistDayNight(value: DayNight) {
  try {
    localStorage.setItem(DAY_NIGHT_KEY, value);
  } catch {}
}

/**
 * 判断变量树里是否已经有 star 游戏数据。
 * 用来跳过开局表单：只要 stat_data.star.gameState 已存在（无论楼层多少），都直接进入 GameScreen。
 */
function hasExistingGameData(): boolean {
  const probe = (vars: any): boolean => !!vars?.stat_data?.star?.gameState;
  try {
    if (probe(getVariables({ type: "message", message_id: "latest" }))) return true;
  } catch {}
  try {
    if (probe(getVariables({ type: "message", message_id: 0 }))) return true;
  } catch {}
  try {
    if (probe(getVariables({ type: "chat" }))) return true;
  } catch {}
  return false;
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOADING);
  const [initialGameState, setInitialGameState] = useState<GameState | undefined>(undefined);
  const [perspective, setPerspective] = useState<PerspectiveType>("xiumin");
  const [dayNight, setDayNight] = useState<DayNight>(loadDayNight);
  const [forceShowOpening, setForceShowOpening] = useState(false);

  // 把主题写到 <html data-star-theme="...">，CSS 变量切换由这一个属性驱动
  const themeKey = useMemo(() => `${perspective}-${dayNight}`, [perspective, dayNight]);
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-star-theme", themeKey);
    return () => {
      root.removeAttribute("data-star-theme");
    };
  }, [themeKey]);

  useEffect(() => {
    persistDayNight(dayNight);
  }, [dayNight]);

  useEffect(() => {
    const init = async () => {
      try {
        const lastMessageId = getLastMessageId();
        const hasData = hasExistingGameData();
        console.log("📊 [star App] 楼层数:", lastMessageId, "已有 star 数据:", hasData);

        // 已经初始化过：直接读数据进入游戏
        if (hasData) {
          const data = await readStarGameData();
          setInitialGameState(data);
          setPerspective(data.perspective);
          setPhase(GamePhase.GAME);
          return;
        }

        // 没有数据但用户主动要求显示开局表单
        if (forceShowOpening) {
          setPhase(GamePhase.OPENING);
          return;
        }

        // 默认：还是给个 GameScreen（用 INITIAL_GAME_STATE 兜底），用户可在右上角随时打开开局表单重新初始化
        setPhase(GamePhase.GAME);
      } catch (error) {
        console.error("❌ [star App] 初始化失败，回退到 GameScreen:", error);
        setPhase(GamePhase.GAME);
      }
    };

    init();
  }, [forceShowOpening]);

  const handleOpeningSubmit = async (formData: OpeningFormData) => {
    console.log("🎮 [star App] 开始初始化游戏变量...");
    const initSuccess = await initializeGameVariables(formData);
    if (!initSuccess) {
      console.error("❌ [star App] 初始化游戏变量失败，但继续进入游戏");
    }

    console.log("📖 [star App] 开始创建开局介绍楼层...");
    const storySuccess = await createOpeningStoryMessage(formData);
    if (!storySuccess) {
      console.error("❌ [star App] 创建开局介绍楼层失败，但继续进入游戏");
    }

    const data = initSuccess || storySuccess ? await readStarGameData() : buildInitialGameState(formData);
    setInitialGameState(data);
    setPerspective(data.perspective);
    setForceShowOpening(false);
    setPhase(GamePhase.GAME);
  };

  if (phase === GamePhase.LOADING) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono star-shell">
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3 star-text-primary"
               style={{ borderColor: "var(--border-color)", borderTopColor: "var(--theme-primary)" }}
          />
          <div className="text-sm font-bold tracking-widest star-text-primary">XIUMIN_TERM // 系统自检中...</div>
        </div>
      </div>
    );
  }

  if (phase === GamePhase.OPENING) {
    return <OpeningForm onSubmit={handleOpeningSubmit} onCancel={hasExistingGameData() ? () => { setForceShowOpening(false); setPhase(GamePhase.GAME); } : undefined} />;
  }

  return (
    <GameScreen
      initialGameState={initialGameState}
      perspective={perspective}
      onPerspectiveChange={setPerspective}
      dayNight={dayNight}
      onDayNightChange={setDayNight}
      onRequestOpening={() => {
        setForceShowOpening(true);
        setPhase(GamePhase.OPENING);
      }}
    />
  );
}
