/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 星图静态数据。
 *   - WORLDBOOK_NAME 指向角色卡绑定的世界书("星空"),所有 worldbook.entry 路径均与该世界书内的条目名一一对应。
 *   - Layer 0(LAYER0_NODES): 联邦星图节点,6 个星系 + 2 个边缘星球。
 *   - Layer 1(STAR_SYSTEMS): 每个星系的内部图,恒星 + 主要行星 + 黑市流浪星(只显编号) + 边缘小行星。
 *   - 占位字段:
 *       - F/N/R/S/G 五颗恒星名世界书未给,用 `F-Star` 这种 placeholder。
 *       - 待填空行星本期不做(用户决定先把现有 + 恒星放上)。
 *   - 几何说明:
 *       - Layer 0 使用世界书方位角 + 分级距离:F 最远,N 最近,R/S/G 依次加远;KTC/冰雪星球为隐藏边缘点。
 *       - EX 星系理论位于 T-S 主轴过 S 后向 R 方向偏 45° 的远端(屏幕方位 225°),出界,本数据不收录。
 *       - R15 碎裂带在 R 星系内部图中朝 EX 方向(orbit=mid,贴近最外)。
 */

import type { StarMapNode, StarSystem } from "./types";

export const WORLDBOOK_NAME = "星空";

/* -------------------------------------------------------------------------
 * Layer 0: 联邦星图(8 个节点)
 * ------------------------------------------------------------------------- */

export const LAYER0_NODES: StarMapNode[] = [
  // 原点 = T 星系恒星 Hotus 所在,代表 T 星系本身
  {
    id: "T",
    kind: "system",
    label: "T 星系",
    isOrigin: true,
    danger: "LOW",
    summary: "权力中枢 / 联邦星图原点 · 恒星赫特斯",
    worldbook: { entry: "世界观/区域/T星系/总览" },
    systemId: "T",
  },
  {
    id: "F",
    kind: "system",
    label: "F 星系",
    angleDeg: 0,
    radius: 190,
    danger: "MED",
    summary: "工业脊梁 / 0° 基准方向 · 主星瓦伦德 · 联邦星图最远主节点",
    worldbook: { entry: "世界观/区域/F星系/总览" },
    systemId: "F",
  },
  {
    id: "N",
    kind: "system",
    label: "N 星系",
    angleDeg: 60,
    radius: 118,
    danger: "HIGH",
    summary: "科技幻境 / NCT 大本营 · 含隐形辅星瑟斯塔 · 距 Hotus 最近",
    // N 星系总览以塞索拉为枢纽
    worldbook: { entry: "世界观/区域/N星系/塞索拉/总览" },
    systemId: "N",
  },
  {
    id: "R",
    kind: "system",
    label: "R 星系",
    angleDeg: 140,
    radius: 142,
    danger: "CRITICAL",
    summary: "暗能边疆 / AI 盲区 · 法外之地",
    worldbook: { entry: "世界观/区域/R星系/总览" },
    systemId: "R",
  },
  {
    id: "S",
    kind: "system",
    label: "S 星系",
    angleDeg: 200,
    radius: 158,
    danger: "MED",
    summary: "生命镜像 / 双子星 · 生命科学镜像星域",
    worldbook: { entry: "世界观/区域/S星系/总览" },
    systemId: "S",
  },
  {
    id: "G",
    kind: "system",
    label: "G 星系",
    angleDeg: 250,
    radius: 174,
    danger: "LOW",
    summary: "享乐天国 / 垂直阶级 · 主星帕提拉",
    worldbook: { entry: "世界观/区域/G星系/帕提拉/总览" },
    systemId: "G",
  },
  // 边缘星球:完全脱离引力,不归任何星系,无系统连线
  {
    id: "KTC",
    kind: "rogue",
    label: "KTC",
    angleDeg: 125,
    radius: 80,
    danger: "MED",
    summary: "边缘星球 · KTC 临时藏身据点(T 边缘,临 R)",
    worldbook: { entry: "世界观/区域/边缘星球/KTC临时据点" },
  },
  {
    id: "ICEFIELD",
    kind: "rogue",
    label: "冰雪星球",
    angleDeg: 155,
    radius: 190,
    danger: "HIGH",
    summary: "边缘星球 · 永冻冰原 · CHEN 机甲「雷蝎」埋藏地",
    worldbook: { entry: "世界观/区域/边缘星球/极光带7号星" },
  },
];

/* -------------------------------------------------------------------------
 * Layer 0 连线
 *   - Hotus 辐射 5 条到各星系
 *   - 现有的 wallend↔n / r↔g 两条横向连线保留(之前 TopologyMap 已有)
 *   - 边缘星球(KTC / ICEFIELD)不参与连线
 * ------------------------------------------------------------------------- */

export const LAYER0_LINKS: Array<[string, string]> = [
  ["T", "F"],
  ["T", "N"],
  ["T", "R"],
  ["T", "S"],
  ["T", "G"],
  ["F", "N"],
  ["R", "G"],
];

