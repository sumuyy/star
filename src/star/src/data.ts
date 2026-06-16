/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState } from "./types";

export const INITIAL_GAME_STATE: GameState = {
  perspective: "xiumin",
  spaceTime: {
    galaxy: "未知",
    planet: "未知",
    region: "未知",
    spot: "未知",
    time: {
      year: 2380,
      month: 1,
      day: 1,
      phase: "未知",
      hour: 0,
      minute: 0,
    },
    tactical: {
      securityLevel: "未知",
      interference: "无特殊干扰",
      terrain: "暂无详细地形数据",
    },
  },
  plot: {
    mainProgress: "未知",
    currentObjective: "未知",
    hasLocator: false,
  },
  systemStatuses: [],
  xiumin: {
    hp: 50, // 体内平衡度（默认与变量.txt prefault 对齐）
    power: 0, // 异能输出
    responsibility: 80, // 责任值
    affection: 0, // 对 Max 的好感度
    idleMode: "压制", // power=0 时的姿态，由剧情判定
  },
  max: {
    computation: 100, // 100 - 算力占用率（默认占用为 0）
    leak: 85, // 盲区覆盖率
    override: 100, // 覆写权限
    coreCompiledStage: "隐秘注视", // 衍生：冰晶链接阶段 默认值
  },
  alerts: {
    uknowAlert: 0,
    nexusExposure: 0,
  },
  security: {
    fcStatus: "HC",
    gearDeployed: false,
    gearDeployState: "遗失",
    accessories: [],
    backpack: [
      { name: "黑市HC手环", count: 1, description: "HC编码: HC-CNK-707" },
    ],
    disguise: {
      name: "戴斯蒙德（已注销）",
      role: "科员（已注销）",
      registeredSystem: "N星系（已注销）",
      registrationId: "HC-CNK-707",
    },
    maxExposed: false,
  },
  teammates: [
    {
      id: "边伯贤",
      name: "边伯贤",
      status: "在场",
      currentMove: "正在执行任务",
      awakening: "光",
      liberation: "第三阶段",
      fcState: "稳定",
      disguise: "练习生",
      mechMove: "待机中",
      backlash: 23,
      location: "首尔",
    },
    {
      id: "金俊勉",
      name: "金俊勉",
      status: "离场",
      currentMove: "返回基地途中",
      awakening: "水",
      liberation: "第二阶段",
      fcState: "稳定",
      disguise: "社长",
      mechMove: "移动中",
      backlash: 15,
      location: "京畿道",
    },
    {
      id: "朴灿烈",
      name: "朴灿烈",
      status: "离场",
      currentMove: "掩护平民撤离",
      awakening: "火",
      liberation: "第四阶段",
      fcState: "过载",
      disguise: "制作人",
      mechMove: "战斗中",
      backlash: 67,
      location: "仁川",
    },
    {
      id: "张艺兴",
      name: "张艺兴",
      status: "失联",
      currentMove: "信号中断",
      awakening: "治愈",
      liberation: "未知",
      fcState: "未知",
      disguise: "未知",
      mechMove: "未知",
      backlash: -1,
      location: "未知",
    },
  ],
  bonds: [
    {
      id: "李马克",
      name: "李马克",
      gender: "未知",
      attitude: "陌生",
      attitudeBucket: "中立",
      status: "未知",
      location: "未知",
      move: "未知",
      faction: "未知",
      identity: "未知",
      affinity: 0,
      trait: "暂无情报",
      recent: "未知",
    },
    {
      id: "Key",
      name: "Key",
      gender: "未知",
      attitude: "陌生",
      attitudeBucket: "中立",
      status: "未知",
      location: "未知",
      move: "未知",
      faction: "未知",
      identity: "未知",
      affinity: 0,
      trait: "暂无情报",
      recent: "未知",
    },
    {
      id: "泰民",
      name: "泰民",
      gender: "未知",
      attitude: "陌生",
      attitudeBucket: "中立",
      status: "未知",
      location: "未知",
      move: "未知",
      faction: "未知",
      identity: "未知",
      affinity: 0,
      trait: "暂无情报",
      recent: "未知",
    },
  ],
  // 暗网帖子统一从 mvu `暗网论坛数据.帖子列表` 读取（见 utils/variableReader.ts），此处不再保留写死样本
  posts: [],
  forumMeta: {
    platform: "HOT_暗网",
    section: "未知分区",
    snapshot: "未知",
  },
  logs: [
    { id: "l1", timestamp: "10:01:02", source: "SYS", message: "星系状态拓扑图同步握手已完成，连接锚点[Sector 93-Glacier-Ring]" },
    { id: "l2", timestamp: "10:01:45", source: "MAX", message: "核心编译启动，算力池充盈，暗网隐蔽隐跳算法（Aegis-v4）部署完毕..." },
    { id: "l3", timestamp: "10:02:10", source: "XIUMIN", message: "冰壳心理屏障能消耗指数 1.831%，异能共鸣频率正在向零下180度偏折" },
    { id: "l4", timestamp: "10:03:00", source: "WARN", message: "Nexus主动探测流溢出！Uknow巡逻节点坐标更新，距离当前落点 15.4 光秒" }
  ],
  chatHistory: [
    {
      id: "c1",
      sender: "system",
      text: "【战术通信恢复。正在读取双向锚点状态。】\n\n当前的境况有些糟糕，金珉锡。你的体内平衡度正在往肉体崩溃边缘滑落，而追捕我们的人形兵器 - Uknow 已经启动了绝对物理定位。沈昌珉（Max），你需要释放主核编译功率来瞒报和覆写这片星河的监测盲区。我们必须在精神被Nexus碾碎之前，逃离这里。",
      timestamp: "10:01:00",
      perspective: "xiumin"
    }
  ],
  currentChoices: [
    "执行【冷降温】异能压制：降低异能输出并微弱回复体内平衡度",
    "向沈昌珉（Max）AI节点发送算力请求：请求侵入前方监控网络进行瞒报遮蔽",
    "利用FC高脉冲手枪物理摧毁本层电磁坐标极柱"
  ]
};
