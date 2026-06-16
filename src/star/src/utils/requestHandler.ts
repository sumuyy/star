/**
 * 统一请求处理器
 * 创建玩家楼层、请求酒馆生成、解析 MVU 更新并创建 assistant 楼层
 */

import { GameState } from '../types';
import { parseMaintext, parseOptions, parseSum, removeThinkingTags } from './messageParser';
import { checkAndUpdateChronicle } from './chronicleUpdater';

declare function getLastMessageId(): number;
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user'; hide_state?: 'all' | 'hidden' | 'unhidden' },
): Array<{ message: string; message_id: number; role: string; data?: Record<string, any> }>;
declare function createChatMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; message: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;
declare function deleteChatMessages(message_ids: number[], options?: { refresh?: 'none' | 'affected' | 'all' }): Promise<void>;
declare function generate(config: {
  user_input?: string;
  should_stream?: boolean;
  should_silence?: boolean;
  generation_id?: string;
  max_chat_history?: 'all' | number;
  injects?: Array<{ role: 'system' | 'assistant' | 'user'; content: string; position?: string; depth?: number; scan?: boolean }>;
}): Promise<string | Record<string, any>>;
declare function waitGlobalInitialized<T>(global: 'Mvu' | string): Promise<T>;
declare function eventOn(event: string, callback: (...args: any[]) => void): { stop: () => void } | void;
declare const iframe_events: {
  STREAM_TOKEN_RECEIVED_FULLY: string;
};
declare const Mvu: {
  getMvuData: (options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' }) => {
    stat_data: Record<string, any>;
    display_data?: Record<string, any>;
    delta_data?: Record<string, any>;
  };
  parseMessage: (message: string, old_data: Record<string, any>) => Promise<Record<string, any>>;
  replaceMvuData: (
    mvu_data: Record<string, any>,
    options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' },
  ) => Promise<void>;
};

export type StarRequestType = 'option' | 'custom';

export interface StarRequestData {
  type: StarRequestType;
  content: string;
  gameState: GameState;
}

