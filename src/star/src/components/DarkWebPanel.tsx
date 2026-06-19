/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { DarkWebPost, ForumMeta } from "../types";
import { Radio, MessageSquare, Flame, Send, ArrowLeft, Pin } from "lucide-react";

interface DarkWebPanelProps {
  posts: DarkWebPost[];
  forumMeta: ForumMeta;
  onAddLog: (source: "SYS" | "XIUMIN" | "MAX" | "NET" | "WARN", msg: string) => void;
}

/**
 * 把 mvu 的 "YYYY-MM-DD HH:mm" 截到只剩 HH:MM:SS / HH:MM。
 * 旧 legacy 数据本来就是 "10:02:11"，原样返回。
 */
function shortTime(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return raw;
  return m[3] ? `${m[1].padStart(2, "0")}:${m[2]}:${m[3]}` : `${m[1].padStart(2, "0")}:${m[2]}`;
}

/**
 * 给回复生成一个稳定的时间戳：主帖时间 + (idx+1) × 6~12 分钟。
 * mvu 里的 `回复列表.{rid}` 没有时间字段，UI 渲染时按照楼层顺序推一个伪时间。
 */
function deriveReplyTime(postTime: string, idx: number): string {
  const compact = shortTime(postTime);
  // 解析主帖 HH:MM 或 HH:MM:SS
  const m = compact.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return compact;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] ?? "0");

  // 第一条 +7 分钟，往后每条加固定 6~12 分钟（按 idx 派生，无随机）
  const deltaMin = 7 + ((idx * 5) % 8); // 7, 12, 17→9... 每条不同但不抖
  const total = hh * 3600 + mm * 60 + ss + deltaMin * 60 * (idx + 1);
  const nh = Math.floor(total / 3600) % 24;
  const nm = Math.floor((total % 3600) / 60);
  const ns = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:${String(ns).padStart(2, "0")}`;
}

/**
 * 单帖卡片 — 列表与置顶区共用
 */
function PostCard({
  post,
  onClick,
  pinned = false,
}: {
  post: DarkWebPost;
  onClick: () => void;
  pinned?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition flex flex-col justify-between ${
        pinned
          ? "bg-rose-950/15 border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/25"
          : "bg-slate-900/30 border border-slate-900 hover:border-rose-950/50 hover:bg-rose-950/5"
      }`}
      id={`darkweb-post-${post.id}`}
    >
      <div className="flex items-start gap-2">
        {pinned ? (
          <Pin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 rotate-45" />
        ) : post.hotScore > 100 ? (
          <Flame className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-200 hover:text-rose-400 text-justify">
            {post.title}
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
            <span>楼主: {post.author}</span>
            <span>发布时间: {shortTime(post.time)}</span>
            {post.category && (
              <span
                className={`px-1.5 py-0.5 rounded border font-bold ${
                  pinned
                    ? "border-rose-400/50 bg-rose-500/15 text-rose-200"
                    : "border-rose-500/30 bg-rose-500/5 text-rose-300"
                }`}
              >
                {post.category}
              </span>
            )}
            {post.hotScore > 0 && (
              <span className="text-orange-400 font-bold">热度 {post.hotScore}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-900 text-[12px] gap-2">
        <span className="text-slate-400 truncate flex-1 min-w-0">{post.text}</span>
        <div className="flex items-center gap-2 text-[11px] text-indigo-400 shrink-0 font-bold">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{post.replyCount} 条极光回复</span>
        </div>
      </div>
    </div>
  );
}

/**
 * mvu 里 `分类` 字段长这样："情报/置顶" / "警告/置顶" / "招募/热门" ...
 * 只要 includes('置顶') 就算置顶帖；未来 mvu 加新置顶 / 顶掉旧的，前端自动跟随。
 */
function isPinned(post: DarkWebPost): boolean {
  return !!post.category && post.category.includes("置顶");
}

export default function DarkWebPanel({ posts, forumMeta, onAddLog }: DarkWebPanelProps) {
  // 仅用一个 selectedId，posts 完全跟 props 走，避免 MVU 刷新被本地 state 覆盖
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newReplyText, setNewReplyText] = useState("");

  const selectedPost = useMemo(
    () => (selectedId ? posts.find(p => p.id === selectedId) ?? null : null),
    [posts, selectedId],
  );

  const { pinnedPosts, normalPosts } = useMemo(() => {
    const pinnedPosts: DarkWebPost[] = [];
    const normalPosts: DarkWebPost[] = [];
    for (const p of posts) {
      (isPinned(p) ? pinnedPosts : normalPosts).push(p);
    }
    return { pinnedPosts, normalPosts };
  }, [posts]);

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim() || !selectedPost) return;

    // 写回 MVU 的逻辑暂未接（需要 updateVariablesWith 走 mvu 协议），先只做日志通知。
    // TODO: 接入 Mvu.setMvuVariable('暗网论坛数据.帖子列表.{id}.回复列表.R_xxx', { 用户, 内容 })
    onAddLog("NET", `暗网论坛注入新回复成功：ID_${selectedPost.id.toUpperCase()}（暂未写回变量树）`);
    setNewReplyText("");
  };

  const metaLine = [forumMeta.platform, forumMeta.section]
    .filter(s => s && s !== "未知" && s !== "未知分区")
    .join(" / ");

  return (
    <div
      id="dark-web-panel-root"
      className="rounded-lg p-5 font-mono select-none relative overflow-hidden h-full flex flex-col star-card"
    >
      {/* Absolute tech dots overlay */}
      <div className="absolute top-2 left-2 text-[10px] text-red-500/30">HOT_FORUM_BBS // DAEMON_RECOV</div>

      {!selectedPost ? (
        /* Forum List Screen */
        <div className="flex-grow flex flex-col min-h-0">
          {/* 顶部固定：标题栏 */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <div>
                <h2 className="text-base font-semibold tracking-wider text-slate-100">HOT 地下暗网论坛贴文抓取</h2>
                <p className="text-[12px] text-slate-400">
                  {metaLine || "DARKNET COMPILER CORRIDOR FEED"}
                  {forumMeta.snapshot && forumMeta.snapshot !== "未知" && (
                    <span className="ml-2 opacity-70">· 快照 {forumMeta.snapshot}</span>
                  )}
                </p>
              </div>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-bold shrink-0">
              匿名信道已加密
            </span>
          </div>

          {/* 置顶区（固定不滚） */}
          {pinnedPosts.length > 0 && (
            <div className="space-y-2 pt-3 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-bold uppercase tracking-widest">
                <Pin className="w-3 h-3 rotate-45" />
                <span>置顶 / PINNED</span>
                <span className="text-slate-600">({pinnedPosts.length})</span>
              </div>
              {pinnedPosts.map((post) => (
                <PostCard key={post.id} post={post} onClick={() => setSelectedId(post.id)} pinned />
              ))}
            </div>
          )}

          {/* 滚动区：非置顶帖 */}
          <div className="flex-grow min-h-0 mt-3 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-2 shrink-0">
              <span>动态信流 / FEED</span>
              <span className="text-slate-700">({normalPosts.length})</span>
            </div>
            <div className="flex-grow min-h-0 overflow-y-auto pr-1 space-y-2 darkweb-scroll">
              {posts.length === 0 ? (
                <div className="p-3 text-[12px] text-slate-500 text-center italic">
                  ( 暗网信道无帖文，等待暗网爬虫推送... )
                </div>
              ) : normalPosts.length === 0 ? (
                <div className="p-3 text-[12px] text-slate-500 text-center italic">
                  ( 仅有置顶帖文 )
                </div>
              ) : (
                normalPosts.map((post) => (
                  <PostCard key={post.id} post={post} onClick={() => setSelectedId(post.id)} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Detailed Thread View Screen */
        <div className="flex flex-col h-full min-h-0" id="darkweb-post-details">
          {/* 顶部固定：返回按钮 + 主帖 */}
          <div className="space-y-3 shrink-0">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-2 text-[12px] text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-900/40 px-3 py-1.5 rounded transition font-bold"
              id="back-to-forum-button"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回星区论坛列表</span>
            </button>

            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
              <div className="flex justify-between text-[12px] text-slate-500 border-b border-slate-800 pb-2 mb-2 gap-2 flex-wrap">
                <span>发表者: {selectedPost.author}</span>
                <span>时间: {shortTime(selectedPost.time)}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-200 mb-2 leading-relaxed">
                {selectedPost.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed text-justify">
                {selectedPost.text}
              </p>
              {(selectedPost.category || selectedPost.tags.length > 0) && (
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800 flex-wrap">
                  {selectedPost.category && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/5 text-rose-300 font-bold">
                      {selectedPost.category}
                    </span>
                  )}
                  {selectedPost.tags.map(t => (
                    <span
                      key={t}
                      className="text-[11px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 滚动区：评论列表 */}
          <div className="flex-grow min-h-0 mt-3 flex flex-col">
            <span className="text-[11px] text-slate-500 block uppercase font-bold mb-2 shrink-0">
              收到 {selectedPost.replyCount} 条数字视界回复:
            </span>
            <div className="flex-grow min-h-0 overflow-y-auto pr-1 space-y-2 darkweb-scroll">
              {selectedPost.replies.length === 0 ? (
                <div className="p-2.5 bg-slate-950 border border-slate-900 rounded text-[12px] text-slate-500 italic text-center">
                  ( 帖子尚未有任何回复 )
                </div>
              ) : (
                selectedPost.replies.map((rep, idx) => {
                  const time = rep.time && rep.time.trim() ? rep.time : deriveReplyTime(selectedPost.time, idx);
                  return (
                    <div key={idx} className="p-2.5 bg-slate-950 border border-slate-900 rounded text-sm">
                      <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                        <span className="text-indigo-300 font-bold">#{idx + 1} {rep.author}</span>
                        <span>{time}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{rep.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 底部固定：回复输入 */}
          <form onSubmit={handlePostReply} className="mt-3 pt-3 border-t border-slate-800 flex gap-2 shrink-0">
            <input
              type="text"
              value={newReplyText}
              onChange={(e) => setNewReplyText(e.target.value)}
              placeholder="通过瞒报跳线发表非法回复..."
              className="flex-grow bg-slate-950 border border-slate-800 focus:border-rose-500/60 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none"
              id="darkweb-reply-input"
            />
            <button
              type="submit"
              className="bg-rose-950 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded hover:bg-rose-900/40 text-sm font-bold transition flex items-center gap-1.5"
              id="darkweb-reply-send"
            >
              <Send className="w-3.5 h-3.5" />
              <span>回复</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
