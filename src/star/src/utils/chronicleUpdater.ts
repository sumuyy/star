/**
 * 编年史更新工具
 * 从 assistant 消息的 <sum> 标签同步当前角色卡世界书编年史条目
 */

import { parseSum } from './messageParser';

declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user'; hide_state?: 'all' | 'hidden' | 'unhidden' },
): Array<{ message: string; message_id: number; role: string; data?: Record<string, any> }>;
declare function getCharWorldbookNames(character_name: 'current'): { primary: string | null; additional: string[] };
declare function rebindCharWorldbooks(
  character_name: 'current',
  char_worldbooks: { primary: string | null; additional: string[] },
): Promise<void>;
declare function getWorldbook(worldbook_name: string): Promise<Array<Record<string, any>>>;
declare function createWorldbook(worldbook_name: string, worldbook?: Array<Record<string, any>>): Promise<boolean>;
declare function createWorldbookEntries(
  worldbook_name: string,
  new_entries: Array<Record<string, any>>,
  options?: { render?: 'debounced' | 'immediate' },
): Promise<{ worldbook: Array<Record<string, any>>; new_entries: Array<Record<string, any>> }>;
declare function updateWorldbookWith(
  worldbook_name: string,
  updater: (worldbook: Array<Record<string, any>>) => Array<Record<string, any>>,
  options?: { render?: 'debounced' | 'immediate' },
): Promise<Array<Record<string, any>>>;

const CHRONICLE_ENTRY_NAME = '编年史';
const CHRONICLE_KEY = '编年史';
const CHRONICLE_WORLDBOOK_NAME = 'star_星河逃亡_角色编年史';

function getChronicleIndex(floorId: number): number | null {
  if (floorId < 3 || floorId % 2 === 0) return null;
  return (floorId - 1) / 2;
}

function buildChronicleLine(index: number, sum: string): string {
  return `${index}. ${sum}`;
}

function createChronicleEntry(content: string) {
  return {
    name: CHRONICLE_ENTRY_NAME,
    enabled: true,
    strategy: {
      type: 'constant',
      keys: [CHRONICLE_KEY],
      keys_secondary: { logic: 'and_any', keys: [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: 'before_author_note',
      role: 'system',
      depth: 4,
      order: 100,
    },
    content,
    probability: 100,
    recursion: {
      prevent_incoming: true,
      prevent_outgoing: true,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
    extra: {
      source: 'star',
      kind: 'chronicle',
    },
  };
}

interface ChronicleUpdateOptions {
  pruneFuture?: boolean;
  messageId?: number;
}

function updateChronicleContent(content: string, index: number, line: string, pruneFuture: boolean): string {
  const lineRegex = /^(?:-\s*)?(\d+)\s*[.、．]/;
  const lines = String(content || CHRONICLE_KEY).split('\n');
  const hasHeader = lines.length > 0 && !lineRegex.test(lines[0]);
  const header = hasHeader ? lines[0].trim() || CHRONICLE_KEY : CHRONICLE_KEY;
  const body = (hasHeader ? lines.slice(1) : lines).filter(item => item.trim().length > 0);

  let replaced = false;
  const kept: string[] = [];

  for (const item of body) {
    const match = item.match(lineRegex);
    if (!match) {
      kept.push(item);
      continue;
    }

    const itemIndex = Number(match[1]);
    if (itemIndex === index) {
      kept.push(line);
      replaced = true;
    } else if (pruneFuture && itemIndex > index) {
      continue;
    } else {
      kept.push(item);
    }
  }

  if (!replaced) {
    kept.push(line);
  }

  kept.sort((a, b) => {
    const aIndex = Number(a.match(lineRegex)?.[1] ?? Number.MAX_SAFE_INTEGER);
    const bIndex = Number(b.match(lineRegex)?.[1] ?? Number.MAX_SAFE_INTEGER);
    return aIndex - bIndex;
  });

  return [header, ...kept].join('\n');
}

async function getOrCreateCharacterWorldbook(): Promise<string> {
  const charWorldbooks = getCharWorldbookNames('current');
  const worldbookName = charWorldbooks.primary || CHRONICLE_WORLDBOOK_NAME;

  if (!charWorldbooks.primary) {
    await createWorldbook(worldbookName, []);
    await rebindCharWorldbooks('current', {
      primary: worldbookName,
      additional: charWorldbooks.additional || [],
    });
  }

  return worldbookName;
}

/**
 * 检查 assistant 消息并把 <sum> 写入当前角色卡世界书编年史
 */
export async function checkAndUpdateChronicle(options: ChronicleUpdateOptions = { pruneFuture: true }): Promise<void> {
  try {
    const target = options.messageId ?? -1;
    const messages = getChatMessages(target, { role: 'assistant' });
    if (!messages || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    const sum = parseSum(latestMessage.message || '');
    if (!sum) return;

    const floorId = latestMessage.message_id;
    const index = getChronicleIndex(floorId);
    if (index === null) return;

    const line = buildChronicleLine(index, sum);
    const worldbookName = await getOrCreateCharacterWorldbook();

    let worldbook: Array<Record<string, any>> = [];
    try {
      worldbook = await getWorldbook(worldbookName);
    } catch (error) {
      console.warn('⚠️ [star chronicleUpdater] 读取角色卡世界书失败，跳过编年史更新:', error);
      return;
    }

    const existing = worldbook.find(entry => entry.name === CHRONICLE_ENTRY_NAME);
    if (!existing) {
      await createWorldbookEntries(worldbookName, [createChronicleEntry(`${CHRONICLE_KEY}\n${line}`)], { render: 'debounced' });
      console.log('✅ [star chronicleUpdater] 已创建编年史条目');
      return;
    }

    const currentContent = String(existing.content || CHRONICLE_KEY);
    const isRerollOrLoad = new RegExp(`^(?:-\\s*)?${index}\\s*[.、．]`, 'm').test(currentContent);
    if (isRerollOrLoad) {
      console.log(`ℹ️ [star chronicleUpdater] 检测到读档/重 roll，清理 ${index} 之后的编年史`);
    }

    await updateWorldbookWith(
      worldbookName,
      entries =>
        entries.map(entry => {
          if (entry.name !== CHRONICLE_ENTRY_NAME) return entry;
          return {
            ...entry,
            content: updateChronicleContent(String(entry.content || CHRONICLE_KEY), index, line, options.pruneFuture !== false),
          };
        }),
      { render: 'debounced' },
    );

    console.log('✅ [star chronicleUpdater] 已更新编年史条目');
  } catch (error) {
    console.error('❌ [star chronicleUpdater] 更新编年史失败:', error);
  }
}
