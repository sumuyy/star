/**
 * 游戏初始化工具
 * 负责开局变量写入和开局介绍楼层创建
 *
 * 基础 MVU 操作已下沉到 mvuAccess.ts
 * 本文件专注于：初始状态构建、开局楼层创建、变量初始化流程
 */

import { OpeningFormData, GameState, PerspectiveType } from '../types';
import { INITIAL_GAME_STATE } from '../data';
import { checkAndUpdateChronicle } from './chronicleUpdater';
import {
  MvuData,
  MessageId,
  hasStatDataContent,
  getLatestAssistantMessageId,
  getWritableMessageId,
  getMvuDataWithFallback,
  writeMvuToFloor,
} from './mvuAccess';

declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user'; hide_state?: 'all' | 'hidden' | 'unhidden' },
): Array<{ message: string; message_id: number }>;
declare function getLastMessageId(): number;
declare function createChatMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; message: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;

const isCreatingOpening = { current: false };

// ---------------------------------------------------------------------------
// GameState → MVU stat_data 构建（中文路径映射）
// ---------------------------------------------------------------------------

function buildStarMvuData(formData: OpeningFormData, baseData: MvuData = { stat_data: {}, display_data: {}, delta_data: {} }): MvuData {
  const initialState = buildInitialGameState(formData);
  const baseStat = baseData.stat_data || {};

  // 把 GameState 拆到 变量.txt 中已经定义好的中文路径，而不是塞回 stat_data.star.gameState
  const xiumin = {
    ...(baseStat['金珉锡'] || {}),
    体内平衡度: initialState.xiumin.hp,
    异能输出: initialState.xiumin.power,
    责任值: initialState.xiumin.responsibility,
    好感度: initialState.xiumin.affection,
    当前FC状态: initialState.security.fcStatus,
    装备与武装: {
      ...((baseStat['金珉锡'] || {})['装备与武装'] || {}),
      机甲展开态: initialState.security.gearDeployState,
    },
  };

  const max = {
    ...(baseStat['沈昌珉'] || {}),
    显像: {
      ...((baseStat['沈昌珉'] || {})['显像'] || {}),
      算力占用率: 100 - initialState.max.computation,
    },
    系统权限: {
      ...((baseStat['沈昌珉'] || {})['系统权限'] || {}),
      盲区覆盖率: initialState.max.leak,
      覆写权限: initialState.max.override,
    },
  };

  const enemy = {
    ...(baseStat['敌对势力监控'] || {}),
    Uknow警觉度: initialState.alerts.uknowAlert,
    Nexus暴露值: initialState.alerts.nexusExposure,
  };

  return {
    ...baseData,
    stat_data: {
      ...baseStat,
      ['金珉锡']: xiumin,
      ['沈昌珉']: max,
      ['敌对势力监控']: enemy,
      // 仍然保留 star.* 兜底：
      //   - meta 用于追踪初始化时间/难度/起始地点
      //   - currentChoices 还没在 变量.txt 里定义路径
      star: {
        ...(baseStat.star || {}),
        meta: {
          ...((baseStat.star || {}).meta || {}),
          initializedAt: new Date().toISOString(),
          difficulty: formData.difficulty,
          openingLocation: formData.openingLocation,
        },
        gameState: {
          ...((baseStat.star || {}).gameState || {}),
          // 仅保留 React 端兜底依赖的两个字段，其余从 中文路径 反推
          perspective: initialState.perspective,
          currentChoices: initialState.currentChoices,
        },
      },
    },
    display_data: baseData.display_data || {},
    delta_data: baseData.delta_data || {},
  };
}

// ---------------------------------------------------------------------------
// 对外 API
// ---------------------------------------------------------------------------

/**
 * 构建初始 GameState
 */
export function buildInitialGameState(formData: OpeningFormData): GameState {
  const base: GameState = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
  base.perspective = formData.startingPerspective;
  base.alerts.uknowAlert = formData.initialThreatLevel;
  base.security.gearDeployed = false;
  base.currentChoices = [
    '执行【冷降温】异能压制：降低异能输出并微弱回复体内平衡度',
    '向沈昌珉（Max）AI节点发送算力请求：请求侵入前方监控网络进行瞒报遮蔽',
    '利用FC高脉冲手枪物理摧毁本层电磁坐标极柱',
  ];
  return base;
}

/**
 * 初始化游戏变量（写入当前可继承楼层）
 */
