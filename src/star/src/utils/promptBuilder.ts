/**
 * Prompt 构建工具
 * 负责构建 LLM 请求的 prompt、格式化 UpdateVariable 命令、处理消息标签
 */

import { GameState, StoryOption } from '../types';
import { parseMaintext, parseOptions, removeThinkingTags } from './messageParser';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractTag(message: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches = [...message.matchAll(regex)];
  if (matches.length === 0) return '';
  return (matches[matches.length - 1][1] || '').trim();
}

/**
 * 提取 <UpdateVariable> 标签内容
 */
export function extractUpdateVariable(message: string): string {
  return extractTag(message, 'UpdateVariable');
}

/**
 * 提取 <option> 标签内容并规范化
 */
export function normalizeOptionBlock(message: string, fallbackChoices: string[]): string {
  const rawOption = extractTag(message, 'option');
  if (rawOption) return rawOption;

  const parsedOptions = parseOptions(message);
  if (parsedOptions.length > 0) {
    return parsedOptions.map(option => `${option.id}. ${option.text}`).join('\n');
  }

  return fallbackChoices.map((choice, index) => `${String.fromCharCode(65 + index)}. ${choice}`).join('\n');
}

/**
 * 构建 fallback 的 UpdateVariable 命令
 * 当 LLM 未输出 <UpdateVariable> 时使用
 */
export function buildFallbackUpdateVariable(gameState: GameState, choices: string[]): string {
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

/**
 * 构建玩家行动请求的完整 Prompt
 */
export function buildRequestPrompt(request: {
  type: 'option' | 'custom';
  content: string;
  gameState: GameState;
}): string {
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

/**
 * 从流式输出中提取正在生成的 maintext 内容
 */
export function getStreamingMaintext(message: string): string {
  const cleaned = removeThinkingTags(message);
  const match = cleaned.match(/<maintext[^>]*>([\s\S]*?)(?:<\/maintext>|$)/i) ?? cleaned.match(/<scene[^>]*>([\s\S]*?)(?:<\/scene>|$)/i);
  return match?.[1]?.trim() || '';
}