export interface StarRequestCallbacks {
  onDisableOptions?: () => void;
  onShowGenerating?: () => void;
  onHideGenerating?: () => void;
  onEnableOptions?: () => void;
  onError?: (error: string) => void;
  onRefreshStory?: () => void;
  onStreamingUpdate?: (text: string) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasStatDataContent(stat_data: any): boolean {
  return stat_data && typeof stat_data === 'object' && Object.keys(stat_data).length > 0;
}

/**
 * 比较 parseMessage 前后 stat_data 是否有任何变动
 * 用于在 LLM 输出的 _.set 命令格式不正确时给出明确告警
 */
function detectGameStateUpdated(before: any, after: any): boolean {
  const beforeStat = before?.stat_data;
  const afterStat = after?.stat_data;
  if (!beforeStat || !afterStat) return false;
  try {
    return JSON.stringify(beforeStat) !== JSON.stringify(afterStat);
  } catch {
    return false;
  }
}

function extractTag(message: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches = [...message.matchAll(regex)];
  if (matches.length === 0) return '';
  return (matches[matches.length - 1][1] || '').trim();
}

function extractUpdateVariable(message: string): string {
  return extractTag(message, 'UpdateVariable');
}

function normalizeOptionBlock(message: string, fallbackChoices: string[]): string {
  const rawOption = extractTag(message, 'option');
  if (rawOption) return rawOption;

  const parsedOptions = parseOptions(message);
  if (parsedOptions.length > 0) {
    return parsedOptions.map(option => `${option.id}. ${option.text}`).join('\n');
  }

  return fallbackChoices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`).join('\n');
}

function buildFallbackUpdateVariable(gameState: GameState, choices: string[]): string {
  // 与 MVU 命令格式保持一致：每行一个 _.set，路径相对 stat_data。
  // 字段路径已按 变量.txt 中 `金珉锡.* / 沈昌珉.* / 敌对势力监控.*` 重命名。
  const xiumin = gameState.xiumin;
  const max = gameState.max;
  const alerts = gameState.alerts;
  const security = gameState.security;
  const nextChoices = choices.length > 0 ? choices : gameState.currentChoices;

  const lines: string[] = [
    `_.set('金珉锡.体内平衡度', ${clamp(xiumin.hp, 0, 100)}); //fallback: 体内平衡度`,
    `_.set('金珉锡.异能输出', ${clamp(xiumin.power, 0, 100)}); //fallback: 异能输出`,
    `_.set('金珉锡.责任值', ${clamp(xiumin.responsibility, 0, 100)}); //fallback: 责任值`,
    `_.set('金珉锡.好感度', ${clamp(xiumin.affection, 0, 100)}); //fallback: 对Max好感度`,
    `_.set('金珉锡.当前FC状态', '${security.fcStatus}'); //fallback: FC频率码状态`,
    `_.set('金珉锡.装备与武装.机甲展开态', '${security.gearDeployState}'); //fallback: 机甲展开态`,
    `_.set('沈昌珉.显像.算力占用率', ${clamp(100 - max.computation, 0, 100)}); //fallback: 算力占用率（=100-可用算力）`,
    `_.set('沈昌珉.系统权限.盲区覆盖率', ${clamp(max.leak, 0, 100)}); //fallback: 盲区覆盖率`,
    `_.set('沈昌珉.系统权限.覆写权限', ${clamp(max.override, 0, 100)}); //fallback: 覆写权限`,
    `_.set('敌对势力监控.Uknow警觉度', ${clamp(alerts.uknowAlert, 0, 100)}); //fallback: Uknow警觉度`,
    `_.set('敌对势力监控.Nexus暴露值', ${clamp(alerts.nexusExposure, 0, 100)}); //fallback: Nexus暴露值`,
    // currentChoices 暂未列入 变量.txt schema，沿用旧路径供 React 端读取
    `_.set('star.gameState.currentChoices', ${JSON.stringify(nextChoices)}); //fallback: 当前选项`,
  ];

  return lines.join('\n');
}

