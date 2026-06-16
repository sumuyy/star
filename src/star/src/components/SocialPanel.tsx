/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { BondRelation, BondAttitudeBucket, TeammateStatus } from "../types";
import { Heart, Users, MapPin, Shield, ArrowLeft, Compass, Brain, History } from "lucide-react";

interface SocialPanelProps {
  bonds: BondRelation[];
}

/**
 * 社交情报.其他羁绊 字段对应：
 *   性别 / 态度 / 状态 / 位置 / 动向 / 阵营 / 身份 /
 *   当前态度(友好/敌对/中立) / 好感度(0-100) / 特质 / 近期经历
 */

const STATUS_COLORS: Record<TeammateStatus, string> = {
  在场: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  离场: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  失联: "text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse",
  未知: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

const ATTITUDE_COLORS: Record<BondAttitudeBucket, string> = {
  友好: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  中立: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  敌对: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

const AFFINITY_BAR_COLOR = (v: number) => {
  if (v >= 70) return "bg-rose-400";
  if (v >= 40) return "bg-pink-400";
  if (v >= 15) return "bg-sky-400";
  return "bg-slate-500";
};

function BondCard({
  bond,
  onClick,
}: {
  bond: BondRelation;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="p-3 star-card-soft border border-slate-900 rounded-lg cursor-pointer hover:border-rose-500/40 hover:bg-rose-950/10 transition flex flex-col gap-2"
      id={`bond-${bond.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-base star-text-primary truncate">{bond.name}</span>
          {bond.gender !== "未知" && (
            <span className="text-[11px] star-text-muted">[{bond.gender}]</span>
          )}
        </div>
        <span
          className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[bond.status]}`}
        >
          {bond.status}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[12px] flex-wrap">
        <span
          className={`px-1.5 py-0.5 rounded border font-bold ${ATTITUDE_COLORS[bond.attitudeBucket]}`}
        >
          {bond.attitudeBucket}
        </span>
        {bond.attitude && bond.attitude !== "陌生" && (
          <span className="star-text-muted truncate flex-1 min-w-0">{bond.attitude}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
        {bond.identity !== "未知" && (
          <div className="flex items-center gap-1 min-w-0">
            <Shield className="w-3 h-3 star-text-muted shrink-0" />
            <span className="star-text-muted truncate">{bond.identity}</span>
          </div>
        )}
        {bond.faction !== "未知" && (
          <div className="flex items-center gap-1 min-w-0">
            <Users className="w-3 h-3 star-text-muted shrink-0" />
            <span className="star-text-muted truncate">{bond.faction}</span>
          </div>
        )}
        {bond.location !== "未知" && (
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 star-text-muted shrink-0" />
            <span className="star-text-muted truncate">{bond.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1 min-w-0">
          <Heart className="w-3 h-3 text-pink-400 shrink-0" />
          <span className="text-pink-400 font-bold">{bond.affinity}%</span>
        </div>
      </div>

      {/* 好感度细条 */}
      <div className="w-full bg-slate-900/60 h-1 rounded overflow-hidden">
        <div
          className={`h-full ${AFFINITY_BAR_COLOR(bond.affinity)} transition-all duration-300`}
          style={{ width: `${bond.affinity}%` }}
        />
      </div>
    </div>
  );
}

export default function SocialPanel({ bonds }: SocialPanelProps) {
  // 仅用一个 selectedId,bonds 完全跟 props 走,避免 MVU 刷新被本地 state 覆盖
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedBond = useMemo(
    () => (selectedId ? bonds.find(b => b.id === selectedId) ?? null : null),
    [bonds, selectedId],
  );

  return (
    <div
      id="social-panel-root"
      className="rounded-lg p-5 font-mono select-none relative overflow-hidden h-[640px] flex flex-col star-card"
    >
      <div className="absolute top-2 left-2 text-[10px] text-rose-500/30">
        SOCIAL_BOND_MATRIX // RELATIONSHIP_FEED
      </div>

      {!selectedBond ? (
        /* List view */
        <div className="flex-grow flex flex-col min-h-0">
          {/* 顶部固定:标题栏 */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 animate-pulse" />
              <div>
                <h2 className="text-base font-semibold tracking-wider text-slate-100">
                  外圈社交 / 联络人档案
                </h2>
                <p className="text-[12px] text-slate-400">
                  OUTER CIRCLE · 除 EXO 队友与沈昌珉外的联络人
                </p>
              </div>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 font-bold shrink-0">
              {bonds.length} 名联络人
            </span>
          </div>

          {/* 滚动区:羁绊列表 */}
          <div className="flex-grow min-h-0 mt-3 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-2 shrink-0">
              <span>联络人清单 / CONTACT ROSTER</span>
              <span className="text-slate-700">({bonds.length})</span>
            </div>
            <div className="flex-grow min-h-0 overflow-y-auto pr-1 space-y-2 darkweb-scroll">
              {bonds.length === 0 ? (
                <div className="p-3 text-[12px] text-slate-500 text-center italic">
                  ( 暂无外圈联络人, 等待社交频谱共鸣... )
                </div>
              ) : (
                bonds.map(bond => (
                  <BondCard key={bond.id} bond={bond} onClick={() => setSelectedId(bond.id)} />
                ))
              )}
            </div>
          </div>

          {/* 底部固定:警告 */}
          <p className="text-[11px] text-slate-500 text-justify border-t border-slate-900 pt-3 leading-relaxed mt-2 uppercase shrink-0">
            ⚠️ 此清单仅记录 EXO 队友与沈昌珉以外的联络人。某联络人一旦进入 [失联] 状态, 多半意味着其算力锚点已被 Nexus 清除。
          </p>
        </div>
      ) : (
        /* Detail view */
        <div className="flex flex-col h-full min-h-0" id="bond-details">
          {/* 顶部固定:返回 + 主信息 */}
          <div className="space-y-3 shrink-0">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-2 text-[11px] text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-900/40 px-3 py-1.5 rounded transition font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回联络人列表</span>
            </button>

            <div className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-base font-bold text-slate-100 truncate">
                    {selectedBond.name}
                  </h3>
                  {selectedBond.gender !== "未知" && (
                    <span className="text-[11px] text-slate-500">[{selectedBond.gender}]</span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[selectedBond.status]}`}
                >
                  {selectedBond.status}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded border font-bold ${ATTITUDE_COLORS[selectedBond.attitudeBucket]}`}
                >
                  当前态度 · {selectedBond.attitudeBucket}
                </span>
                {selectedBond.attitude && selectedBond.attitude !== "陌生" && (
                  <span className="text-[12px] text-slate-400 truncate flex-1 min-w-0">
                    {selectedBond.attitude}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className="text-[11px] text-slate-500 shrink-0">好感度</span>
                <div className="flex-1 bg-slate-900/60 h-1.5 rounded overflow-hidden">
                  <div
                    className={`h-full ${AFFINITY_BAR_COLOR(selectedBond.affinity)} transition-all duration-300`}
                    style={{ width: `${selectedBond.affinity}%` }}
                  />
                </div>
                <span className="text-pink-400 font-bold text-[12px] shrink-0">
                  {selectedBond.affinity}%
                </span>
              </div>
            </div>
          </div>

          {/* 滚动区:详情 */}
          <div className="flex-grow min-h-0 mt-3 overflow-y-auto pr-1 darkweb-scroll space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-950/60 border border-slate-900 rounded">
                <div className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> 身份
                </div>
                <div className="text-sm text-slate-200 font-bold leading-relaxed text-justify">
                  {selectedBond.identity}
                </div>
              </div>
              <div className="p-2 bg-slate-950/60 border border-slate-900 rounded">
                <div className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> 阵营
                </div>
                <div className="text-sm text-slate-200 font-bold leading-relaxed text-justify">
                  {selectedBond.faction}
                </div>
              </div>
              <div className="p-2 bg-slate-950/60 border border-slate-900 rounded">
                <div className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> 位置
                </div>
                <div className="text-sm text-slate-200 font-bold leading-relaxed text-justify">
                  {selectedBond.location}
                </div>
              </div>
              <div className="p-2 bg-slate-950/60 border border-slate-900 rounded">
                <div className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Compass className="w-3 h-3" /> 动向
                </div>
                <div className="text-sm text-slate-200 font-bold leading-relaxed text-justify">
                  {selectedBond.move}
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 border border-slate-900 rounded">
              <div className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Brain className="w-3 h-3" /> 特质
              </div>
              <div className="text-sm text-slate-300 leading-relaxed text-justify">
                {selectedBond.trait}
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 border border-slate-900 rounded">
              <div className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1">
                <History className="w-3 h-3" /> 近期经历
              </div>
              <div className="text-sm text-slate-300 leading-relaxed text-justify">
                {selectedBond.recent}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
