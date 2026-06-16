/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PerspectiveType = "xiumin" | "max";

/**
 * 当前时空（变量.txt 中 `当前时空.*` 子树）
 *   - 时间.{年份/月/日/时/分} 走数值；时间段是枚举
 *   - 战术情报.{安保级别/环境干扰说明/地形侦测描述}
 */
export type GalaxyCode =
  | "T星系"
  | "F星系"
  | "G星系"
  | "S星系"
  | "N星系"
  | "R星系"
  | "EX星系"
  | "边缘星区"
  | "数据层"
  | "高维"
  | "未知星域"
  | "其他"
  | "未知";

export type DayPhase =
  | "清晨"
  | "上午"
  | "中午"
  | "下午"
  | "傍晚"
  | "夜晚"
  | "深夜"
  | "凌晨"
  | "未知";

export interface SpaceTime {
  galaxy: GalaxyCode; // 星系
  planet: string; // 星球
  region: string; // 地点
  spot: string; // 具体地点
  time: {
    year: number;
    month: number; // 1-12
    day: number; // 1-31
    phase: DayPhase;
    hour: number; // 0-23
    minute: number; // 0-59
  };
  tactical: {
    securityLevel: string; // 战术情报.安保级别
    interference: string; // 战术情报.环境干扰说明
    terrain: string; // 战术情报.地形侦测描述
  };
}

/**
 * 全局星系状态监控（变量.txt 中 `星系状态监控` record）
 *   - 单位是按星系名 keyed 的 record；每条带 同步率 / 状态标签 / 简述
 */
export type SystemStatusTag = "[NORMAL]" | "[ALERT]" | "[ANOMALY]" | "[OFFLINE]" | string;

export interface SystemStatusEntry {
  id: string; // 星系 key（例：N星系）
  syncRate: number; // 0-100
  tag: SystemStatusTag; // 状态标签
  summary: string; // 简述
}

/**
 * 剧情状态（变量.txt 中 `剧情状态.*`）
 */
export interface PlotStatus {
  mainProgress: string; // 主线进度
  currentObjective: string; // 当前主要目标
  hasLocator: boolean; // 找到定位仪
}

/**
 * 金珉锡核心数值（变量.txt 中 `金珉锡.*` 子树）
 * 注意：
 *   - hp = `金珉锡.体内平衡度`
 *   - power = `金珉锡.异能输出`
 *   - responsibility = `金珉锡.责任值`
 *   - affection = `金珉锡.好感度`
 *   - 不再有数值化的 mind / 冰壳厚度，UI 直接渲染衍生字段 `金珉锡.冰壳状态`
 */
export interface XiuminStats {
  hp: number; // 体内平衡度 (0-100)
  power: number; // 异能输出 (0-100)
  responsibility: number; // 责任值 (0-100)
  affection: number; // 对 Max 的好感度 (0-100)
  /** 异能输出 = 0 时的姿态（剧情判定，不是玩家选）。"压制" = 主动封锁外溢；"休眠" = 爆发后透支沉寂 */
  idleMode: "压制" | "休眠";
}

/**
 * 沈昌珉核心数值（变量.txt 中 `沈昌珉.*` 子树）
 * 注意：
 *   - computation = 100 - `沈昌珉.显像.算力占用率`（剩余可用算力）
 *   - leak = `沈昌珉.系统权限.盲区覆盖率`
 *   - override = `沈昌珉.系统权限.覆写权限`
 *   - coreCompiledStage = 衍生字段 `沈昌珉.冰晶链接阶段`
 *   - 旧的 `temp` 核心温度已移除（变量.txt 中无对应字段）
 */
export interface MaxStats {
  computation: number; // 剩余可用算力 (0-100)
  leak: number; // 盲区覆盖率 (0-100)
  override: number; // 覆写权限 (0-100)
  coreCompiledStage: string; // 衍生：冰晶链接阶段（'核心编译' / '物理干涉(濒死输热)' / '算力供养' / '冰晶烙印' / '隐秘注视'）
}

export interface GlobalAlerts {
  uknowAlert: number; // `敌对势力监控.Uknow警觉度` (0-100)
  nexusExposure: number; // `敌对势力监控.Nexus暴露值` (0-100)
}

/**
 * 装备与频率网（变量.txt 中 `金珉锡.当前FC状态` 与 `金珉锡.装备与武装.*`）
 * UI 显示：FC 状态枚举 'HC' / '伪FC' / '重编码FC'
 */
export type FcStatus = "HC" | "伪FC" | "重编码FC";

