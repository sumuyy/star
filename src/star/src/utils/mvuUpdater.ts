/**
 * MVU 变量更新工具
 * 负责 MVU 数据的解析、写回、消息重构
 *
 * 基础 MVU 操作（读取/初始化/类型工具）已下沉到 mvuAccess.ts
 * 本文件专注于：消息重构、状态更新检测、更新流程编排
 */

import { GameState } from '../types';
import { parseMaintext, parseOptions, parseSum, removeThinkingTags } from './messageParser';
import { extractUpdateVariable, normalizeOptionBlock, buildFallbackUpdateVariable } from './promptBuilder';
import {
  MvuData,
  hasStatDataContent,
  detectGameStateUpdated,
  getMvuDataWithFallback,
  writeMvuToFloor as writeMvuToFloorImpl,
  parseMvuMessage,
} from './mvuAccess';

export type { MvuData };

export { hasStatDataContent, detectGameStateUpdated };

/**
 * 获取基础 MVU 数据
 * 优先读取最新 assistant 消息，然后 latest，最后 0 层兜底
 */
export async function getBaseMvuData(): Promise<MvuData> {
  return getMvuDataWithFallback();
}

/**
 * 重构最终消息：清洗 think 标签 → 提取各标签 → 补全缺失的 UpdateVariable
 */
export function rebuildFinalMessage(rawMessage: string, gameState: GameState): {
  finalMessage: string;
  usedFallbackUpdate: boolean;
} {
  const cleaned = removeThinkingTags(rawMessage);
  // 严格要求 LLM 输出正文标签，缺失就丢弃整段，而不是把含 <option>/<UpdateVariable> 的脏文本塞进 <maintext>
  const maintext = parseMaintext(cleaned);
  if (!maintext) {
    return { finalMessage: '', usedFallbackUpdate: false };
  }

  const sum = parseSum(cleaned);
  const option = normalizeOptionBlock(cleaned, gameState.currentChoices);

  const llmUpdate = extractUpdateVariable(cleaned);
  let updateVariable = llmUpdate;
  let usedFallbackUpdate = false;
  if (!updateVariable) {
    updateVariable = buildFallbackUpdateVariable(gameState, parseOptions(`<option>${option}</option>`).map(item => item.text));
    usedFallbackUpdate = true;
  }

  let finalMessage = `<maintext>\n${maintext}\n</maintext>`;
  if (sum) finalMessage += `\n\n<sum>${sum}</sum>`;
  finalMessage += `\n\n<option>\n${option}\n</option>`;
  finalMessage += `\n\n<UpdateVariable>\n${updateVariable}\n</UpdateVariable>`;
  return { finalMessage, usedFallbackUpdate };
}

/**
 * 解析消息并应用 MVU 更新
 */
export async function parseAndApplyMvuUpdate(
  finalMessage: string,
  baseData: MvuData,
): Promise<{ finalData: MvuData; usedFallbackUpdate: boolean }> {
  let finalData = baseData;
  let usedFallbackUpdate = false;

  const parsedData = await parseMvuMessage(finalMessage, baseData);
  if (parsedData && hasStatDataContent(parsedData.stat_data)) {
    if (!detectGameStateUpdated(baseData, parsedData)) {
      // parseMessage 没有产生实际更新——LLM 命令格式可能不合法，或 fallback 也被框架拒绝
      console.warn(
        '⚠️ [star mvuUpdater] Mvu.parseMessage 未改写 stat_data，可能命令格式不合规',
        { sample: finalMessage.match(/<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/)?.[1]?.slice(0, 200) },
      );
      usedFallbackUpdate = true;
    }
    finalData = parsedData;
  } else {
    console.warn('⚠️ [star mvuUpdater] Mvu.parseMessage 返回空数据，沿用基础 MVU 数据');
  }

  return { finalData, usedFallbackUpdate };
}

/**
 * 把 MVU 数据写回到指定楼层
 */
export async function writeMvuToFloor(
  data: MvuData,
  messageId: number | 'latest',
): Promise<void> {
  return writeMvuToFloorImpl(data, messageId);
}
