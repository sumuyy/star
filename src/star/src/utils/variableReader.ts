/**
 * 变量读取工具
 * 从最新楼层消息中读取 star 游戏数据
 */

import { GameState, PerspectiveType, FcStatus, SecurityNetwork, TeammateInfo, BondRelation, TeammateStatus, TeammateLiberation, BondGender, BondAttitudeBucket, SpaceTime, GalaxyCode, DayPhase, SystemStatusEntry, PlotStatus, DarkWebPost, ForumMeta } from '../types';
import { INITIAL_GAME_STATE } from '../data';

declare function getVariables(option: { type: 'message'; message_id: number | 'latest' }): Record<string, any>;
declare function waitGlobalInitialized<T>(global: 'Mvu' | string): Promise<T>;
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'user' | 'assistant' | 'system' | 'all'; hide_state?: 'all' | 'hidden' | 'unhidden' },
): Array<{ message_id: number; role: string; data?: Record<string, any> }>;
declare function getLastMessageId(): number;

declare const Mvu: {
  getMvuData: (options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' }) => {
    stat_data: Record<string, any>;
    display_data?: Record<string, any>;
    delta_data?: Record<string, any>;
  };
};

let mvuInitialized = false;
let mvuInitPromise: Promise<void> | null = null;

type Value = string | number | boolean | Record<string, any> | Array<any> | null | undefined;

/**
 * 从嵌套对象中提取值，支持 MVU 格式 [值, "描述"]
 */