export interface SecurityNetwork {
  fcStatus: FcStatus; // `金珉锡.当前FC状态`
  gearDeployed: boolean; // 由 `金珉锡.装备与武装.机甲展开态` 推导（'未展开'/'遗失'/'原石'/'高维折叠' 视为收起，'基础状态'/'完全展开' 视为展开）
  gearDeployState: string; // 原始 `金珉锡.装备与武装.机甲展开态` 文本，方便 UI 直接展示
  accessories: string[]; // 由 `金珉锡.装备与武装.机甲饰品槽` 的 value 列表化
  /** 由 `金珉锡.装备与武装.背包物品.{name}: {数量, 描述}` 列表化 */
  backpack: BackpackItem[];
  /** 伪装身份四件套 — 来自 `金珉锡.伪装身份.{姓名,身份,注册星系,注册编号}` */
  disguise: {
    name: string;
    role: string;
    registeredSystem: string;
    registrationId: string;
  };
  /** `金珉锡.Max掉马状态` — true = Max 真名已暴露 */
  maxExposed: boolean;
}

export interface BackpackItem {
  name: string;
  count: number;
  description: string;
}

/**
 * 队友情报（变量.txt 中 `队友情报.{name}` record）
 *   - id/name 由 record 的 key 派生，name 直接等于 key
 *   - status 由 `队友情报.{name}.状态` 直接给：'在场' / '离场' / '失联' / '未知'
 *   - liberation 是枚举：'压制' / '封印' / '伪装态' / '规则级' / '爆发' / '强制冷却' / '未知'
 *   - awakening 是觉醒节点枚举：'失忆' / '碎片闪回' / '潜意识共鸣' / '认知动摇' / '记忆恢复' / '记忆保留' / '未知'
 *   - fcState 是 FC 状态枚举：'无码' / 'HC(幽灵脉冲)' / '伪造FC' / '系统直连' / '军方烙印' / '未知'
 *   - backlash 是 0-100，-1 代表"未知/未读取"
 */
export type TeammateStatus = "在场" | "离场" | "失联" | "未知";
export type TeammateLiberation = "压制" | "封印" | "伪装态" | "规则级" | "爆发" | "强制冷却" | "未知";

export interface TeammateInfo {
  id: string;
  name: string;
  status: TeammateStatus;
  currentMove: string; // 当前动向
  awakening: string; // 详细情报.觉醒节点
  liberation: TeammateLiberation; // 详细情报.能力解放度（枚举）
  fcState: string; // 详细情报.FC状态
  disguise: string; // 详细情报.伪装身份
  mechMove: string; // 详细情报.机甲动向
  backlash: number; // 详细情报.肉体反噬度 (-1 ~ 100)
  location: string; // 上层 .位置（用于状态=离场时显示）
}

/**
 * 羁绊（变量.txt 中 `社交情报.其他羁绊.{name}` record）
 */
export type BondGender = "男" | "女" | "AI" | "未知";
export type BondAttitudeBucket = "友好" | "敌对" | "中立";

export interface BondRelation {
  id: string;
  name: string;
  gender: BondGender; // .性别
  attitude: string; // .态度（自由文本）
  attitudeBucket: BondAttitudeBucket; // .当前态度（友好/敌对/中立 三选一）
  status: TeammateStatus; // .状态（沿用同样的四值枚举）
  location: string; // .位置
  move: string; // .动向
  faction: string; // .阵营
  identity: string; // .身份
  affinity: number; // .好感度
  trait: string; // .特质
  recent: string; // .近期经历
}

export interface DarkWebPost {
  id: string;
  title: string;
  author: string;
  replyCount: number;
  hotScore: number;
  time: string;
  text: string;
  replies: { author: string; text: string; time: string }[];
  /** 变量树 `暗网论坛数据.帖子列表.{id}.分类`，例如 "情报/置顶"；旧数据没有时为空串 */
  category: string;
  /** 变量树 `暗网论坛数据.帖子列表.{id}.标签` 列表 */
  tags: string[];
}

/**
 * 暗网论坛元信息（变量.txt 中 `暗网论坛数据.{平台名称/当前板块/数据快照时间}`）
 */
export interface ForumMeta {
  platform: string; // 平台名称
  section: string; // 当前板块
  snapshot: string; // 数据快照时间
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  source: "SYS" | "XIUMIN" | "MAX" | "NET" | "WARN";
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: "player" | "gm" | "system";
  text: string;
  timestamp: string;
  perspective: PerspectiveType;
}

export interface GameState {
  perspective: PerspectiveType;
  spaceTime: SpaceTime;
  plot: PlotStatus;
  systemStatuses: SystemStatusEntry[];
  xiumin: XiuminStats;
  max: MaxStats;
  alerts: GlobalAlerts;
  security: SecurityNetwork;
  teammates: TeammateInfo[];
  bonds: BondRelation[];
  posts: DarkWebPost[];
  forumMeta: ForumMeta;
  logs: TerminalLog[];
  chatHistory: ChatMessage[];
  currentChoices: string[]; // TODO: 来源未定 — 当前从 stat_data.star.gameState.currentChoices 兜底读，后续可能改成只 parse <option> 标签
}

