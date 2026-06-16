/**
 * MVU 统一访问层
 *
 * 本模块封装所有与酒馆 MVU 系统交互的基础操作：
 * - 类型定义
 * - 初始化等待
 * - 数据读取（多层 fallback）
 * - 类型安全的取值工具
 *
 * 所有需要读写 MVU 数据的模块都应该通过本层访问，
 * 而不是直接 declare 全局函数。
 */

import { GameState } from '../types';
import { INITIAL_GAME_STATE } from '../data';

// ---------------------------------------------------------------------------
// 全局 API 声明
// ---------------------------------------------------------------------------

declare function getVariables(option: { type: 'message'; message_id: number | 'latest' }): Record<string, any>;
declare function waitGlobalInitialized<T>(global: 'Mvu' | string): Promise<T>;
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'user' | 'assistant' | 'system' | 'all'; hide_state?: 'all' | 'hidden' | 'unhidden' },
): Array<{ message_id: number; role: string; data?: Record<string, any> }>;

declare const Mvu: {
  getMvuData: (options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' }) => MvuData;
  parseMessage: (message: string, old_data: Record<string, any>) => Promise<Record<string, any>>;
  replaceMvuData: (
    mvu_data: Record<string, any>,
    options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' },
  ) => Promise<void>;
};

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface MvuData {
  stat_data: Record<string, any>;
  display_data?: Record<string, any>;
  delta_data?: Record<string, any>;
}

export type MessageId = number | 'latest';

// ---------------------------------------------------------------------------
// 初始化状态管理
// ---------------------------------------------------------------------------

let mvuInitialized = false;
let mvuInitPromise: Promise<void> | null = null;

/**
 * 确保 MVU 已初始化完成
 * 并发安全：同时多次调用只会执行一次初始化
 */
export async function ensureMvuInitialized(): Promise<void> {
  if (mvuInitialized) return;
  if (mvuInitPromise) return mvuInitPromise;

  mvuInitPromise = (async () => {
    try {
      await waitGlobalInitialized('Mvu');
      mvuInitialized = true;
      console.log('✅ [star mvuAccess] MVU 初始化完成');
    } catch (error) {
      console.warn('⚠️ [star mvuAccess] 等待 MVU 初始化失败:', error);
      mvuInitialized = true;
    }
  })();

  return mvuInitPromise;
}

// ---------------------------------------------------------------------------
// 数据检查工具
// ---------------------------------------------------------------------------

/**
 * 检查 stat_data 是否有实际内容（非空对象）
 */
export function hasStatDataContent(stat_data: any): boolean {
  return stat_data && typeof stat_data === 'object' && Object.keys(stat_data).length > 0;
}

/**
 * 比较前后两份 stat_data 是否有任何变动
 */
export function detectGameStateUpdated(before: any, after: any): boolean {
  const beforeStat = before?.stat_data;
  const afterStat = after?.stat_data;
  if (!beforeStat || !afterStat) return false;
  try {
    return JSON.stringify(beforeStat) !== JSON.stringify(afterStat);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 类型安全的取值工具
// ---------------------------------------------------------------------------

type Value = string | number | boolean | Record<string, any> | Array<any> | null | undefined;

/**
 * 从嵌套对象中按路径取值，支持 MVU 格式 [值, "描述"]
 */
export function pick<T extends Value>(obj: any, path: string, fallback: T): T {
  if (!obj) return fallback;
  const parts = path.split('.');
  let cur: any = obj;

  for (const p of parts) {
    if (cur == null) return fallback;
    if (Array.isArray(cur) && cur.length > 0) {
      cur = cur[0];
    }
    cur = cur[p];
  }

  if (Array.isArray(cur) && cur.length > 0) {
    return (cur[0] as T) ?? fallback;
  }

  return (cur as T) ?? fallback;
}

/**
 * 安全读取数值（自动解析字符串，失败返回 fallback）
 */
export function readNumber(stat: any, path: string, fallback: number): number {
  const v = pick<any>(stat, path, undefined as any);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

/**
 * 安全读取字符串
 */
export function readString(stat: any, path: string, fallback: string): string {
  const v = pick<any>(stat, path, undefined as any);
  if (typeof v === 'string' && v.length > 0) return v;
  return fallback;
}

/**
 * 数值范围截断
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------------
// MVU 数据读取（带多层 fallback）
// ---------------------------------------------------------------------------

/**
 * 从单个楼层读取 MVU 数据
 */
async function readMvuFromFloor(messageId: MessageId): Promise<MvuData | null> {
  // 1. 优先用 Mvu.getMvuData
  try {
    const data = Mvu.getMvuData({ type: 'message', message_id: messageId });
    if (data && hasStatDataContent(data.stat_data)) {
      return data;
    }
  } catch (err) {
    console.warn(`⚠️ [star mvuAccess] getMvuData(${messageId}) 失败，尝试 getVariables`);
  }

  // 2. fallback 到 getVariables
  try {
    const vars = getVariables({ type: 'message', message_id: messageId });
    if (vars && hasStatDataContent(vars.stat_data)) {
      return {
        stat_data: vars.stat_data || {},
        display_data: vars.display_data || {},
        delta_data: vars.delta_data || {},
      };
    }
  } catch (err) {
    console.warn(`⚠️ [star mvuAccess] getVariables(${messageId}) 失败`);
  }

  return null;
}

/**
 * 获取最新 assistant 消息的 messageId
 */
export function getLatestAssistantMessageId(): number | null {
  try {
    const assistantMessages = getChatMessages(-1, { role: 'assistant' });
    if (assistantMessages && assistantMessages.length > 0) {
      return assistantMessages[assistantMessages.length - 1].message_id;
    }
  } catch (error) {
    console.warn('⚠️ [star mvuAccess] 获取最新 assistant 消息失败:', error);
  }
  return null;
}

/**
 * 带多层 fallback 的 MVU 数据读取
 *
 * 读取优先级：
 * 1. 最新 assistant 消息
 * 2. latest 楼层
 * 3. 0 层兜底
 * 4. 返回空对象
 */
export async function getMvuDataWithFallback(): Promise<MvuData> {
  await ensureMvuInitialized();

  const candidates: MessageId[] = [];

  const latestAssistantId = getLatestAssistantMessageId();
  if (latestAssistantId !== null) {
    candidates.push(latestAssistantId);
  }
  candidates.push('latest', 0);

  for (const messageId of candidates) {
    const data = await readMvuFromFloor(messageId);
    if (data) {
      console.log(`✅ [star mvuAccess] 从 ${messageId} 层读取 MVU 数据`);
      return data;
    }
  }

  console.warn('⚠️ [star mvuAccess] 无法获取任何楼层数据，返回空对象');
  return { stat_data: {}, display_data: {}, delta_data: {} };
}

/**
 * 获取当前可写入的楼层 ID
 * 优先最新 assistant 消息，其次最新楼层，最后 0 层
 */
export function getWritableMessageId(): MessageId {
  const latestAssistantId = getLatestAssistantMessageId();
  if (latestAssistantId !== null) return latestAssistantId;

  try {
    // getLastMessageId 没有 declare，直接用 'latest' 兜底
    return 'latest';
  } catch (error) {
    console.warn('⚠️ [star mvuAccess] 获取最新楼层 id 失败，回退 latest:', error);
  }

  return 'latest';
}

// ---------------------------------------------------------------------------
// MVU 数据写回
// ---------------------------------------------------------------------------

/**
 * 把 MVU 数据写回到指定楼层
 */
export async function writeMvuToFloor(data: MvuData, messageId: MessageId): Promise<void> {
  if (!hasStatDataContent(data.stat_data)) {
    console.warn('⚠️ [star mvuAccess] data.stat_data 为空，跳过写回');
    return;
  }

  try {
    await Mvu.replaceMvuData(data, { type: 'message', message_id: messageId });
  } catch (error) {
    console.warn(`⚠️ [star mvuAccess] replaceMvuData 写入 ${messageId} 层失败:`, error);
    throw error;
  }
}

/**
 * 解析消息中的 MVU 命令并返回更新后的数据
 */
export async function parseMvuMessage(message: string, baseData: MvuData): Promise<MvuData> {
  try {
    const parsedData = await Mvu.parseMessage(message, baseData);
    if (parsedData && hasStatDataContent(parsedData.stat_data)) {
      if (!detectGameStateUpdated(baseData, parsedData)) {
        console.warn(
          '⚠️ [star mvuAccess] Mvu.parseMessage 未改写 stat_data，可能命令格式不合规',
          { sample: message.slice(0, 200) },
        );
      }
      return parsedData;
    }
    console.warn('⚠️ [star mvuAccess] Mvu.parseMessage 返回空数据，沿用基础 MVU 数据');
  } catch (error) {
    console.warn('⚠️ [star mvuAccess] 解析 MVU 命令抛错，沿用基础 MVU 数据:', error);
  }

  return baseData;
}
