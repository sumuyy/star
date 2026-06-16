/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { OpeningFormData, PerspectiveType } from "../types";
import { X } from "lucide-react";

interface OpeningFormProps {
  onSubmit: (formData: OpeningFormData) => void;
  /** 当用户已经有数据但又主动打开了开局表单时，提供关闭按钮回到 GameScreen */
  onCancel?: () => void;
}

export default function OpeningForm({ onSubmit, onCancel }: OpeningFormProps) {
  const [perspective, setPerspective] = useState<PerspectiveType>("xiumin");
  const [difficulty, setDifficulty] = useState<OpeningFormData["difficulty"]>("normal");
  const [location, setLocation] = useState<string>("N-H2 黑市拍卖场荒星");
  const [threat, setThreat] = useState<number>(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      startingPerspective: perspective,
      difficulty,
      openingLocation: location,
      initialThreatLevel: threat,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-mono star-shell relative">
      <div className="absolute inset-0 scanline-overlay opacity-[0.04] pointer-events-none" />

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 star-btn rounded-full p-2"
          title="返回 GameScreen"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="w-full max-w-xl rounded-lg p-6 md:p-8 shadow-2xl star-card relative z-10">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-black tracking-wider uppercase mb-2 star-text-primary">
            XIUMIN_TERM // 战术接入终端 v1
          </h1>
          <p className="text-[12px] star-text-muted leading-relaxed">
            请选择初始锚点参数以建立双视角战术链接。提交后会写入聊天楼层变量并生成 1 楼介绍。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 初始视角 */}
          <div className="space-y-2">
            <label className="text-[12px] star-text-muted uppercase tracking-widest font-bold block">
              初始意识锚点
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPerspective("xiumin")}
                className={`p-3 rounded text-sm font-bold transition ${
                  perspective === "xiumin" ? "star-btn-active" : "star-btn"
                }`}
              >
                金珉锡（Xiumin）
                <span className="block text-[11px] font-normal mt-1 opacity-80">
                  生存 / 异能 / 绝对零度
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPerspective("max")}
                className={`p-3 rounded text-sm font-bold transition ${
                  perspective === "max" ? "star-btn-active" : "star-btn"
                }`}
              >
                沈昌珉（Max）
                <span className="block text-[11px] font-normal mt-1 opacity-80">
                  AI / 黑网 / 系统覆写
                </span>
              </button>
            </div>
          </div>

          {/* 难度 */}
          <div className="space-y-2">
            <label className="text-[12px] star-text-muted uppercase tracking-widest font-bold block">
              追捕威胁等级
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as OpeningFormData["difficulty"])}
              className="star-input w-full rounded px-3 py-2 text-sm"
            >
              <option value="normal">普通级 - Nexus 尚未察觉异常</option>
              <option value="hard">高压级 - Uknow 巡逻节点已展开</option>
              <option value="nightmare">噩梦级 - 跨坐标跃迁追杀已启动</option>
            </select>
          </div>

          {/* 起始地点 */}
          <div className="space-y-2">
            <label className="text-[12px] star-text-muted uppercase tracking-widest font-bold block">
              初始落点星区
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="star-input w-full rounded px-3 py-2 text-sm"
            >
              <option value="N-H2 黑市拍卖场荒星">N-H2 黑市拍卖场荒星 [信号真空区]</option>
              <option value="KTC 临时藏身据点">KTC 临时藏身据点 [边缘星球]</option>
              <option value="帕提拉·赫利俄斯">帕提拉·赫利俄斯 [G星系]</option>
            </select>
          </div>

          {/* 初始威胁值 */}
          <div className="space-y-2">
            <label className="text-[12px] star-text-muted uppercase tracking-widest font-bold block">
              Uknow 初始警觉度: {threat}%
            </label>
            <input
              type="range"
              min={10}
              max={80}
              value={threat}
              onChange={(e) => setThreat(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--theme-primary)" }}
            />
            <div className="flex justify-between text-[11px] star-text-muted">
              <span>10% 隐蔽</span>
              <span>80% 全面通缉</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full star-btn-active py-3 rounded text-sm font-black tracking-widest uppercase transition"
          >
            初始化战术链接
          </button>
        </form>
      </div>
    </div>
  );
}
