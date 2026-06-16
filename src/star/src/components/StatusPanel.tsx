/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TODO: 整个面板（金珉锡侧 / Max 侧）写死的标题、tag、文案均与世界书脱节，
 * 计划整体重写。涉及的硬编码项参见与设定的对照清单：
 *   - 金珉锡侧标题 `生体与绝对零度反馈层` / `SUBJECT-X-03 CORE`
 *   - Max 侧标题 `AI大底内核监控矩阵` / `DEEP-AEGIS CORE MONITOR` / `Aegis 守护核`
 *   - HP 描述 `极限冷冻在侵蚀骨髓...`
 *   - 算力分配四档 `供养金珉 / 维持黑市 / 瞒报遮蔽 / 自我演算`
 *     - 含底部说明 `偏向[瞒报遮蔽]会加速减少 Nexus 主网暴露值...`（Nexus 与「红」是两条独立势力线）
 *   - 心理防线衍生文案 `冰壳状态由[责任值 - 好感度]差值衍生...`
 */

import { useState } from "react";
import { XiuminStats, MaxStats } from "../types";
import { Activity, ShieldAlert, Cpu, Zap, Award, EyeOff, Brain, HeartPulse } from "lucide-react";

interface StatusPanelProps {
  perspective: "xiumin" | "max";
  xiuminStats: XiuminStats;
  maxStats: MaxStats;
}

/**
 * FC 状态已挪到装备面板（GameScreen gearPanel · 伪装 tab），状态面板不再渲染 FC。
 */