export async function initializeGameVariables(formData: OpeningFormData): Promise<boolean> {
  try {
    const targetMessageId = getWritableMessageId();
    const baseData = await getMvuDataWithFallback();
    const nextData = buildStarMvuData(formData, baseData);

    await writeMvuToFloor(nextData, targetMessageId);

    console.log(`✅ [star gameInitializer] 成功初始化 ${targetMessageId} 层游戏变量`);
    return true;
  } catch (error) {
    console.error('❌ [star gameInitializer] 初始化游戏变量失败:', error);
    return false;
  }
}

/**
 * 创建开局介绍楼层（1层）
 */
export async function createOpeningStoryMessage(formData: OpeningFormData): Promise<boolean> {
  if (isCreatingOpening.current) {
    console.log('⚠️ [star gameInitializer] 正在创建开局楼层，跳过重复调用');
    return false;
  }

  try {
    isCreatingOpening.current = true;

    const perspectiveName = formData.startingPerspective === 'xiumin' ? '金珉锡' : '沈昌珉';
    const locationName = formData.openingLocation || '冰核废墟重组堆';
    const threatText =
      formData.difficulty === 'nightmare'
        ? '噩梦级'
        : formData.difficulty === 'hard'
          ? '高压级'
          : '普通级';

    const maintext = `<maintext>
【战术通信恢复。正在读取双向锚点状态。】

当前的境况有些糟糕，${perspectiveName}。你此刻正位于 ${locationName}，全区已进入 ${threatText} 追捕警戒。

${
      formData.startingPerspective === 'xiumin'
        ? '你的体内平衡度正在往肉体崩溃边缘滑落，而追捕你们的人形兵器 Uknow 已经启动了绝对物理定位。沈昌珉的黑市瞒报网络仍在燃烧，他必须释放主核编译功率来覆写这片星河的监测盲区。'
        : '你作为沈昌珉，正在黑市瞒报网络深处为金珉锡争取生存窗口。Nexus 主网的高频脉冲已经扫过三个相邻扇区，Uknow 的蜂群正在逼近你们唯一的落点坐标。你必须在金珉锡的冰壳心理防线崩溃前完成系统覆写。'
    }

请你做出第一个战术决策。
</maintext>`;

    const option = `<option>
A. 执行【冷降温】异能压制：降低异能输出并微弱回复体内平衡度
B. 向沈昌珉（Max）AI节点发送算力请求：请求侵入前方监控网络进行瞒报遮蔽
C. 利用FC高脉冲手枪物理摧毁本层电磁坐标极柱
</option>`;

    const sum = `<sum>${perspectiveName}在${locationName}启动战术通信，Uknow与Nexus的追捕已开始，玩家即将做出第一个生存决策。</sum>`;

    const message = `${maintext}\n\n${sum}\n\n${option}`;

    const baseData = await getMvuDataWithFallback();
    const openingData = buildStarMvuData(formData, baseData);

    await createChatMessages(
      [
        {
          role: 'assistant',
          message,
          data: openingData,
        },
      ],
      { refresh: 'none' },
    );

    const openingMessageId = getLastMessageId();
    if (hasStatDataContent(openingData.stat_data)) {
      try {
        await writeMvuToFloor(openingData, openingMessageId);
      } catch (error) {
        console.warn('⚠️ [star gameInitializer] 开局楼层 MVU 写回失败，已保留消息 data 字段:', error);
      }
    }

    // 编年史更新：重试 3 次，间隔递增
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        await checkAndUpdateChronicle({ messageId: openingMessageId });
        break;
      } catch (err) {
        console.warn(`⚠️ [star gameInitializer] 编年史更新失败，重试 ${attempt + 1}/3:`, err);
      }
    }

    console.log(`✅ [star gameInitializer] 成功创建开局介绍楼层（${openingMessageId}层）`);
    return true;
  } catch (error) {
    console.error('❌ [star gameInitializer] 创建开局介绍楼层失败:', error);
    return false;
  } finally {
    isCreatingOpening.current = false;
  }
}

/**
 * 根据表单数据和当前楼层情况判断是否需要重新初始化
 * 用于读档后恢复初始状态
 */
export async function resetGameState(
  formData: Partial<OpeningFormData> & { startingPerspective: PerspectiveType },
): Promise<boolean> {
  return initializeGameVariables({
    startingPerspective: formData.startingPerspective,
    difficulty: formData.difficulty || 'normal',
    openingLocation: formData.openingLocation || '冰核废墟重组堆',
    initialThreatLevel: formData.initialThreatLevel ?? 30,
  });
}