function pick<T extends Value>(obj: any, path: string, fallback: T): T {
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
 * 确保 MVU 已初始化
 */
async function ensureMvuInitialized(): Promise<void> {
  if (mvuInitialized) return;
  if (mvuInitPromise) return mvuInitPromise;

  mvuInitPromise = (async () => {
    try {
      await waitGlobalInitialized('Mvu');
      mvuInitialized = true;
      console.log('✅ [star variableReader] MVU 初始化完成');
    } catch (error) {
      console.warn('⚠️ [star variableReader] 等待 MVU 初始化失败:', error);
      mvuInitialized = true;
    }
  })();

  return mvuInitPromise;
}

/**
 * 检查 stat_data 是否有实际内容
 */
function hasStatDataContent(stat_data: any): boolean {
  return stat_data && typeof stat_data === 'object' && Object.keys(stat_data).length > 0;
}

/**
 * 获取当前最新的 MVU 数据
 * 读取优先级：
 * 1. 最新 assistant 消息的 MVU 数据
 * 2. 最新 assistant 消息的 data 字段
 * 3. 最新楼层的 MVU 数据
 * 4. 最新楼层的变量数据
 * 5. 0层的 MVU 数据
 * 6. 0层的变量数据
 */
async function getStarMvuData(): Promise<{ stat_data: Record<string, any>; display_data?: Record<string, any> }> {
  await ensureMvuInitialized();

  // 1. 最新 assistant 消息
  try {
    const assistantMessages = getChatMessages(-1, { role: 'assistant' });
    if (assistantMessages && assistantMessages.length > 0) {
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      const messageId = latestAssistant.message_id;

      try {
        const mvuData = Mvu.getMvuData({ type: 'message', message_id: messageId });
        if (mvuData && hasStatDataContent(mvuData.stat_data)) {
          console.log(`✅ [star variableReader] 从 assistant 消息 ${messageId} 读取 MVU 数据`);
          return mvuData;
        }
      } catch (err) {
        console.warn(`⚠️ [star variableReader] 从 assistant ${messageId} 读取 MVU 失败:`, err);
      }

      if (latestAssistant.data && hasStatDataContent(latestAssistant.data.stat_data)) {
        console.log(`✅ [star variableReader] 从 assistant ${messageId} 的 data 字段读取变量`);
        return {
          stat_data: latestAssistant.data.stat_data,
          display_data: latestAssistant.data.display_data,
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [star variableReader] 获取最新 assistant 消息失败:', err);
  }

  // 2. 最新楼层
  try {
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    if (mvuData && hasStatDataContent(mvuData.stat_data)) {
      console.log('✅ [star variableReader] 从最新楼层读取 MVU 数据');
      return mvuData;
    }
  } catch (err) {
    console.warn('⚠️ [star variableReader] Mvu.getMvuData(latest) 失败:', err);
  }

  try {
    const variables = getVariables({ type: 'message', message_id: 'latest' });
    if (variables && hasStatDataContent(variables.stat_data)) {
      console.log('✅ [star variableReader] 从最新楼层 getVariables 读取变量');
      return {
        stat_data: variables.stat_data,
        display_data: variables.display_data,
      };
    }
  } catch (err) {
    console.warn('⚠️ [star variableReader] getVariables(latest) 失败:', err);
  }

  // 3. 0层
  try {
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: 0 });
    if (mvuData && hasStatDataContent(mvuData.stat_data)) {
      console.log('✅ [star variableReader] 从0层读取 MVU 数据');
      return mvuData;
    }
  } catch (err) {
    console.warn('⚠️ [star variableReader] Mvu.getMvuData(0) 失败:', err);
  }

  try {
    const variables = getVariables({ type: 'message', message_id: 0 });
    if (variables && hasStatDataContent(variables.stat_data)) {
      console.log('✅ [star variableReader] 从0层 getVariables 读取变量');
      return {
        stat_data: variables.stat_data,
        display_data: variables.display_data,
      };
    }
  } catch (err) {
    console.warn('⚠️ [star variableReader] getVariables(0) 失败:', err);
  }

  console.warn('⚠️ [star variableReader] 无法获取任何楼层数据，返回空对象');
  return { stat_data: {} };
}

/**
 * 将 mvu stat_data 规范化为 GameState
 *
 * 字段映射（参见 变量.txt）：
 *   - 金珉锡.体内平衡度 / 异能输出 / 责任值 / 好感度 → xiumin.{hp,power,responsibility,affection}
 *   - 金珉锡.当前FC状态                                → security.fcStatus
 *   - 金珉锡.装备与武装.机甲展开态                     → security.gearDeployState (+ gearDeployed bool)
 *   - 金珉锡.装备与武装.机甲饰品槽 (record)            → security.accessories[]
 *   - 沈昌珉.显像.算力占用率                           → max.computation = 100 - 占用率
 *   - 沈昌珉.系统权限.盲区覆盖率 / 覆写权限            → max.{leak,override}
 *   - 沈昌珉.冰晶链接阶段 (衍生)                       → max.coreCompiledStage
 *   - 敌对势力监控.Uknow警觉度 / Nexus暴露值           → alerts.{uknowAlert,nexusExposure}
 *
 * 兼容旧格式：如果 stat_data.star.gameState 存在，就直接使用其中字段（覆盖在中文路径之上）。
 */
const FC_VALUES: readonly FcStatus[] = ['HC', '伪FC', '重编码FC'] as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function readNumber(stat: any, path: string, fallback: number): number {
  const v = pick<any>(stat, path, undefined as any);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

function readString(stat: any, path: string, fallback: string): string {
  const v = pick<any>(stat, path, undefined as any);
  if (typeof v === 'string' && v.length > 0) return v;
  return fallback;
}

function readFcStatus(stat: any, fallback: FcStatus): FcStatus {
  const v = readString(stat, '金珉锡.当前FC状态', fallback);
  return (FC_VALUES as readonly string[]).includes(v) ? (v as FcStatus) : fallback;
}

function readSecurityFromMvu(stat: any, base: SecurityNetwork): SecurityNetwork {
  const gearDeployState = readString(stat, '金珉锡.装备与武装.机甲展开态', base.gearDeployState);
  const gearDeployed = ['基础状态', '完全展开'].includes(gearDeployState);

  const accessoriesRaw = pick<any>(stat, '金珉锡.装备与武装.机甲饰品槽', undefined as any);
  let accessories: string[] = base.accessories;
  if (accessoriesRaw && typeof accessoriesRaw === 'object' && !Array.isArray(accessoriesRaw)) {
    accessories = Object.values(accessoriesRaw)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
  } else if (Array.isArray(accessoriesRaw)) {
    accessories = accessoriesRaw.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }

  // 背包物品: { 黑市HC手环: { 数量, 描述 }, ... }
  const backpackRaw = pick<any>(stat, '金珉锡.装备与武装.背包物品', undefined as any);
  let backpack = base.backpack;
  if (backpackRaw && typeof backpackRaw === 'object' && !Array.isArray(backpackRaw)) {
    backpack = Object.entries(backpackRaw).map(([name, raw]: [string, any]) => ({
      name,
      count: typeof raw?.['数量'] === 'number' ? raw['数量'] : 1,
      description: typeof raw?.['描述'] === 'string' ? raw['描述'] : '',
    }));
  }

  return {
    fcStatus: readFcStatus(stat, base.fcStatus),
    gearDeployed,
    gearDeployState,
    accessories,
    backpack,
    disguise: {
      name: readString(stat, '金珉锡.伪装身份.姓名', base.disguise.name),
      role: readString(stat, '金珉锡.伪装身份.身份', base.disguise.role),
      registeredSystem: readString(stat, '金珉锡.伪装身份.注册星系', base.disguise.registeredSystem),
      registrationId: readString(stat, '金珉锡.伪装身份.注册编号', base.disguise.registrationId),
    },
    maxExposed: pick<boolean>(stat, '金珉锡.Max掉马状态', base.maxExposed) === true,
  };
}

const TEAMMATE_STATUS_VALUES: readonly TeammateStatus[] = ['在场', '离场', '失联', '未知'] as const;
const TEAMMATE_LIBERATION_VALUES: readonly TeammateLiberation[] = ['压制', '封印', '伪装态', '规则级', '爆发', '强制冷却', '未知'] as const;
const BOND_GENDER_VALUES: readonly BondGender[] = ['男', '女', 'AI', '未知'] as const;
const BOND_ATTITUDE_BUCKETS: readonly BondAttitudeBucket[] = ['友好', '敌对', '中立'] as const;

/**
 * 把变量.txt 中 `队友情报.{name}` record 转成 TeammateInfo[]
 */
function readTeammates(stat: any, base: TeammateInfo[]): TeammateInfo[] {
  const raw = pick<any>(stat, '队友情报', undefined as any);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const list: TeammateInfo[] = [];
  for (const [name, info] of Object.entries(raw as Record<string, any>)) {
    if (!info || typeof info !== 'object') continue;
    const detail = info['详细情报'] || {};
    const backlashRaw = Number(detail['肉体反噬度']);
    const backlash = Number.isFinite(backlashRaw) ? Math.max(-1, Math.min(100, backlashRaw)) : -1;

    list.push({
      id: name,
      name,
      status: (TEAMMATE_STATUS_VALUES as readonly string[]).includes(info['状态']) ? (info['状态'] as TeammateStatus) : '未知',
      currentMove: typeof info['当前动向'] === 'string' && info['当前动向'] ? info['当前动向'] : '未知',
      awakening: typeof detail['觉醒节点'] === 'string' && detail['觉醒节点'] ? detail['觉醒节点'] : '未知',
      liberation: (TEAMMATE_LIBERATION_VALUES as readonly string[]).includes(detail['能力解放度']) ? (detail['能力解放度'] as TeammateLiberation) : '未知',
      fcState: typeof detail['FC状态'] === 'string' && detail['FC状态'] ? detail['FC状态'] : '未知',
      disguise: typeof detail['伪装身份'] === 'string' && detail['伪装身份'] ? detail['伪装身份'] : '未知',
      mechMove: typeof detail['机甲动向'] === 'string' && detail['机甲动向'] ? detail['机甲动向'] : '未知',
      backlash,
      location: typeof info['位置'] === 'string' && info['位置'] ? info['位置'] : '未知',
    });
  }
  return list.length > 0 ? list : base;
}

/**
 * 把变量.txt 中 `社交情报.其他羁绊.{name}` record 转成 BondRelation[]
 */
function readBonds(stat: any, base: BondRelation[]): BondRelation[] {
  const raw = pick<any>(stat, '社交情报.其他羁绊', undefined as any);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const list: BondRelation[] = [];
  for (const [name, info] of Object.entries(raw as Record<string, any>)) {
    if (!info || typeof info !== 'object') continue;
    const affinityRaw = Number(info['好感度']);
    const affinity = Number.isFinite(affinityRaw) ? Math.max(0, Math.min(100, affinityRaw)) : 0;

    list.push({
      id: name,
      name,
      gender: (BOND_GENDER_VALUES as readonly string[]).includes(info['性别']) ? (info['性别'] as BondGender) : '未知',
      attitude: typeof info['态度'] === 'string' && info['态度'] ? info['态度'] : '陌生',
      attitudeBucket: (BOND_ATTITUDE_BUCKETS as readonly string[]).includes(info['当前态度']) ? (info['当前态度'] as BondAttitudeBucket) : '中立',
      status: (TEAMMATE_STATUS_VALUES as readonly string[]).includes(info['状态']) ? (info['状态'] as TeammateStatus) : '未知',
      location: typeof info['位置'] === 'string' && info['位置'] ? info['位置'] : '未知',
      move: typeof info['动向'] === 'string' && info['动向'] ? info['动向'] : '未知',
      faction: typeof info['阵营'] === 'string' && info['阵营'] ? info['阵营'] : '未知',
      identity: typeof info['身份'] === 'string' && info['身份'] ? info['身份'] : '未知',
      affinity,
      trait: typeof info['特质'] === 'string' && info['特质'] ? info['特质'] : '暂无情报',
      recent: typeof info['近期经历'] === 'string' && info['近期经历'] ? info['近期经历'] : '未知',
    });
  }
  return list.length > 0 ? list : base;
}

const GALAXY_VALUES: readonly GalaxyCode[] = [
  'T星系', 'F星系', 'G星系', 'S星系', 'N星系', 'R星系',
  'EX星系', '边缘星区', '数据层', '高维', '未知星域', '其他', '未知',
] as const;

const DAY_PHASE_VALUES: readonly DayPhase[] = [
  '清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜', '凌晨', '未知',
] as const;

/**
 * 把变量.txt 中 `当前时空` 子树打平到 SpaceTime
 */
function readSpaceTime(stat: any, base: SpaceTime): SpaceTime {
  const galaxyRaw = readString(stat, '当前时空.星系', base.galaxy);
  const galaxy = (GALAXY_VALUES as readonly string[]).includes(galaxyRaw) ? (galaxyRaw as GalaxyCode) : base.galaxy;

  const phaseRaw = readString(stat, '当前时空.时间.时间段', base.time.phase);
  const phase = (DAY_PHASE_VALUES as readonly string[]).includes(phaseRaw) ? (phaseRaw as DayPhase) : base.time.phase;

  return {
    galaxy,
    planet: readString(stat, '当前时空.星球', base.planet),
    region: readString(stat, '当前时空.地点', base.region),
    spot: readString(stat, '当前时空.具体地点', base.spot),
    time: {
      year: readNumber(stat, '当前时空.时间.年份', base.time.year),
      month: clamp(readNumber(stat, '当前时空.时间.月', base.time.month), 1, 12),
      day: clamp(readNumber(stat, '当前时空.时间.日', base.time.day), 1, 31),
      phase,
      hour: clamp(readNumber(stat, '当前时空.时间.时', base.time.hour), 0, 23),
      minute: clamp(readNumber(stat, '当前时空.时间.分', base.time.minute), 0, 59),
    },
    tactical: {
      securityLevel: readString(stat, '当前时空.战术情报.安保级别', base.tactical.securityLevel),
      interference: readString(stat, '当前时空.战术情报.环境干扰说明', base.tactical.interference),
      terrain: readString(stat, '当前时空.战术情报.地形侦测描述', base.tactical.terrain),
    },
  };
}

/**
 * 把变量.txt 中 `星系状态监控` record 转成 SystemStatusEntry[]
 */
function readSystemStatuses(stat: any, base: SystemStatusEntry[]): SystemStatusEntry[] {
  const raw = pick<any>(stat, '星系状态监控', undefined as any);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const list: SystemStatusEntry[] = [];
  for (const [id, info] of Object.entries(raw as Record<string, any>)) {
    if (!info || typeof info !== 'object') continue;
    const syncRaw = Number((info as any)['同步率']);
    const syncRate = Number.isFinite(syncRaw) ? Math.max(0, Math.min(100, syncRaw)) : 100;
    const tag = typeof (info as any)['状态标签'] === 'string' && (info as any)['状态标签']
      ? (info as any)['状态标签']
      : '[NORMAL]';
    list.push({
      id,
      syncRate,
      tag,
      summary: typeof (info as any)['简述'] === 'string' && (info as any)['简述']
        ? (info as any)['简述']
        : '未知',
    });
  }
  return list.length > 0 ? list : base;
}

/**
 * 剧情状态（变量.txt 中 `剧情状态.*`）
 */
function readPlot(stat: any, base: PlotStatus): PlotStatus {
  const locatorRaw = pick<any>(stat, '剧情状态.找到定位仪', undefined as any);
  const hasLocator = typeof locatorRaw === 'boolean' ? locatorRaw : base.hasLocator;
  return {
    mainProgress: readString(stat, '剧情状态.主线进度', base.mainProgress),
    currentObjective: readString(stat, '剧情状态.当前主要目标', base.currentObjective),
    hasLocator,
  };
}

/**
 * 暗网论坛元信息（变量.txt 中 `暗网论坛数据.{平台名称/当前板块/数据快照时间}`）
 */
function readForumMeta(stat: any, base: ForumMeta): ForumMeta {
  return {
    platform: readString(stat, '暗网论坛数据.平台名称', base.platform),
    section: readString(stat, '暗网论坛数据.当前板块', base.section),
    snapshot: readString(stat, '暗网论坛数据.数据快照时间', base.snapshot),
  };
}

/**
 * 把变量.txt 中 `暗网论坛数据.帖子列表.{id}` record 转成 DarkWebPost[]
 *
 * 字段映射：
 *   .分类       → category
 *   .标题       → title
 *   .发帖人     → author
 *   .热度       → hotScore
 *   .发布时间   → time（保留完整 "YYYY-MM-DD HH:mm" 字符串，列表/详情显示由 UI 决定截取）
 *   .内容摘要   → text
 *   .标签       → tags[]
 *   .回复列表.{rid}.用户/内容 → replies[]（time 留空，UI 用 deriveReplyTime 推算）
 *
 * 帖子顺序：按 key（如 N_719_001）字典序，发帖时间倒序作 fallback。
 */
function readDarkWebPosts(stat: any, base: DarkWebPost[]): DarkWebPost[] {
  const raw = pick<any>(stat, '暗网论坛数据.帖子列表', undefined as any);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const list: DarkWebPost[] = [];
  for (const [id, info] of Object.entries(raw as Record<string, any>)) {
    if (!info || typeof info !== 'object') continue;

    const hotRaw = Number((info as any)['热度']);
    const hotScore = Number.isFinite(hotRaw) ? hotRaw : 0;

    const tagsRaw = (info as any)['标签'];
    const tags: string[] = Array.isArray(tagsRaw)
      ? tagsRaw.filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [];

    // 回复列表是 record，按 key（R_001/R_002...）字典序遍历
    const repliesRaw = (info as any)['回复列表'];
    const replies: { author: string; text: string; time: string }[] = [];
    if (repliesRaw && typeof repliesRaw === 'object' && !Array.isArray(repliesRaw)) {
      const replyKeys = Object.keys(repliesRaw).sort();
      for (const rk of replyKeys) {
        const r = repliesRaw[rk];
        if (!r || typeof r !== 'object') continue;
        const author = typeof r['用户'] === 'string' && r['用户'] ? r['用户'] : '匿名';
        const text = typeof r['内容'] === 'string' && r['内容'] ? r['内容'] : '';
        if (!text) continue;
        replies.push({ author, text, time: '' });
      }
    }

    list.push({
      id,
      title: typeof (info as any)['标题'] === 'string' ? (info as any)['标题'] : id,
      author: typeof (info as any)['发帖人'] === 'string' ? (info as any)['发帖人'] : '匿名',
      replyCount: replies.length,
      hotScore,
      time: typeof (info as any)['发布时间'] === 'string' ? (info as any)['发布时间'] : '',
      text: typeof (info as any)['内容摘要'] === 'string' ? (info as any)['内容摘要'] : '',
      replies,
      category: typeof (info as any)['分类'] === 'string' ? (info as any)['分类'] : '',
      tags,
    });
  }

  if (list.length === 0) return base;
  // 按 key 字典序排（N_719_001/002/.. 自然递增），便于 UI 稳定
  list.sort((a, b) => a.id.localeCompare(b.id));
  return list;
}

function normalizeGameStateFromStatData(stat: any): GameState {
  const base = JSON.parse(JSON.stringify(INITIAL_GAME_STATE)) as GameState;
  if (!stat || typeof stat !== 'object') return base;

  // 兼容旧版本：直接读 star.gameState（如果有）
  const legacy = pick<any>(stat, 'star.gameState', null as any);
  const legacyPerspective: PerspectiveType | undefined =
    legacy && (legacy.perspective === 'xiumin' || legacy.perspective === 'max') ? legacy.perspective : undefined;

  return {
    perspective: legacyPerspective ?? base.perspective,
    spaceTime: readSpaceTime(stat, base.spaceTime),
    plot: readPlot(stat, base.plot),
    systemStatuses: readSystemStatuses(stat, base.systemStatuses),
    xiumin: {
      hp: clamp(readNumber(stat, '金珉锡.体内平衡度', base.xiumin.hp), 0, 100),
      power: clamp(readNumber(stat, '金珉锡.异能输出', base.xiumin.power), 0, 100),
      responsibility: clamp(readNumber(stat, '金珉锡.责任值', base.xiumin.responsibility), 0, 100),
      affection: clamp(readNumber(stat, '金珉锡.好感度', base.xiumin.affection), 0, 100),
      idleMode: (readString(stat, '金珉锡.异能状态', base.xiumin.idleMode) === '休眠' ? '休眠' : '压制'),
    },
    max: {
      // 100 - 算力占用率，作为"剩余可用算力"
      computation: clamp(100 - readNumber(stat, '沈昌珉.显像.算力占用率', 100 - base.max.computation), 0, 100),
      leak: clamp(readNumber(stat, '沈昌珉.系统权限.盲区覆盖率', base.max.leak), 0, 100),
      override: clamp(readNumber(stat, '沈昌珉.系统权限.覆写权限', base.max.override), 0, 100),
      coreCompiledStage: readString(stat, '沈昌珉.冰晶链接阶段', base.max.coreCompiledStage),
    },
    alerts: {
      uknowAlert: clamp(readNumber(stat, '敌对势力监控.Uknow警觉度', base.alerts.uknowAlert), 0, 100),
      nexusExposure: clamp(readNumber(stat, '敌对势力监控.Nexus暴露值', base.alerts.nexusExposure), 0, 100),
    },
    security: readSecurityFromMvu(stat, base.security),
    teammates: readTeammates(stat, Array.isArray(legacy?.teammates) ? legacy.teammates : base.teammates),
    bonds: readBonds(stat, Array.isArray(legacy?.bonds) ? legacy.bonds : base.bonds),
    posts: readDarkWebPosts(stat, Array.isArray(legacy?.posts) ? legacy.posts : base.posts),
    forumMeta: readForumMeta(stat, legacy?.forumMeta && typeof legacy.forumMeta === 'object' ? legacy.forumMeta : base.forumMeta),
    // 以下字段 变量.txt 暂未对齐，先沿用 legacy / 初始值
    logs: Array.isArray(legacy?.logs) ? legacy.logs : base.logs,
    chatHistory: Array.isArray(legacy?.chatHistory) ? legacy.chatHistory : base.chatHistory,
    // TODO: currentChoices 待处理（来源未定，是从 mvu 还是从 <option> 标签 parse）
    currentChoices: Array.isArray(legacy?.currentChoices) ? legacy.currentChoices : base.currentChoices,
  };
}

/**
 * 从最新楼层读取 star 游戏数据
 */
export async function readStarGameData(): Promise<GameState> {
  try {
    const mvuData = await getStarMvuData();
    const stat = mvuData.stat_data || {};

    console.log('🔍 [star variableReader] stat_data 内容:', {
      keys: Object.keys(stat),
      hasXiumin: !!stat['金珉锡'],
      hasMax: !!stat['沈昌珉'],
      hasLegacyStar: !!stat.star,
    });

    return normalizeGameStateFromStatData(stat);
  } catch (error) {
    console.error('❌ [star variableReader] 读取游戏数据失败:', error);
    return INITIAL_GAME_STATE;
  }
}