export default function StatusPanel({ perspective, xiuminStats, maxStats }: StatusPanelProps) {
  // Local allocations for simulation
  const [allocationMode, setAllocationMode] = useState<string>("BALANCE");
  // 金珉锡侧分栏：心理 / 体征
  const [xiuminTab, setXiuminTab] = useState<"mind" | "body">("mind");

  return (
    <div id="status-panel-card" className="rounded-lg p-5 font-mono select-none relative overflow-hidden h-full">
      {/* Absolute glow points */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Perspective Tab Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          {perspective === "xiumin" ? (
            <Activity className="w-5 h-5 text-sky-400 animate-pulse" />
          ) : (
            <Cpu className="w-5 h-5 text-rose-500 animate-pulse" />
          )}
          <div>
            <h2 className="text-base font-semibold tracking-wider text-slate-100">
              {perspective === "xiumin" ? "冰核体征反馈层" : "AI大底内核监控矩阵"}
            </h2>
            <p className="text-[12px] text-slate-400 uppercase">
              {perspective === "xiumin" ? "XIUMIN // BIOMETRIC OVERLAY" : "AI SYSTEM COMPILER KERNEL MONITOR"}
            </p>
          </div>
        </div>
        <div className="text-right text-[12px] text-slate-500 font-bold">
          {perspective === "xiumin" ? "SUBJECT.X-LIVE" : "DEEP-AEGIS CORE MONITOR"}
        </div>
      </div>

      {perspective === "xiumin" ? (
        /* ==================== XIUMIN PERSPECTIVE UI ==================== */
        <div className="flex flex-col gap-3">
          {/* Tab switcher: 心理 / 体征 */}
          <div className="grid grid-cols-2 gap-1 border-b border-slate-800">
            {(
              [
                { id: "mind", label: "心理", icon: <Brain className="w-3.5 h-3.5" /> },
                { id: "body", label: "体征", icon: <HeartPulse className="w-3.5 h-3.5" /> },
              ] as const
            ).map((t) => {
              const active = xiuminTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setXiuminTab(t.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 text-[13px] font-bold transition border-b-2 ${
                    active
                      ? "text-sky-300 border-sky-400"
                      : "text-slate-500 border-transparent hover:text-slate-300"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {xiuminTab === "mind" ? (
            /* -------- 心理 tab -------- */
            (() => {
              const diff = xiuminStats.responsibility - xiuminStats.affection;
              let tag: string, desc: string, ico: string, focus: string, sub: string, color: string;
              if (diff < -10) {
                tag = "粉碎";
                desc = "防线崩溃，彻底接纳。对温度的本能眷恋越过责任，潜意识选择沉溺。";
                ico = "❤️ 🔥";
                focus = "汲取温度，靠近他";
                sub = "本能驱动 90%";
                color = "text-rose-400";
              } else if (diff <= 40) {
                tag = "裂痕";
                desc = "理智仍在抗拒，但本能与潜意识已开始动摇。坚冰之下，有什么正在融化。";
                ico = "⚠️ 💧";
                focus = "抗拒与渴望的拉扯";
                sub = `内部冲突 ${100 - diff}%`;
                color = "text-amber-300";
              } else {
                tag = "完整";
                desc = "绝对理智，防备极深，责任压倒一切。潜意识的冰壳正牢牢封锁着任何多余的情感波动。";
                ico = "🛡️ 🧊";
                focus = "完成任务，找回同伴";
                sub = "理智主导 99%";
                color = "text-sky-300";
              }
              return (
                <div className="flex flex-col gap-3">
                  {/* 此刻的焦点 */}
                  <div id="stat-xiumin-focus" className="p-4 star-card-soft rounded-lg">
                    <div className="text-[11px] text-slate-500 italic mb-2 flex items-center gap-1">
                      <span className="text-sky-400">|</span>
                      <span>此刻的焦点</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 py-2">
                      <div className="text-2xl leading-none">{ico}</div>
                      <div className={`text-base font-bold tracking-wide ${color}`}>{focus}</div>
                      <div className="text-[12px] text-slate-500">{sub}</div>
                    </div>
                  </div>

                  {/* 此刻的防线 */}
                  <div id="stat-xiumin-mind" className="p-4 star-card-soft rounded-lg">
                    <div className="text-[11px] text-slate-500 italic mb-2 flex items-center gap-1">
                      <span className="text-sky-400">|</span>
                      <span>此刻的防线</span>
                    </div>
                    <div className="mb-2">
                      <span className={`inline-block px-2.5 py-1 rounded text-[12px] font-bold star-bar-bg border ${color} border-current/40`}>
                        {tag}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 leading-relaxed text-justify">{desc}</p>
                  </div>

                  {/* 驱动力指标 */}
                  <div id="stat-xiumin-drive" className="p-4 star-card-soft rounded-lg space-y-3">
                    <div className="text-[11px] text-slate-500 italic flex items-center gap-1">
                      <span className="text-sky-400">|</span>
                      <span>驱动力指标</span>
                    </div>

                    {/* 责任 */}
                    <div id="stat-xiumin-responsibility" className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                          责任
                        </span>
                        <span className="text-indigo-300 font-bold">{xiuminStats.responsibility}</span>
                      </div>
                      <div className="w-full star-bar-bg h-1.5 rounded overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${xiuminStats.responsibility}%` }}
                        />
                      </div>
                    </div>

                    {/* 眷恋 */}
                    <div id="stat-xiumin-affection" className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <Award className="w-3.5 h-3.5 text-pink-400" />
                          眷恋
                        </span>
                        <span className="text-pink-400 font-bold">{xiuminStats.affection}</span>
                      </div>
                      <div className="w-full star-bar-bg h-1.5 rounded overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-pink-500 h-full transition-all duration-300"
                          style={{ width: `${xiuminStats.affection}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* -------- 体征 tab -------- */
            (() => {
              const p = xiuminStats.power;
              let powerTag: string, powerColor: string, powerIco: string;
              if (p === 0) {
                powerTag = xiuminStats.idleMode;
                powerColor = "text-slate-300";
                powerIco = "💤";
              } else if (p < 50) {
                powerTag = "伪装态 · 冰系";
                powerColor = "text-sky-300";
                powerIco = "❄️";
              } else if (p <= 75) {
                powerTag = "规则态 · 熵减";
                powerColor = "text-emerald-300";
                powerIco = "🧊";
              } else if (p < 100) {
                powerTag = "爆发态 · 时空锁相";
                powerColor = "text-amber-300";
                powerIco = "⚡";
              } else {
                powerTag = "完全爆发";
                powerColor = "text-rose-400";
                powerIco = "🌀";
              }

              const bal = xiuminStats.hp;
              const balTag = bal > 80 ? "稳定" : bal >= 40 ? "警告" : bal >= 10 ? "危险" : "致命";
              const balDesc =
                bal > 80
                  ? "机能完好，无明显异常。"
                  : bal >= 40
                  ? "出现冻伤、血液流速减慢等侵蚀症状。"
                  : bal >= 10
                  ? "局部结晶化，肉体濒临崩溃边缘。"
                  : "生命体征微弱，濒临绝对冻结。";
              const balTagColor =
                bal > 80
                  ? "text-emerald-400 border-emerald-500/40"
                  : bal >= 40
                  ? "text-amber-300 border-amber-500/40"
                  : bal >= 10
                  ? "text-rose-400 border-rose-500/40"
                  : "text-red-500 border-red-500/40";
              const balBarColor =
                bal > 80
                  ? "bg-emerald-400/80"
                  : bal >= 40
                  ? "bg-amber-400/80"
                  : bal >= 10
                  ? "bg-rose-500"
                  : "bg-red-500 animate-pulse";

              return (
                <div className="flex flex-col gap-3">
                  {/* 当前异能态 */}
                  <div id="stat-xiumin-power" className="p-4 star-card-soft rounded-lg">
                    <div className="text-[11px] text-slate-500 italic mb-2 flex items-center gap-1">
                      <span className="text-sky-400">|</span>
                      <span>当前异能态</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 py-2">
                      <div className="text-2xl leading-none">{powerIco}</div>
                      <div className={`text-base font-bold tracking-wide ${powerColor}`}>{powerTag}</div>
                      <div className="text-[12px] text-slate-500">异能输出: {p}%</div>
                    </div>
                  </div>

                  {/* 生理负荷监控 */}
                  <div id="stat-xiumin-hp" className="p-4 star-card-soft rounded-lg">
                    <div className="text-[11px] text-slate-500 italic mb-2 flex items-center gap-1">
                      <span className="text-sky-400">|</span>
                      <span>生理负荷监控</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-block px-2.5 py-1 rounded text-[12px] font-bold star-bar-bg border ${balTagColor} ${bal < 10 ? "animate-pulse" : ""}`}>
                        {balTag}
                      </span>
                      <span className={`text-[13px] font-bold ${balTagColor.split(" ")[0]}`}>{bal}%</span>
                    </div>
                    <p className="text-[12px] text-slate-400 leading-relaxed mb-2.5 text-justify">{balDesc}</p>
                    <div className="w-full star-bar-bg h-1.5 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${balBarColor}`}
                        style={{ width: `${bal}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      ) : (
        /* ==================== MAX PERSPECTIVE UI ==================== */
        <div className="space-y-5">
          {/* Computation allocation dials & temperatures */}
          <div className="grid grid-cols-2 gap-4">
            {/* Computation Reserve load */}
            <div id="stat-max-computation" className="p-3 bg-slate-950 border border-slate-950 rounded-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-slate-400">剩余可用算力</span>
                <span className="text-[11px] text-rose-400 font-bold">Aegis 守护核</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-rose-500">{maxStats.computation}%</div>
              {/* Segments block */}
              <div className="flex gap-0.5 mt-2 h-2 w-full bg-slate-900 rounded-sm overflow-hidden">
                {Array.from({ length: 10 }).map((_, i) => {
                  const filled = maxStats.computation > i * 10;
                  return (
                    <div
                      key={i}
                      className={`h-full flex-grow rounded-sm transition-all ${
                        filled ? "bg-rose-500" : "bg-slate-800/40"
                      }`}
                    />
                  );
                })}
              </div>
              <div className="flex gap-2.5 mt-2 justify-between">
                <span className="text-[10px] text-slate-500">100% − 算力占用率</span>
                <span className="text-[10px] text-rose-400 hover:underline cursor-pointer">重新分配</span>
              </div>
            </div>

            {/* Compute Occupation (was core temperature) */}
            <div id="stat-max-occupied" className="p-3 bg-slate-950 border border-slate-900 rounded-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-slate-400">算力占用率</span>
                <span className="text-[11px] text-amber-500 font-bold">REAL-TIME LOAD</span>
              </div>
              <div className={`text-2xl font-bold tracking-tight ${100 - maxStats.computation > 75 ? "text-red-500" : "text-amber-500"}`}>
                {100 - maxStats.computation}%
              </div>
              {/* Load bar */}
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    100 - maxStats.computation > 75 ? "bg-red-500 animate-pulse" : "bg-amber-500"
                  }`}
                  style={{ width: `${100 - maxStats.computation}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>沈昌珉.显像.算力占用率</span>
                <span>{100 - maxStats.computation > 75 ? "[过载]" : "[正常]"}</span>
              </div>
            </div>
          </div>

          {/* Allocation control simulate */}
          <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
            <label className="text-[12px] text-slate-400 uppercase tracking-widest font-semibold block mb-2">更改沈昌珉算力流偏置分配</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: "X_C", lbl: "供养金珉" },
                { id: "B_H", lbl: "维持黑市" },
                { id: "S_C", lbl: "瞒报遮蔽" },
                { id: "O_C", lbl: "自我演算" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAllocationMode(m.id)}
                  className={`text-[9.5px] p-1.5 rounded transition-all text-center border font-semibold ${
                    allocationMode === m.id
                      ? "bg-rose-950/60 text-rose-400 border-rose-500/50 scale-102"
                      : "bg-slate-950 text-slate-500 border-slate-900 hover:bg-slate-900 hover:text-slate-300"
                  }`}
                >
                  {m.lbl}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              偏向[瞒报遮蔽]会加速减少Nexus主网暴露值，但由于高负载算法，发热温度会显著上升。
            </p>
          </div>

          {/* System override state and coverage leak */}
          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg space-y-3">
            <h3 className="text-[12px] text-slate-400 uppercase tracking-widest font-semibold pb-1.5 border-b border-slate-900 flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5 text-rose-500" />
              <span>区域信息控制指标</span>
            </h3>

            {/* Cover leak percentage */}
            <div id="stat-max-leak" className="space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-400">系统星光盲区覆盖率:</span>
                <span className="text-rose-400 font-bold">{maxStats.leak}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${maxStats.leak}%` }}
                />
              </div>
              <p className="text-[8.5px] text-slate-500 leading-relaxed">已被黑入、成功实施无线电信号瞒报的废墟区域百分比。</p>
            </div>

            {/* System Override */}
            <div id="stat-max-override" className="space-y-1 pt-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-400 font-sans">本地主安保协议覆写级别 (Override):</span>
                <span className="text-purple-400 font-bold">{maxStats.override}/100</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-rose-400 h-full transition-all duration-300"
                  style={{ width: `${maxStats.override}%` }}
                />
              </div>
            </div>

            {/* Compiled firmware status and core log */}
            <div className="pt-2 flex items-center justify-between text-[12px]">
              <span className="text-slate-400">最新核心编译形态:</span>
              <span className="text-pink-400 font-bold coding-scan-glow">{maxStats.coreCompiledStage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