function buildRequestPrompt(request: StarRequestData): string {
  const { gameState } = request;
  const isXiumin = gameState.perspective === 'xiumin';
  const actionType = request.type === 'option' ? '快捷选项' : '自定义行动';

  return `【星河逃亡战术终端：玩家行动提交】

当前视角：${isXiumin ? '金珉锡（Xiumin）/ 生存、异能、冰冷理智' : '沈昌珉（Max）/ AI、黑网、系统覆写'}
行动类型：${actionType}
玩家行动：${request.content}

当前核心状态（仅供参考，请基于此推演下一轮）：
${JSON.stringify({
    perspective: gameState.perspective,
    xiumin: gameState.xiumin,
    max: gameState.max,
    alerts: gameState.alerts,
    security: gameState.security,
    currentChoices: gameState.currentChoices,
  })}

请作为科幻反乌托邦文字 RPG 主持人推进下一段剧情。你必须严格按以下标签输出，不能使用 Markdown 代码块：

<maintext>
用中文写 250-600 字剧情。必须回应玩家行动，并体现双视角张力、Uknow/Nexus 追捕压力、异能与黑网系统的代价。不要出现轻佻语气。
</maintext>

<sum>用一句话概括本轮行动造成的关键变化，供编年史记录。</sum>

<option>
A. 给出下一步具体战术选项
B. 给出另一个风险/收益不同的具体战术选项
C. 给出第三个具体战术选项
</option>

<UpdateVariable>
请按本轮剧情逐字段输出 MVU 命令。**严格遵守以下规则**，否则脚本会回退到默认值，你的剧情数值将被忽略：

1. 每行一条命令，命令必须形如 \`_.set('路径', 新值); //简要原因\`，路径相对于 stat_data，使用 变量.txt 中已定义的中文路径。
2. **绝对禁止**用一条 \`_.set('金珉锡', { ... })\` 整对象覆盖；必须按字段拆开。
3. 数值字段需包含在合法范围内：
   - 金珉锡.体内平衡度 / 异能输出 / 责任值 / 好感度 ∈ [0, 100]
   - 沈昌珉.显像.算力占用率 ∈ [0, 100]
   - 沈昌珉.系统权限.盲区覆盖率 / 覆写权限 ∈ [0, 100]
   - 敌对势力监控.Uknow警觉度 / Nexus暴露值 ∈ [0, 100]
4. 数值变化用 \`_.add\` 表示增量更省事，例如 \`_.add('金珉锡.体内平衡度', -5); //冰壳侵蚀\`。\`_.add\` 第二参为正数即增加，负数即减少；对布尔/字符串字段不要用 _.add，请用 _.set。
5. \`star.gameState.currentChoices\` 必须用 \`_.set\` 整体替换为长度为 3 的字符串数组，元素须与上方 \`<option>\` 中 A/B/C 的正文文字一致（不带"A. "前缀）。
6. 仅修改本轮真正变动的字段；未变化的字段不要重复写入。
7. 如有需要，可一并更新：
   - \`金珉锡.当前FC状态\` ∈ ['HC','伪FC','重编码FC']
   - \`金珉锡.装备与武装.机甲展开态\` ∈ ['遗失','原石','高维折叠','基础状态','完全展开','未知']
   - \`沈昌珉.观测与干涉.当前输入功率\` ∈ [0, 100]，用于推动衍生 \`沈昌珉.冰晶链接阶段\`

示例（仅供格式参考，不要照抄数值）：
_.add('金珉锡.体内平衡度', -8); //冰壳裂纹扩大
_.add('敌对势力监控.Uknow警觉度', 12); //坐标暴露
_.set('沈昌珉.显像.算力占用率', 45); //向冰晶锚点持续输入算力
_.set('star.gameState.currentChoices', ['继续向北穿越冷凝隧道', '请求沈昌珉远程屏蔽哨塔', '诱使Uknow追击地面诱饵']); //本轮三选项
</UpdateVariable>`;
}

async function getBaseMvuData(): Promise<Record<string, any>> {
  await waitGlobalInitialized('Mvu');

  const candidates: Array<number | 'latest'> = [];
  try {
    const assistantMessages = getChatMessages(-1, { role: 'assistant' });
    if (assistantMessages.length > 0) {
      candidates.push(assistantMessages[assistantMessages.length - 1].message_id);
    }
  } catch (error) {
    console.warn('⚠️ [star requestHandler] 获取最新 assistant 消息失败:', error);
  }
  candidates.push('latest', 0);

  for (const message_id of candidates) {
    try {
      const data = Mvu.getMvuData({ type: 'message', message_id });
      if (data && hasStatDataContent(data.stat_data)) return data;
    } catch (error) {
      console.warn(`⚠️ [star requestHandler] 获取 ${message_id} 层 MVU 数据失败:`, error);
    }
  }

  return { stat_data: {}, display_data: {}, delta_data: {} };
}

