/**
 * 消息解析工具
 * 从最新楼层消息中解析 maintext, option, sum 等标签
 */

import { StoryOption, ParsedStoryContent } from '../types';

declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user'; hide_state?: 'all' | 'hidden' | 'unhidden' },
): Array<{ message: string; message_id: number; role: string; data?: Record<string, any> }>;
declare function getLastMessageId(): number;

export interface FloorStoryEntry {
  messageId: number;
  maintext: string;
  sum: string;
  fullMessage: string;
}

/**
 * 移除消息中的 thinking / redacted_reasoning 标签及其内容
 */
export function removeThinkingTags(messageContent: string): string {
  if (!messageContent) return '';

  let cleaned = messageContent;
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<redacted_reasoning>[\s\S]*?<\/redacted_reasoning>/gi, '');

  const unclosedStart = cleaned.search(/<(thinking|think|redacted_reasoning)\b/i);
  if (unclosedStart !== -1) {
    cleaned = cleaned.substring(0, unclosedStart);
  }

  return cleaned;
}

/**
 * 解析消息中的正文
 * 优先提取不在 thinking 标签内部的最后一个 <maintext> 标签，兼容 <scene> 作为回退格式
 */
function extractLastTagBody(cleaned: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches = [...cleaned.matchAll(regex)];
  if (matches.length === 0) return '';
  return (matches[matches.length - 1][1] || '').trim();
}

export function parseMaintext(messageContent: string): string {
  const cleaned = removeThinkingTags(messageContent);
  return extractLastTagBody(cleaned, 'maintext') || extractLastTagBody(cleaned, 'scene');
}

/**
 * 解析消息中的选项
 * 支持两种格式：
 * 1. 带 id: <option id="A">选项文本</option>
 * 2. 不带 id: <option>\nA. 选项1\nB. 选项2\n</option>
 */
export function parseOptions(messageContent: string): StoryOption[] {
  const cleaned = removeThinkingTags(messageContent);

  // 先尝试匹配带 id 的格式
  const optionWithIdRegex = /<option id="([^"]+)">([^<]+)<\/option>/g;
  const optionsWithId: StoryOption[] = [];
  let match;

  while ((match = optionWithIdRegex.exec(cleaned)) !== null) {
    optionsWithId.push({ id: match[1], text: match[2].trim() });
  }

  if (optionsWithId.length > 0) {
    return optionsWithId;
  }

  // 尝试解析不带 id 的格式
  const optionMatch = cleaned.match(/<option>([\s\S]*?)<\/option>/i);
  if (!optionMatch) return [];

  const optionText = optionMatch[1].trim();
  const lines = optionText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const optionPattern = /^[A-Z]\.\s*/;
  const hasLetterPrefix = lines.some(line => optionPattern.test(line));

  if (hasLetterPrefix) {
    const options: StoryOption[] = [];
    let currentOption: string[] = [];

    for (const line of lines) {
      if (optionPattern.test(line)) {
        if (currentOption.length > 0) {
          const text = currentOption.join('\n');
          const id = text.match(/^([A-Z])\./)?.[1] || String.fromCharCode(65 + options.length);
          options.push({ id, text: text.replace(/^[A-Z]\.\s*/, '').trim() });
          currentOption = [];
        }
        currentOption.push(line);
      } else if (currentOption.length > 0) {
        currentOption.push(line);
      }
    }

    if (currentOption.length > 0) {
      const text = currentOption.join('\n');
      const id = text.match(/^([A-Z])\./)?.[1] || String.fromCharCode(65 + options.length);
      options.push({ id, text: text.replace(/^[A-Z]\.\s*/, '').trim() });
    }

    return options;
  }

  return lines.map((line, index) => ({
    id: String.fromCharCode(65 + index),
    text: line,
  }));
}

/**
 * 解析消息中的 sum 标签
 */
export function parseSum(messageContent: string): string {
  const cleaned = removeThinkingTags(messageContent);
  return extractLastTagBody(cleaned, 'sum');
}

/**
 * 读取所有 assistant 楼层中的正文和摘要，用于阅读模式/读档列表
 */
export function loadAllAssistantFloors(): FloorStoryEntry[] {
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) return [];

    const messages = getChatMessages(`0-${lastMessageId}`, { role: 'assistant' });
    if (!messages || messages.length === 0) return [];

    return messages
      .map(message => {
        const messageContent = message.message || '';
        return {
          messageId: message.message_id,
          maintext: parseMaintext(messageContent),
          sum: parseSum(messageContent),
          fullMessage: messageContent,
        };
      })
      .filter(entry => entry.maintext || entry.sum);
  } catch (error) {
    console.error('❌ [messageParser] 加载全部 assistant 楼层失败:', error);
    return [];
  }
}

/**
 * 从最新 assistant 消息中读取正文、选项、摘要
 */
export function loadFromLatestMessage(): ParsedStoryContent {
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) {
      return { maintext: '', options: [] };
    }

    // 优先获取最新 assistant 消息
    const messages = getChatMessages(lastMessageId, { role: 'assistant' });
    if (!messages || messages.length === 0) {
      // 退化：尝试获取任意角色的最新消息
      const allMessages = getChatMessages(lastMessageId);
      if (!allMessages || allMessages.length === 0) {
        return { maintext: '', options: [] };
      }

      const latestMessage = allMessages[allMessages.length - 1];
      const messageContent = latestMessage.message || '';

      let userMessageId: number | undefined;
      if (latestMessage.message_id > 0) {
        const userMessages = getChatMessages(latestMessage.message_id - 1, { role: 'user' });
        if (userMessages && userMessages.length > 0) {
          userMessageId = userMessages[0].message_id;
        }
      }

      return {
        maintext: parseMaintext(messageContent),
        options: parseOptions(messageContent),
        messageId: latestMessage.message_id,
        userMessageId,
        fullMessage: messageContent,
      };
    }

    const latestAssistantMessage = messages[messages.length - 1];
    const messageContent = latestAssistantMessage.message || '';

    let userMessageId: number | undefined;
    if (latestAssistantMessage.message_id > 0) {
      const userMessages = getChatMessages(latestAssistantMessage.message_id - 1, { role: 'user' });
      if (userMessages && userMessages.length > 0) {
        userMessageId = userMessages[0].message_id;
      }
    }

    return {
      maintext: parseMaintext(messageContent),
      options: parseOptions(messageContent),
      messageId: latestAssistantMessage.message_id,
      userMessageId,
      fullMessage: messageContent,
    };
  } catch (error) {
    console.error('❌ [messageParser] 加载最新消息失败:', error);
    return { maintext: '', options: [] };
  }
}
