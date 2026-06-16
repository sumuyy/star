/**
 * 统一请求处理器（向后兼容层）
 *
 * 本文件已重构为薄兼容层，保持原有对外 API 不变。
 * 实际实现已拆分到以下模块：
 *
 * ┌─────────────────────┬──────────────────────────────────────────────┐
 * │ mvuAccess.ts        │ MVU 统一访问层：初始化、读取、写入、工具函数   │
 * ├─────────────────────┼──────────────────────────────────────────────┤
 * │ promptBuilder.ts    │ 构建 LLM 请求 Prompt、标签提取、流式内容提取   │
 * ├─────────────────────┼──────────────────────────────────────────────┤
 * │ mvuUpdater.ts       │ MVU 数据解析、消息重构、更新流程编排           │
 * ├─────────────────────┼──────────────────────────────────────────────┤
 * │ actionProcessor.ts  │ 玩家行动主流程控制（楼层创建 → generate → 写回）│
 * └─────────────────────┴──────────────────────────────────────────────┘
 *
 * 新代码请直接 import 对应模块，不建议继续依赖本文件的 re-export。
 */

// 类型重新导出
export type {
  StarRequestType,
  StarRequestData,
  StarRequestCallbacks,
} from './actionProcessor';

export type {
  MvuData,
} from './mvuAccess';

// 主要函数重新导出（保持向后兼容）
export { handleStarRequest } from './actionProcessor';

export {
  hasStatDataContent,
  detectGameStateUpdated,
} from './mvuAccess';

export {
  getBaseMvuData,
  rebuildFinalMessage,
  parseAndApplyMvuUpdate,
  writeMvuToFloor,
} from './mvuUpdater';

export {
  buildRequestPrompt,
  buildFallbackUpdateVariable,
  extractUpdateVariable,
  normalizeOptionBlock,
  getStreamingMaintext,
} from './promptBuilder';