export interface OpeningFormData {
  startingPerspective: PerspectiveType;
  difficulty: 'normal' | 'hard' | 'nightmare';
  openingLocation: string;
  initialThreatLevel: number;
}

export interface StoryOption {
  id: string;
  text: string;
}

export interface ParsedStoryContent {
  maintext: string;
  options: StoryOption[];
  sum?: string;
  messageId?: number;
  userMessageId?: number;
  fullMessage?: string;
}

/* =========================================================================
 * 星图(联邦赫特斯原点星图)数据模型
 *   - Layer 0: 联邦星图,只放 6 个星系节点 + 2 个边缘星球
 *   - Layer 1: 点入某星系后展示的星系内部图(恒星 + 主要行星 + 黑市流浪星 + 边缘小行星)
 *   - Layer 2: 暂不实现(瑟斯塔三层 / 帕提拉垂直分层)
 * ========================================================================= */

/** Layer 0 节点种类 */
export type StarMapNodeKind = "system" | "rogue";
//   system -- 星系主节点(可点击进入 Layer 1)
//   rogue  -- 流浪/边缘星球,完全脱离任何星系引力,仅以特征名显示

/** Layer 1 子节点种类 */
export type SystemBodyKind =
  | "star"        // 恒星
  | "planet"      // 主要行星
  | "blackmarket" // 黑市流浪星 — 受恒星弱引力束缚,仍归属该星系
  | "asteroid"    // 边缘小行星(如 S36)
  | "debris";     // 破碎弧带(如 R15 碎裂带)

/** 危险等级 */
export type DangerLevel = "LOW" | "MED" | "HIGH" | "CRITICAL";

/**
 * 名字状态:
 *   confirmed   -- 世界书已写
 *   placeholder -- 占位名(F-Star / N-Star / R-Star / S-Star / G-Star)
 *   redacted    -- 坐标/名称被抹除(如 N 星系 · 瑟斯塔)
 */
export type NameStatus = "confirmed" | "placeholder" | "redacted";

/** 世界书条目引用,运行时通过 getWorldbook(book).find(e => e.name === entry) 拉取 */
export interface WorldbookRef {
  /** 世界书名,默认 "星空" */
  book?: string;
  /** 条目名,如 "世界观/区域/T星系/特里安格尔" */
  entry: string;
}

/** 星系内部图的轨道带 */
export type OrbitBand = "core" | "inner" | "mid" | "outer" | "edge";
//   core   -- 恒星(中心)
//   inner  -- 内圈
//   mid    -- 中圈
//   outer  -- 外圈
//   edge   -- 最外圈(柯伊伯带,小行星 / 黑市流浪星)

/** Layer 0 节点(联邦星图) */
export interface StarMapNode {
  id: string;
  kind: StarMapNodeKind;
  /** 显示名,如 "T 星系" / "KTC" / "冰雪星球" */
  label: string;
  /** 极坐标方位角(度),原点节点不需要 */
  angleDeg?: number;
  /** 极坐标半径,默认 150;边缘星球用更大或自定义半径 */
  radius?: number;
  /** 是否为原点(中心),只 T 星系是 */
  isOrigin?: boolean;
  danger: DangerLevel;
  /** 一句话状态,显示在右侧详情面板 */
  summary: string;
  /** 关联世界书条目(可选);若有,运行时优先用世界书内容 */
  worldbook?: WorldbookRef;
  /** 仅 system 类型有:对应的 Layer 1 数据 id(T / F / N / R / S / G) */
  systemId?: string;
}

/** Layer 1 子节点(星系内部图) */
export interface SystemBody {
  id: string;
  kind: SystemBodyKind;
  label: string;
  nameStatus: NameStatus;
  orbit: OrbitBand;
  /** 在星系内部图轨道圈上的方位角(0-360),不填则由渲染层均分 */
  angleDeg?: number;
  danger: DangerLevel;
  summary: string;
  worldbook?: WorldbookRef;
  /** 双子星伴生 id(目前仅 S 星系的瑞菲弥亚 ↔ 维奥普斯) */
  twinOf?: string;
  /** 视觉特殊:虚线轮廓(瑟斯塔之类被抹除的) */
  redacted?: boolean;
}

/** Layer 1: 一个星系的内部图 */
export interface StarSystem {
  /** 与 SECTOR.systemCode 对齐:T / F / N / R / S / G */
  id: "T" | "F" | "N" | "R" | "S" | "G";
  /** 星系氛围副标题,如 "权力中枢" / "工业脊梁" */
  nickname: string;
  /** 恒星(orbit=core) */
  star: SystemBody;
  /** 内部其它天体(主要行星 + 黑市 + 小行星 + 碎片带) */
  bodies: SystemBody[];
}
