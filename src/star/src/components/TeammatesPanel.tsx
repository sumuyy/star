/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { TeammateInfo, TeammateStatus } from "../types";
import { Users, Info } from "lucide-react";

interface TeammatesPanelProps {
  teammates: TeammateInfo[];
}

const STATUS_COLORS: Record<TeammateStatus, string> = {
  在场: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  离场: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  失联: "text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse",
  未知: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

export default function TeammatesPanel({ teammates }: TeammatesPanelProps) {
  const [selectedTeammate, setSelectedTeammate] = useState<TeammateInfo | null>(null);
  const [showDeparted, setShowDeparted] = useState(false);

  // 分组成在场和离场
  const presentTeammates = teammates.filter(t => t.status === "在场");
  const departedTeammates = teammates.filter(t => t.status !== "在场");

  return (
    <div id="teammates-panel" className="rounded-lg p-5 font-mono select-none relative overflow-hidden h-full flex flex-col justify-between">
      {/* Background Matrix Pattern */}
      <div className="absolute inset-0 bg-dotted-pattern opacity-5 pointer-events-none" />

      <div className="space-y-4">
        {/* Title and Top */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span className="text-[12px] text-slate-400 uppercase tracking-widest font-semibold">异能同天体队友状态 (在场 / 反噬)</span>
          </div>
        </div>

        {/* Teammates List */}
        <div className="space-y-2.5">

          {/* 在场队友 - 完整卡片 */}
          <div className="space-y-2">
            {presentTeammates.length === 0 ? (
              <div className="text-[12px] text-slate-500 px-2 py-3 text-center">[ 频率未共鸣 / 信号被切断 ]</div>
            ) : (
              presentTeammates.map((teammate) => (
                <div
                  key={teammate.id}
                  onClick={() => setSelectedTeammate(teammate)}
                  className="p-2.5 star-card-soft rounded-lg cursor-pointer hover:opacity-80 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-[13px] star-text-primary truncate">{teammate.name}</span>
                      {teammate.status === "离场" && teammate.location !== "未知" ? (
                        <span className="text-[11px] star-text-muted truncate">[{teammate.location}]</span>
                      ) : null}
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[teammate.status]}`}>
                      {teammate.status}
                    </span>
                  </div>

                  <div className="text-[12px] star-text-muted mb-1.5 leading-tight">
                    觉醒节点：<span style={{ color: "var(--text-main)" }}>{teammate.awakening}</span>
                  </div>

                  {/* 解放度（枚举） + 反噬度（数值） */}
                  <div className="space-y-1 mt-1">
                    <div className="text-[12px] star-text-muted leading-tight">
                      能力解放度: <span className="font-bold star-text-primary">{teammate.liberation}</span>
                    </div>
                    <div className="text-[12px] star-text-muted leading-tight">
                      反噬崩溃度: <span className={`font-bold ${teammate.backlash < 0 ? "star-text-muted" : teammate.backlash > 50 ? "text-red-400" : "text-amber-400"}`}>
                        {teammate.backlash < 0 ? "未读取" : `${teammate.backlash}%`}
                      </span>
                    </div>
                    <div className="w-full star-bar-bg h-1 rounded overflow-hidden mt-1">
                      <div
                        className={`h-full ${teammate.backlash > 50 ? "bg-red-500" : "bg-amber-400"}`}
                        style={{ width: `${Math.max(0, teammate.backlash)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 离场队友 - 可折叠精简条 */}
          {departedTeammates.length > 0 && (
            <div className="mt-4">
              <div
                onClick={() => setShowDeparted(!showDeparted)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 py-2 border-b border-slate-800"
              >
                <span className="text-slate-400 text-xs">{showDeparted ? "▼" : "▶"}</span>
                <span className="text-[12px] text-slate-400 font-semibold">离场 / 失联 ({departedTeammates.length}人)</span>
              </div>

              {showDeparted && (
                <div className="space-y-1.5 mt-2">
                  {departedTeammates.map((teammate) => (
                    <div
                      key={teammate.id}
                      onClick={() => setSelectedTeammate(teammate)}
                      className="p-2 star-card-soft rounded-lg cursor-pointer hover:opacity-80 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-[13px] star-text-primary truncate">{teammate.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[teammate.status]}`}>
                          {teammate.status}
                        </span>
                      </div>
                      {teammate.location !== "未知" && (
                        <div className="text-[11px] star-text-muted leading-tight">📍 {teammate.location}</div>
                      )}
                      {teammate.currentMove !== "未知" && (
                        <div className="text-[11px] star-text-muted leading-tight mt-0.5">📋 {teammate.currentMove}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Teammate Bio modal */}
      {selectedTeammate && (
        <div className="absolute inset-0 star-modal-bg border border-indigo-500/20 rounded-lg p-5 flex flex-col justify-between font-mono animate-fadeIn z-30">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div>
                <span className="text-[11px] text-indigo-400 uppercase">天体同盟深度履历档案</span>
                <h4 className="text-base font-bold text-slate-200">{selectedTeammate.name}</h4>
              </div>
              <button
                onClick={() => setSelectedTeammate(null)}
                className="text-[12px] text-rose-400 border border-rose-500/30 hover:bg-rose-950/30 px-2 py-0.5 rounded transition"
              >
                关闭档案
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <p className="text-slate-400 leading-relaxed text-justify">
                当前状态 <span className="text-sky-300 font-bold">{selectedTeammate.status}</span>
                {selectedTeammate.location !== "未知" ? <> @ <span className="text-slate-200">{selectedTeammate.location}</span></> : null}
                。动向：<span className="text-slate-300">{selectedTeammate.currentMove}</span>
              </p>

              <div className="p-2 star-modal-card border border-slate-800 rounded space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">觉醒节点:</span><span className="text-slate-200">{selectedTeammate.awakening}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">能力解放度:</span><span className="text-slate-200">{selectedTeammate.liberation}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">FC 状态:</span><span className="text-slate-200">{selectedTeammate.fcState}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">伪装身份:</span><span className="text-slate-200 truncate ml-2 max-w-[180px]">{selectedTeammate.disguise}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">机甲动向:</span><span className="text-slate-200 truncate ml-2 max-w-[180px]">{selectedTeammate.mechMove}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">肉体反噬度:</span>
                  <span className={`font-bold ${selectedTeammate.backlash < 0 ? "text-slate-500" : selectedTeammate.backlash > 50 ? "text-rose-400" : "text-amber-400"}`}>
                    {selectedTeammate.backlash < 0 ? "未读取" : `${selectedTeammate.backlash}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>双视角干预指令：沈昌珉可通过算力过载提供反噬阻断！</span>
          </div>
        </div>
      )}
    </div>
  );
}
