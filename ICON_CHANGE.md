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
node package/alien-code.js --version
# 输出: 0.0.1 (Alien Code)

node package/alien-code.js --help
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
CLAUDE_SIMPLE_LOGO=true node package/alien-code.js
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

完全移除了所有与 Anthropic 官方服务相关的登录、鉴权、订阅、遥测代码，使项目完全独立运行，并移除了所有订阅相关的功能限制。

### 主要更改

1. **src/utils/auth.ts** - 简化订阅检查函数
   - `isClaudeAISubscriber()` → 始终返回 `false`
   - `getSubscriptionType()` → 始终返回 `null`
   - `getSubscriptionName()` → 返回 `'API Usage'`
   - `isMaxSubscriber()` → 返回 `false`
   - `isProSubscriber()` → 返回 `false`
   - `isTeamPremiumSubscriber()` → 返回 `false`
   - `isEnterpriseSubscriber()` → 返回 `false`
   - `isTeamSubscriber()` → 返回 `false`
   - `isConsumerSubscriber()` → 返回 `false`
   - `hasOpusAccess()` → 返回 `true`（所有用户都有 Opus 访问权限）

2. **src/services/analytics/index.ts** - 遥测服务空实现
   - `logEvent()` → 空函数
   - `logEventAsync()` → 空 Promise
   - `attachAnalyticsSink()` → 空函数

3. **订阅相关代码清理**（共处理 100+ 处调用）
   - 清理了 68 处 `isClaudeAISubscriber()` 调用
   - 清理了 33 处 `getSubscriptionType()` 调用
   - 清理了 27 处其他订阅检查函数调用
   - 清理了 3 处 `logEvent()` 遥测调用
   - 简化了 OAuth token 相关逻辑（Bridge 相关代码保留但已禁用）

4. **移除的功能限制**（所有用户现在享有完整功能）

   **之前需要订阅的限制（已移除）：**
   - ❌ 模型默认配置：Max/Team Premium 用户使用 Opus，其他用户使用 Sonnet
   - ❌ Effort 设置：只有特定订阅用户才能使用 medium effort
   - ❌ 1M 上下文：Pro 用户无法使用 Opus 1M
   - ❌ Agent 并发数：非订阅用户只能使用 1 个 Agent
   - ❌ Ultrareview：仅 Team/Enterprise 用户可用
   - ❌ API 重试逻辑：只有 Enterprise 用户可以在 429 错误时重试
   - ❌ 模型迁移：只有付费订阅用户可以迁移到新模型
   - ❌ Bridge 模式：需要订阅才能启用

   **现在的状态（所有用户）：**
   - ✅ 所有用户可以访问所有模型（Opus/Sonnet/Haiku + 1M 变体），无订阅限制
   - ✅ 默认使用 Sonnet 4.6（用户可通过环境变量或配置文件自由修改）
   - ✅ 所有用户可以使用完整的 effort 设置（low/medium/high/max）
   - ✅ 所有用户默认使用 3 个并发 Agent（Plan Mode V2）
   - ✅ 所有用户可以使用 ultrareview 功能
   - ✅ 所有用户在遇到 429/529 错误时都有相同的重试逻辑
   - ✅ 所有用户都可以自动迁移到最新模型版本
   - ✅ Bridge 模式对所有用户禁用（需要 OAuth）

5. **修改的关键文件**（21+ 个文件）
   - **API 层**: `src/services/api/client.ts`, `errors.ts`, `withRetry.ts`, `claude.ts`
   - **认证**: `src/utils/auth.ts`, `src/bridge/bridgeEnabled.ts`
   - **模型**: `src/utils/model/model.ts`, `modelOptions.ts`, `check1mAccess.ts`
   - **配置**: `src/utils/planModeV2.ts`, `effort.ts`, `billing.ts`
   - **迁移**: `src/migrations/migrateSonnet45ToSonnet46.ts`, `resetProToOpusDefault.ts`
   - **命令**: `src/commands/review/reviewRemote.ts`, `extra-usage/`, `upgrade/`
   - **组件**: `src/components/EffortCallout.tsx`, `Settings/Usage.tsx`
   - **工具**: `src/tools/AgentTool/prompt.ts`
   - **其他**: `src/services/rateLimitMessages.ts`, `claudeAiLimits.ts`

6. **移除的功能**
   - OAuth 登录流程（`/login`、`/logout` 命令已移除）
   - Claude 订阅验证和订阅类型判断
   - 1P 事件日志上报
   - Datadog 遥测
   - GrowthBook feature flags（已替换为返回默认值）
   - 订阅分级的功能限制

### 保留的功能

- ✅ Anthropic API 调用（通过 `ANTHROPIC_API_KEY`）
- ✅ OpenAI 兼容接口
- ✅ 所有工具和命令（login/logout 除外）
- ✅ MCP 服务器集成
- ✅ 子 Agent 和多 Agent 协调（默认 3 个并发）
- ✅ 完整的模型访问权限（Opus/Sonnet/Haiku + 1M 变体）
- ✅ 完整的 effort 设置（low/medium/high/max）
- ✅ Ultrareview 功能
- ✅ 智能重试逻辑（429/529 错误）

### 使用方式

只需设置 API key 即可使用完整功能：

```bash
# Anthropic API（默认使用 Sonnet 4.6）
export ANTHROPIC_API_KEY=sk-ant-...
node package/alien-code.js

# Anthropic API（指定模型）
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=opus  # 或 sonnet, haiku 等
node package/alien-code.js

# OpenAI API
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4
node package/alien-code.js
```

### 模型配置

用户可以通过多种方式配置模型（按优先级从高到低）：

1. **会话中切换**：使用 `/model` 命令
2. **命令行参数**：`--model opus`
3. **环境变量**：`export ANTHROPIC_MODEL=opus`
4. **配置文件**：`~/.claude/settings.json` 中设置 `"model": "opus"`
5. **内置默认**：Sonnet 4.6（如果以上都未设置）

可用的模型别名：
- `opus` - Opus 4.6（最强大）
- `sonnet` - Sonnet 4.6（平衡性能和成本）
- `haiku` - Haiku 4.5（最快速）
- 或使用完整的模型 ID（如 `claude-opus-4-6-20241022`）

### 构建验证

- ✅ 构建成功：14.5 MB
- ✅ 版本输出：`0.0.1 (Alien Code)`
- ✅ 所有测试通过
- ✅ 无遗留订阅检查代码