function rebuildFinalMessage(rawMessage: string, gameState: GameState): { finalMessage: string; usedFallbackUpdate: boolean } {
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

function getStreamingMaintext(message: string): string {
  const cleaned = removeThinkingTags(message);
  const match = cleaned.match(/<maintext[^>]*>([\s\S]*?)(?:<\/maintext>|$)/i) ?? cleaned.match(/<scene[^>]*>([\s\S]*?)(?:<\/scene>|$)/i);
  return match?.[1]?.trim() || '';
}

/**
 * 处理玩家行动：创建 user 楼层 → generate → 创建 assistant 楼层 → 更新编年史
 */
export async function handleStarRequest(request: StarRequestData, callbacks: StarRequestCallbacks = {}): Promise<boolean> {
  let userMessageId: number | null = null;
  let streamListener: { stop: () => void } | void = undefined;
  const generationId = `star-${Date.now()}`;

  try {
    callbacks.onDisableOptions?.();
    callbacks.onShowGenerating?.();

    const prompt = buildRequestPrompt(request);
    const baseData = await getBaseMvuData();

    await createChatMessages(
      [
        {
          role: 'user',
          message: prompt,
          data: baseData,
        },
      ],
      { refresh: 'none' },
    );
    userMessageId = getLastMessageId();

    if (typeof eventOn !== 'undefined' && typeof iframe_events !== 'undefined') {
      streamListener = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (fullText: string, streamGenerationId?: string) => {
        if (streamGenerationId && streamGenerationId !== generationId) return;
        const maintext = getStreamingMaintext(fullText);
        if (maintext) callbacks.onStreamingUpdate?.(maintext);
      });
    }

    const result = await generate({
      user_input: prompt,
      should_stream: true,
      generation_id: generationId,
      max_chat_history: 'all',
    });

    if (typeof result !== 'string') {
      throw Error('generate returned tool call data instead of text');
    }

    const { finalMessage, usedFallbackUpdate } = rebuildFinalMessage(result, request.gameState);
    if (!finalMessage) {
      throw Error('生成内容缺少 <maintext>/<scene>，已丢弃');
    }
    const maintext = parseMaintext(finalMessage);
    const options = parseOptions(finalMessage);
    if (!maintext || options.length === 0) {
      throw Error('生成内容缺少 <maintext>/<scene> 或 <option>');
    }
    if (usedFallbackUpdate) {
      console.warn('⚠️ [star requestHandler] LLM 未输出 <UpdateVariable>，使用本地 fallback 命令');
    }

    let finalData = baseData;
    try {
      const parsedData = await Mvu.parseMessage(finalMessage, baseData);
      if (parsedData && hasStatDataContent(parsedData.stat_data)) {
        if (!detectGameStateUpdated(baseData, parsedData)) {
          // parseMessage 没有产生实际更新——LLM 命令格式可能不合法，或 fallback 也被框架拒绝
          console.warn(
            '⚠️ [star requestHandler] Mvu.parseMessage 未改写 stat_data，可能命令格式不合规',
            { usedFallbackUpdate, sample: finalMessage.match(/<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/)?.[1]?.slice(0, 200) },
          );
        }
        finalData = parsedData;
      } else {
        console.warn('⚠️ [star requestHandler] Mvu.parseMessage 返回空数据，沿用基础 MVU 数据');
      }
    } catch (error) {
      console.warn('⚠️ [star requestHandler] 解析 MVU 命令抛错，沿用基础 MVU 数据:', error);
    }

    await createChatMessages(
      [
        {
          role: 'assistant',
          message: finalMessage,
          data: finalData,
        },
      ],
      { refresh: 'none' },
    );

    const assistantMessageId = getLastMessageId();
    if (hasStatDataContent(finalData.stat_data)) {
      try {
        await Mvu.replaceMvuData(finalData, { type: 'message', message_id: assistantMessageId });
      } catch (error) {
        console.warn('⚠️ [star requestHandler] replaceMvuData 失败，已保留消息 data 字段:', error);
      }
    } else {
      console.warn('⚠️ [star requestHandler] finalData.stat_data 为空，跳过 replaceMvuData 写回');
    }

    await checkAndUpdateChronicle({ messageId: assistantMessageId });
    callbacks.onStreamingUpdate?.('');
    callbacks.onRefreshStory?.();
    return true;
  } catch (error) {
    console.error('❌ [star requestHandler] 请求处理失败:', error);
    if (userMessageId !== null) {
      try {
        await deleteChatMessages([userMessageId], { refresh: 'none' });
      } catch (deleteError) {
        console.warn('⚠️ [star requestHandler] 删除失败请求楼层失败:', deleteError);
      }
    }
    callbacks.onError?.(error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    streamListener?.stop?.();
    callbacks.onHideGenerating?.();
    callbacks.onEnableOptions?.();
  }
}