/* -------------------------------------------------------------------------
 * Layer 1: 星系内部图
 *   - orbit: core/inner/mid/outer/edge,渲染层据此决定半径
 *   - angleDeg: 在星系内部图圆环上的方位角,留空则均分
 *   - 双子星(瑞菲弥亚 ↔ 维奥普斯)用 twinOf 互指
 * ------------------------------------------------------------------------- */

export const STAR_SYSTEMS: StarSystem[] = [
  /* ===================== T 星系 · 权力中枢 ===================== */
  {
    id: "T",
    nickname: "权力中枢",
    star: {
      id: "T-star",
      kind: "star",
      label: "赫特斯",
      nameStatus: "confirmed",
      orbit: "core",
      danger: "LOW",
      summary: "T 星系恒星,高度戴森球化,联邦能源源泉",
      worldbook: { entry: "世界观/区域/T星系/赫特斯" },
    },
    bodies: [
      {
        id: "T-trianglel",
        kind: "planet",
        label: "特里安格尔",
        nameStatus: "confirmed",
        orbit: "inner",
        danger: "CRITICAL",
        summary: "联邦心脏 · 议会与红主服务器所在",
        worldbook: { entry: "世界观/区域/T星系/特里安格尔" },
      },
      {
        id: "T-brongris",
        kind: "planet",
        label: "伯朗格瑞斯",
        nameStatus: "confirmed",
        orbit: "inner",
        danger: "HIGH",
        summary: "军方测试场 · 寡头机甲角斗场",
        worldbook: { entry: "世界观/区域/T星系/伯朗格瑞斯" },
      },
      {
        id: "T-t03",
        kind: "asteroid",
        label: "T03",
        nameStatus: "confirmed",
        orbit: "outer",
        danger: "MED",
        summary: "外围荒芜小行星 · 青龙/火凤 隐藏地",
        worldbook: { entry: "世界观/区域/T星系/T03" },
      },
    ],
  },

  /* ===================== F 星系 · 工业脊梁 ===================== */
  {
    id: "F",
    nickname: "工业脊梁",
    star: {
      id: "F-star",
      kind: "star",
      label: "F-Star",
      nameStatus: "placeholder",
      orbit: "core",
      danger: "MED",
      summary: "F 星系恒星(占位,世界书未命名)",
    },
    bodies: [
      {
        id: "F-noctforge",
        kind: "planet",
        label: "诺克弗格",
        nameStatus: "confirmed",
        orbit: "inner",
        danger: "HIGH",
        summary: "重型机甲锻造基地 · 等离子尾焰昼夜不息",
        worldbook: { entry: "世界观/区域/F星系/诺克弗格" },
      },
      {
        id: "F-wallend",
        kind: "planet",
        label: "瓦伦德",
        nameStatus: "confirmed",
        orbit: "inner",
        danger: "MED",
        summary: "工业精密组件 · 0° 基准星 · 走私者渗透首选",
        worldbook: { entry: "世界观/区域/F星系/瓦伦德" },
      },
      {
        id: "F-redrust",
        kind: "planet",
        label: "赤铁星",
        nameStatus: "confirmed",
        orbit: "outer",
        danger: "HIGH",
        summary: "联邦流放地 · 3G 重力监狱 · 第 9 区 EX 异象",
        worldbook: { entry: "世界观/区域/F星系/赤铁星" },
      },
      {
        id: "F-H1",
        kind: "blackmarket",
        label: "F-H1",
        nameStatus: "confirmed",
        orbit: "edge",
        danger: "CRITICAL",
        summary: "黑市据点 · 军工重器拍卖",
        worldbook: { entry: "世界观/区域/黑市/F-H1" },
      },
    ],
  },

  /* ===================== N 星系 · 科技幻境 ===================== */
  {
    id: "N",
    nickname: "科技幻境",
    star: {
      id: "N-star",
      kind: "star",
      label: "N-Star",
      nameStatus: "placeholder",
      orbit: "core",
      danger: "MED",
      summary: "N 星系恒星(占位,世界书未命名)",
    },
    bodies: [
      {
        id: "N-saesola",
        kind: "planet",
        label: "塞索拉",
        nameStatus: "confirmed",
        orbit: "inner",
        danger: "HIGH",
        summary: "联邦科技心脏 · NCT 大本营 · SYNK 数据海",
        worldbook: { entry: "世界观/区域/N星系/塞索拉/总览" },
      },
      {
        id: "N-thirsta",
        kind: "planet",
        label: "瑟斯塔",
        nameStatus: "redacted",
        orbit: "outer",
        danger: "CRITICAL",
        summary: "隐形辅星 · 坐标抹除 · ae-aespa 镀金鸟笼",
        worldbook: { entry: "世界观/区域/N星系/瑟斯塔/第三层_瑟斯塔" },
        redacted: true,
      },
      {
        id: "N-H2",
        kind: "blackmarket",
        label: "N-H2",
        nameStatus: "confirmed",
        orbit: "edge",
        danger: "CRITICAL",
        summary: "黑市据点 · 科技禁忌拍卖",
        worldbook: { entry: "世界观/区域/黑市/N-H2" },
      },
    ],
  },

  /* ===================== R 星系 · 暗能边疆 ===================== */
  {
    id: "R",
    nickname: "暗能边疆",
    star: {
      id: "R-star",
      kind: "star",
      label: "R-Star",
      nameStatus: "placeholder",
      orbit: "core",
      danger: "HIGH",
      summary: "R 星系恒星(占位,可能本身已部分异常态)",
    },
    bodies: [
      {
        id: "R-cosmia",
        kind: "planet",
        label: "科斯弥亚",
        nameStatus: "confirmed",
        orbit: "inner",
        danger: "HIGH",
        summary: "R 星系名义首都 · 暗能潮汐观测 · 流亡者枢纽",
        worldbook: { entry: "世界观/区域/R星系/科斯弥亚" },
      },
      {
        id: "R-r15",
        kind: "debris",
        label: "R15 碎裂带",
        nameStatus: "confirmed",
        orbit: "mid",
        // 朝向 EX 方向(屏幕方位 225°,即 R 星系内偏外的位置)
        angleDeg: 225,
        danger: "CRITICAL",
        summary: "EX 战争终局遗址 · 行星碎片 + 空间裂缝 · EXO 失散原点",
        worldbook: { entry: "世界观/区域/R星系/R15碎裂带" },
      },
    ],
  },

  /* ===================== S 星系 · 生命镜像 ===================== */
  {
    id: "S",
    nickname: "生命镜像",
    star: {
      id: "S-star",
      kind: "star",
      label: "S-Star",
      nameStatus: "placeholder",
      orbit: "core",
      danger: "LOW",
      summary: "S 星系恒星(占位,白色冷光)",
    },
    bodies: [
      // 双子星:同一轨道带 inner,角度对称(0° / 180°)
      {
        id: "S-refemia",
        kind: "planet",
        label: "瑞菲弥亚",
        nameStatus: "confirmed",
        orbit: "inner",
        angleDeg: 0,
        danger: "CRITICAL",
        summary: "联邦最高级生命科学中心 · 地下七层囚禁 Suho",
        worldbook: { entry: "世界观/区域/S星系/瑞菲弥亚" },
        twinOf: "S-vyops",
      },
      {
        id: "S-vyops",
        kind: "planet",
        label: "维奥普斯",
        nameStatus: "confirmed",
        orbit: "inner",
        angleDeg: 180,
        danger: "MED",
        summary: "联邦文化艺术之都 · 镜像对应总急诊室位",
        worldbook: { entry: "世界观/区域/S星系/维奥普斯" },
        twinOf: "S-refemia",
      },
      {
        id: "S-s36",
        kind: "asteroid",
        label: "S36",
        nameStatus: "confirmed",
        orbit: "edge",
        danger: "HIGH",
        summary: "边缘废星 · 闪耀石(雪狼/沧溟纠缠态)发掘地",
        worldbook: { entry: "世界观/区域/S星系/S36" },
      },
      {
        id: "S-H3",
        kind: "blackmarket",
        label: "S-H3",
        nameStatus: "confirmed",
        orbit: "edge",
        danger: "CRITICAL",
        summary: "黑市据点 · 生命美学拍卖",
        worldbook: { entry: "世界观/区域/黑市/S-H3" },
      },
    ],
  },

  /* ===================== G 星系 · 享乐天国 ===================== */
  {
    id: "G",
    nickname: "享乐天国",
    star: {
      id: "G-star",
      kind: "star",
      label: "G-Star",
      nameStatus: "placeholder",
      orbit: "core",
      danger: "LOW",
      summary: "G 星系恒星(占位,世界书未命名)",
    },
    bodies: [
      {
        id: "G-patila",
        kind: "planet",
        label: "帕提拉",
        nameStatus: "confirmed",
        orbit: "inner",
        danger: "HIGH",
        summary: "G 星系主星 · 欲望都市 · 顶层 EXO 据点赫利俄斯",
        worldbook: { entry: "世界观/区域/G星系/帕提拉/总览" },
      },
      {
        id: "G-helivo",
        kind: "planet",
        label: "赫利沃",
        nameStatus: "confirmed",
        orbit: "outer",
        danger: "LOW",
        summary: "G 星系辅星 · 顶级权贵后花园 · 真食特供",
        worldbook: { entry: "世界观/区域/G星系/赫利沃" },
      },
      {
        id: "G-H4",
        kind: "blackmarket",
        label: "G-H4",
        nameStatus: "confirmed",
        orbit: "edge",
        danger: "CRITICAL",
        summary: "黑市据点 · 感官禁品拍卖",
        worldbook: { entry: "世界观/区域/黑市/G-H4" },
      },
    ],
  },
];

/* -------------------------------------------------------------------------
 * 工具函数
 * ------------------------------------------------------------------------- */

/** 根据 systemId 找 Layer 1 星系内部图 */
export function getStarSystem(id: string): StarSystem | undefined {
  return STAR_SYSTEMS.find(s => s.id === id);
}

/** 根据 Layer 0 节点 id 找节点定义 */
export function getLayer0Node(id: string): StarMapNode | undefined {
  return LAYER0_NODES.find(n => n.id === id);
}
