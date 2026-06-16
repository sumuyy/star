/**
 * 玩家行动处理器
 * 主流程控制：创建 user 楼层 → generate → 创建 assistant 楼层 → 更新编年史
 */

import { GameState } from '../types';
import { parseMaintext, parseOptions } from './messageParser';
import { checkAndUpdateChronicle } from './chronicleUpdater';
import { buildRequestPrompt, getStreamingMaintext } from './promptBuilder';
import { getBaseMvuData, rebuildFinalMessage, parseAndApplyMvuUpdate, writeMvuToFloor, hasStatDataContent } from './mvuUpdater';

declare function getLastMessageId(): number;
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
declare function eventOn(event: string, callback: (...args: any[]) => void): { stop: () => void } | void;
declare const iframe_events: {
  STREAM_TOKEN_RECEIVED_FULLY: string;
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

/**
 * 处理玩家行动：创建 user 楼层 → generate → 创建 assistant 楼层 → 更新编年史
 */
export async function handleStarRequest(
  request: StarRequestData,
  callbacks: StarRequestCallbacks = {},
): Promise<boolean> {
  let userMessageId: number | null = null;
  let streamListener: { stop: () => void } | void = undefined;
  const generationId = `star-${Date.now()}`;

  try {
    // 1. 前置准备
    callbacks.onDisableOptions?.();
    callbacks.onShowGenerating?.();

    const prompt = buildRequestPrompt(request);
    const baseData = await getBaseMvuData();

    // 2. 创建 user 楼层（隐藏的请求楼层）
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

    // 3. 注册流式输出监听
    if (typeof eventOn !== 'undefined' && typeof iframe_events !== 'undefined') {
      streamListener = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (fullText: string, streamGenerationId?: string) => {
        if (streamGenerationId && streamGenerationId !== generationId) return;
        const maintext = getStreamingMaintext(fullText);
        if (maintext) callbacks.onStreamingUpdate?.(maintext);
      });
    }

    // 4. 调用 generate
    const result = await generate({
      user_input: prompt,
      should_stream: true,
      generation_id: generationId,
      max_chat_history: 'all',
    });

    if (typeof result !== 'string') {
      throw Error('generate returned tool call data instead of text');
    }

    // 5. 重构最终消息（规范化标签 + 补全 UpdateVariable）
    const { finalMessage, usedFallbackUpdate } = rebuildFinalMessage(result, request.gameState);
    if (!finalMessage) {
      throw Error('生成内容缺少 <maintext>/<scene>，已丢弃');
    }

    // 校验生成结果
    const maintext = parseMaintext(finalMessage);
    const options = parseOptions(finalMessage);
    if (!maintext || options.length === 0) {
      throw Error('生成内容缺少 <maintext>/<scene> 或 <option>');
    }
    if (usedFallbackUpdate) {
      console.warn('⚠️ [star actionProcessor] LLM 未输出 <UpdateVariable>，使用本地 fallback 命令');
    }

    // 6. 解析 MVU 更新
    const { finalData } = await parseAndApplyMvuUpdate(finalMessage, baseData);

    // 7. 创建 assistant 楼层
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

    // 8. 把 MVU 数据写回到 assistant 楼层
    const assistantMessageId = getLastMessageId();
    try {
      await writeMvuToFloor(finalData, assistantMessageId);
    } catch (error) {
      console.warn('⚠️ [star actionProcessor] writeMvuToFloor 失败，已保留消息 data 字段:', error);
    }

    // 9. 更新编年史
    await checkAndUpdateChronicle({ messageId: assistantMessageId });

    // 10. 完成回调
    callbacks.onStreamingUpdate?.('');
    callbacks.onRefreshStory?.();
    return true;
  } catch (error) {
    console.error('❌ [star actionProcessor] 请求处理失败:', error);

    // 失败回滚：删除刚才创建的 user 楼层
    if (userMessageId !== null) {
      try {
        await deleteChatMessages([userMessageId], { refresh: 'none' });
      } catch (deleteError) {
        console.warn('⚠️ [star actionProcessor] 删除失败请求楼层失败:', deleteError);
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
