# 双视角科幻生存文字 RPG 与战术终端

`star` 是一个酒馆助手前端界面项目，用于在 SillyTavern/酒馆助手环境中运行双视角科幻生存文字 RPG。

## 功能

- 开局表单：初始化视角、追捕难度、起始星区和 Uknow 警觉度
- MVU 变量：将游戏状态写入并读取 `stat_data.star.gameState`
- 消息标签：从 assistant 楼层解析 `<maintext>`、`<option>`、`<sum>` 和 `<UpdateVariable>`
- 统一请求：玩家选择或自定义行动会创建 user 楼层、调用酒馆生成、创建 assistant 楼层并携带 MVU 数据
- 编年史：将 LLM 回复中的 `<sum>` 按轮次编号同步到当前角色卡绑定世界书的“编年史”条目

## 本地构建

在仓库根目录运行：

```bash
pnpm build:dev
```

生产构建：

```bash
pnpm build
```

构建产物由仓库的 webpack 配置处理，并以内联前端界面的形式供酒馆助手使用。
