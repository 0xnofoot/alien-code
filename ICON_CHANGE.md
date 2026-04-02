# Alien Code 定制化更改说明

本文档记录了从原始 Claude Code 源码到 Alien Code 的所有定制化修改。

## 品牌更名

项目已从 "Claude Code" 更名为 **"Alien Code"**，以配合新的滑板外星人主题。

### 修改的文件

**品牌名称**：
- `src/entrypoints/cli.tsx` - 版本输出（`--version`）
- `src/main.tsx` - 帮助信息描述
- `src/components/LogoV2/WelcomeV2.tsx` - 欢迎界面标题
- `src/components/LogoV2/LogoV2.tsx` - Logo 边框标题
- `src/components/LogoV2/CondensedLogo.tsx` - 精简 Logo 标题
- `src/components/LogoV2/feedConfigs.tsx` - Feed 配置文本
- `src/components/HelpV2/HelpV2.tsx` - 帮助界面标题
- `README.md` - 项目标题和描述
- `CLAUDE.md` - 项目文档
- `build.ts` - 构建脚本输出

**验证**：
```bash
node package/new-claude.js --version
# 输出: 0.0.1 (Alien Code)

node package/new-claude.js --help
# 显示: Alien Code - starts an interactive session...
```

# 图标更改说明

## 新图标

Alien Code（原 Claude Code）的终端图标已从原始的 "Clawd" 角色替换为**滑板外星人**（Alien Skater）设计。

### 原始图片

![Alien Skater](assets/icon.jpg)

## 实现详情

### 修改的文件

1. **src/components/LogoV2/Clawd.tsx**
   - 重写了 ASCII art 图案，使用 Unicode 块字符绘制外星人滑板形象
   - 支持多种姿势：`default`、`ollie`、`look-left`、`look-right`、`arms-up`
   - 为 Apple Terminal 提供简化的 fallback 版本

2. **src/utils/theme.ts**
   - 将 `clawd_body` 颜色从橙色 `rgb(215,119,87)` 改为绿色 `rgb(102,204,102)`
   - 滑板使用粉色（`pink_FOR_SUBAGENTS_ONLY`）

3. **assets/icon.jpg**
   - 保存了原始图标图片用于文档展示

### 新的 ASCII Art 设计

```
  ▗▄◉▄▖     ← 外星人头部（绿色）
 ▐█████▌    ← 外星人身体（绿色）
 ╱▔═══▔╲   ← 滑板（粉色）
```

### 姿势变化

- **default**: 标准姿势，外星人站在滑板上
- **ollie**: 做 ollie 动作（滑板腾空）
- **look-left/right**: 眼睛看向左/右
- **arms-up**: 双臂举起（跳跃时）

## 如何恢复原图标

如果需要恢复原始的 Clawd 图标，可以使用 git 恢复：

```bash
git checkout HEAD -- src/components/LogoV2/Clawd.tsx src/utils/theme.ts
bun run build.ts
```

## 颜色自定义

可以通过修改 `src/utils/theme.ts` 中的颜色值来自定义外观：

```typescript
// 修改外星人颜色（所有主题）
clawd_body: 'rgb(102,204,102)',  // 绿色

// 修改滑板颜色（使用现有的 pink 颜色）
pink_FOR_SUBAGENTS_ONLY: 'rgb(219,39,119)',
```

修改后需要重新构建：
```bash
bun run build.ts
```

## 环境变量

设置 `CLAUDE_SIMPLE_LOGO=true` 可以使用简化版 ASCII art（仅使用基础 ASCII 字符）：

```bash
CLAUDE_SIMPLE_LOGO=true node package/new-claude.js
```

## LLM 提供商动态显示

移除了硬编码的 "Sonnet 4.5 · API Usage Billing" 显示，改为动态显示当前配置的 LLM 提供商信息。

### 修改的文件

1. **src/utils/logoV2Utils.ts**
   - `getLogoDisplayData()` 函数：根据 `llm-source` 配置动态生成 `billingType`
   - 支持 Anthropic API 和 OpenAI API 的 base_url 显示

2. **src/utils/model/model.ts**
   - `renderModelName()` 函数：根据 provider 返回实际配置的模型名称
   - OpenAI provider 显示 OpenAI 模型名（如 gpt-4）
   - Anthropic API 显示配置的 Anthropic 模型名

### 显示效果

**Anthropic API（默认）**：
```
Sonnet 4.5 · Anthropic API · api.anthropic.com
```

**Anthropic API（自定义 base_url）**：
```
Opus 4.6 · Anthropic API · custom.example.com
```

**OpenAI 提供商**：
```
gpt-4 · OpenAI API · api.openai.com
```

### 配置方式

通过 `~/.claude/settings.json` 中的 `llm-source` 配置：

```json
{
  "llm-source": {
    "current": "openai",
    "openai": {
      "base_url": "https://api.openai.com/v1",
      "api_key": "sk-...",
      "model": "gpt-4"
    }
  }
}
```

或通过环境变量：
```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

## Anthropic 官方服务移除

移除了所有与 Anthropic 官方服务相关的登录、鉴权、订阅、遥测代码，使项目完全独立运行。

### 主要更改

1. **src/utils/auth.ts** - 简化订阅检查函数
   - `isClaudeAISubscriber()` → 始终返回 `false`
   - `getSubscriptionType()` → 始终返回 `null`
   - `getSubscriptionName()` → 返回 `'API Usage'`
   - `isMaxSubscriber()` → 返回 `false`
   - `isProSubscriber()` → 返回 `false`
   - `isTeamPremiumSubscriber()` → 返回 `false`

2. **src/services/analytics/index.ts** - 遥测服务空实现
   - `logEvent()` → 空函数
   - `logEventAsync()` → 空 Promise
   - `attachAnalyticsSink()` → 空函数

3. **移除的功能**
   - OAuth 登录流程（`/login`、`/logout` 命令已移除）
   - Claude 订阅验证
   - 1P 事件日志上报
   - Datadog 遥测
   - GrowthBook feature flags（已替换为返回默认值）

### 保留的功能

- ✅ Anthropic API 调用（通过 `ANTHROPIC_API_KEY`）
- ✅ OpenAI 兼容接口
- ✅ 所有工具和命令（login/logout 除外）
- ✅ MCP 服务器集成
- ✅ 子 Agent 和多 Agent 协调

### 使用方式

只需设置 API key 即可使用：

```bash
# Anthropic API
export ANTHROPIC_API_KEY=sk-ant-...
node package/new-claude.js

# OpenAI API
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4
node package/new-claude.js
```
