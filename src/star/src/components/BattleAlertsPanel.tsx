/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 战局态势 — 敌对势力 / 全局势能监控（Uknow 警觉 + Nexus 暴露）
 * 双视角共用：金珉锡看到的是"已被锁定到什么程度"；沈昌珉看到的是"我能压住多少"
 */

import { GlobalAlerts } from "../types";
import { Radar, EyeOff } from "lucide-react";

interface BattleAlertsPanelProps {
  alerts: GlobalAlerts;
}

export default function BattleAlertsPanel({ alerts }: BattleAlertsPanelProps) {
  return (
    <div
      id="battle-alerts-panel"
      className="rounded-lg p-5 font-mono select-none relative overflow-hidden h-full flex flex-col star-card"
    >
      <div className="flex items-center justify-between border-b star-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 star-text-battle animate-pulse" />
          <div>
            <h2 className="text-base font-semibold tracking-wider star-text-primary">战局态势</h2>
            <p className="text-[12px] star-text-muted">ADVERSARY SWARM WATCH · GLOBAL EXPOSURE</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Uknow Alert */}
        <div id="alert-uknow" className="p-3 bg-red-950/20 border border-red-950/40 rounded-lg relative">
          <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <div className="flex justify-between items-center text-[12px] text-rose-300 font-bold mb-1">
            <span>Uknow 警觉巡航度:</span>
            <span className="text-rose-400">{alerts.uknowAlert}%</span>
          </div>
          {/* Visual Bar */}
          <div className="w-full bg-slate-900 h-2 rounded overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-red-600 to-rose-400 h-full rounded transition-all duration-300"
              style={{ width: `${alerts.uknowAlert}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">联邦战术极速单元。高精度跃迁锁定开启时，正在推算金珉锡的极光坐标偏置。</p>
        </div>

        {/* Nexus Exposure */}
        <div id="alert-nexus" className="p-3 bg-slate-950 border border-slate-900 rounded-lg">
          <div className="flex justify-between items-center text-[12px] text-slate-400 font-bold mb-1">
            <span>Nexus 全局暴露值:</span>
            <span className="text-bold text-amber-500">{alerts.nexusExposure}%</span>
          </div>
          {/* Visual Bar */}
          <div className="w-full bg-slate-900 h-2 rounded overflow-hidden flex">
            <div
              className="bg-amber-500 h-full rounded transition-all duration-300"
              style={{ width: `${alerts.nexusExposure}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">NCT 影子部门主网。雷达抓取与算力端口的暴露百分比，达 90% 将触发系统强制重洗。</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t star-border-dashed flex items-center gap-1.5 text-[11px] star-text-muted">
        <EyeOff className="w-3.5 h-3.5" style={{ color: "var(--theme-primary)" }} />
        <span>沈昌珉可通过覆写 / 抹除痕迹降低这两条曲线。</span>
      </div>
    </div>
  );
}
