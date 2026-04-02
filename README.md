# Alien Code — 可构建源码（基于 2026-03-31 泄露版本）

<p align="center">
  <img src="assets/icon.jpg" alt="Alien Skater Logo" width="200"/>
</p>

> **2026 年 3 月 31 日，Anthropic 的 Claude Code CLI 完整源码通过 npm 包中暴露的 `.map` 文件泄露。**
> 本 fork 在原始泄露源码基础上完成了构建流程修复与私有依赖剥离，使其可以脱离 Anthropic 内部基础设施独立编译运行。

---

## 源码来源

[Chaofan Shou (@Fried_rice)](https://x.com/Fried_rice) 发现了该泄露并公开发布：

> **"Claude code source code has been leaked via a map file in their npm registry!"**
>
> — [@Fried_rice, March 31, 2026](https://x.com/Fried_rice/status/2038894956459290963)

npm 包中的 source map 文件包含了指向完整未混淆 TypeScript 源码的引用，可从 Anthropic 的 R2 存储桶下载为 zip 压缩包。

---

## 概览

Alien Code（原 Claude Code）是 Anthropic 的官方 CLI 工具，允许用户直接在终端与 Claude 交互，完成软件工程任务——编辑文件、执行命令、搜索代码库、管理 Git 工作流等。

- **泄露日期**: 2026-03-31
- **语言**: TypeScript（strict 模式）
- **构建运行时**: Bun
- **终端 UI**: React + [Ink](https://github.com/vadimdemedes/ink)
- **规模**: ~1,900 文件，512,000+ 行代码

---

## Directory Structure

```
src/
├── main.tsx                 # Entrypoint (Commander.js-based CLI parser)
├── commands.ts              # Command registry
├── tools.ts                 # Tool registry
├── Tool.ts                  # Tool type definitions
├── QueryEngine.ts           # LLM query engine (core Anthropic API caller)
├── context.ts               # System/user context collection
├── cost-tracker.ts          # Token cost tracking
│
├── commands/                # Slash command implementations (~50)
├── tools/                   # Agent tool implementations (~40)
├── components/              # Ink UI components (~140)
├── hooks/                   # React hooks
├── services/                # External service integrations
├── screens/                 # Full-screen UIs (Doctor, REPL, Resume)
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
│
├── bridge/                  # IDE integration bridge (VS Code, JetBrains)
├── coordinator/             # Multi-agent coordinator
├── plugins/                 # Plugin system
├── skills/                  # Skill system
├── keybindings/             # Keybinding configuration
├── vim/                     # Vim mode
├── voice/                   # Voice input
├── remote/                  # Remote sessions
├── server/                  # Server mode
├── memdir/                  # Memory directory (persistent memory)
├── tasks/                   # Task management
├── state/                   # State management
├── migrations/              # Config migrations
├── schemas/                 # Config schemas (Zod)
├── entrypoints/             # Initialization logic
├── ink/                     # Ink renderer wrapper
├── buddy/                   # Companion sprite (Easter egg)
├── native-ts/               # Native TypeScript utils
├── outputStyles/            # Output styling
├── query/                   # Query pipeline
└── upstreamproxy/           # Proxy configuration
```

---

## 构建指南

### 前置要求

| 工具 | 版本要求 | 用途 |
|------|----------|------|
| [Bun](https://bun.sh) | **1.2.x** | 构建器（打包 + TypeScript 编译） |
| Node.js | 18+ | 运行构建产物 |

> ⚠️ **重要**: 必须使用 Bun 1.2.x（如 1.2.15），**不能使用 1.3.x 或更高版本**。Bun 1.3.x 的 bundler 存在 module 初始化顺序 bug，会导致运行时错误 `Hz is not defined`。

> 构建过程**仅**需要 Bun；运行产物仅需要 Node.js，无需 Bun。

### 快速开始

```bash
# 1. 克隆仓库
git clone <repo-url>
cd claude-code

# 2. 安装依赖
bun install

# 3. 生产构建（输出到 package/alien-code.js）
VERSION=2.1.88 bun run build.ts

# 4. 验证构建产物
node package/alien-code.js --version
# → 2.1.88 (Alien Code)

# 5. 使用 Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxx node package/alien-code.js --print "你好"

# 或使用 OpenAI 兼容接口
OPENAI_API_KEY=sk-xxx OPENAI_BASE_URL=https://api.openai.com/v1 \
  node package/alien-code.js /llm-source  # 在交互模式中切换
```

### 开发构建

开发模式不进行代码压缩，并生成 source map 便于调试：

```bash
VERSION=2.1.88 bun run build.ts --dev
```

### 构建系统详解

构建入口是 `build.ts`，使用 **Bun 的原生打包 API**（`Bun.build()`）将整个 TypeScript 项目打包为单一 ESM 文件。

#### 构建流程

```
src/entrypoints/cli.tsx          ← 构建入口
        ↓
  Bun.build() 插件管道
        ↓
  ┌─────────────────────────────────┐
  │  Plugin 1: js-to-ts-abs        │  .js 扩展名 → .ts 文件解析
  │  Plugin 2: src-alias           │  src/* 绝对路径解析
  │  Plugin 3: explicit-stubs      │  内部私有包 → stubs/ 替换
  │  Plugin 4: auto-stub-missing   │  其余缺失模块 → 空实现
  └─────────────────────────────────┘
        ↓
  Feature Flag DCE（死代码消除）
        ↓
  Bun DCE 产物修复（语法修补）
        ↓
package/alien-code.js            ← 最终产物（~15 MB ESM）
```

#### 插件 1：`js-to-ts-abs` — .js → .ts 路径重写

源码中所有模块 import 均使用 `.js` 扩展名（TypeScript 的 ESM 约定），但磁盘上的实际文件是 `.ts`。该插件在解析阶段将 `foo.js` → `foo.ts`（或 `foo/index.ts`）。

#### 插件 2：`src-alias` — 绝对路径别名

源码中大量使用 `src/services/...` 形式的绝对 import（非相对路径）。该插件将其解析为 `<项目根>/src/services/...`，同时完成 `.js` → `.ts` 的扩展名重写。

#### 插件 3：`explicit-stubs` — 私有包替换

Anthropic 内部包在公共 npm 上不存在，构建时用 `stubs/` 目录下的替代实现覆盖：

| 原始包 | Stub 文件 | 说明 |
|--------|-----------|------|
| `@ant/claude-for-chrome-mcp` | `stubs/@ant/claude-for-chrome-mcp/` | Chrome 集成（空实现） |
| `@ant/computer-use-mcp` | `stubs/@ant/computer-use-mcp/` | 计算机使用 MCP（空实现） |
| `@ant/computer-use-input` | `stubs/@ant/computer-use-input/` | 输入控制（空实现） |
| `@ant/computer-use-swift` | `stubs/@ant/computer-use-swift/` | macOS Swift 桥接（空实现） |
| `color-diff-napi` | `stubs/color-diff-napi/` | 重定向到同仓库 TS 纯实现 |
| `audio-capture-napi` | `stubs/audio-capture-napi/` | 音频捕获（空实现） |
| `modifiers-napi` | `stubs/modifiers-napi/` | 键盘修饰键（空实现） |
| `bun:bundle` | `stubs/bun-bundle/` | `feature()` DCE 函数（运行时返回 `false`） |
| `bun:ffi` | `stubs/bun-ffi/` | Bun FFI API（空实现） |

#### 插件 4：`auto-stub-missing` — 缺失模块兜底

对于 `stubs/` 中没有显式配置的其余缺失内部模块，自动注入一个通用空 stub：

```typescript
export default ""
export const name = ""
export const description = ""
export const prompt = ""
```

#### Feature Flag 死代码消除（DCE）

`build.ts` 将 `featureFlags` 映射表中的所有标志注入为编译时常量（`$$bunfeature_XXX`）。源码中通过 `feature('FLAG_NAME')` 调用的条件分支在打包阶段被彻底折叠消除：

```typescript
// 源码
const voiceCmd = feature('VOICE_MODE') ? require('./voice/index.js') : null

// VOICE_MODE = false → 打包后完全消除，不包含 voice 相关代码
```

当前启用的主要 Feature Flag（`true`）：

| Flag | 功能 |
|------|------|
| `BRIDGE_MODE` | IDE 桥接（VS Code / JetBrains） |
| `FORK_SUBAGENT` | 子 Agent 分叉 |
| `BUILTIN_EXPLORE_PLAN_AGENTS` | 内置 Explore / Plan Agent |
| `MCP_SKILLS` | MCP Skill 系统 |
| `MCP_RICH_OUTPUT` | MCP 富文本输出 |
| `BASH_CLASSIFIER` | Bash 命令分类器 |
| `ULTRATHINK` | 扩展思考模式 |
| `TOKEN_BUDGET` | Token 预算控制 |
| `HISTORY_PICKER` | 历史会话选择器 |
| `REACTIVE_COMPACT` | 响应式上下文压缩 |
| `HOOK_PROMPTS` | Hook 系统 |

#### Bun DCE 产物修复

Bun 的死代码消除在处理 `void import('./devtools.js')` 形式的惰性动态 import 时存在 Bug，会生成语法无效的 JS：

```javascript
// Bun DCE Bug 产物（无效语法）
Promise.resolve().then(() => )

// build.ts 修复后
Promise.resolve()
```

`build.ts` 在写入文件前用正则表达式自动修复该问题。

### 本 Fork 相对原始泄露版本的改动

原始泄露源码无法直接构建，本 fork 做了以下修改：

#### 构建修复
- 添加 `build.ts` 构建脚本（原始版本依赖 Anthropic 内部构建系统）
- 添加 `stubs/` 目录替换私有 npm 包
- 修复 `--print` 模式永久挂起问题（sandbox 进程未退出）

#### 私有依赖剥离
- 删除 `src/services/analytics/datadog.ts` 等 Datadog 上报代码
- 删除 `src/services/analytics/firstPartyEventLogger.ts` 等 1P 遥测代码
- 将 `src/services/analytics/growthbook.ts` 替换为返回默认值的空实现（GrowthBook 需要 Anthropic 内部服务）
- 将 `src/services/analytics/index.ts` 的 `logEvent()` 替换为空实现
- 删除 `src/commands/login/` 和 `src/commands/logout/`（OAuth 流程依赖 Anthropic 内部 OAuth 服务器）
- 清理全库 1,083 处 `logEvent` 调用、199 处 GrowthBook feature flag 调用

#### 保留的核心功能
以下功能**完整保留**，未做任何修改：
- `ANTHROPIC_API_KEY` → `getAnthropicApiKey()` → `getAuthHeaders()` → Anthropic SDK → API 调用
- **OpenAI 兼容接口**：通过 fetch 层代理实现 Anthropic ↔ OpenAI 格式转换（`src/services/api/openaiProxy.ts`）
- 所有 40+ 工具（BashTool、FileReadTool、GrepTool、AgentTool 等）
- 所有斜杠命令（`/commit`、`/review`、`/compact`、`/llm-source` 等，login/logout 除外）
- MCP 服务器集成
- 子 Agent 与多 Agent 协调
- Skill 系统
- IDE 桥接（VS Code / JetBrains）
- 权限系统、Hook 系统

### 故障排查

**构建报 `File not found` 错误**

检查缺失文件是否在 `stubs/` 中有对应条目，或在 `build.ts` 的 `EXPLICIT_STUBS` 中补充映射。

**运行时报 `Cannot find module`**

构建产物是 ESM 格式，需要 Node.js 18+：
```bash
node --version  # 需要 v18+
```

**运行时报 `Hz is not defined` 或初始化错误**

检查 Bun 版本，确保使用 1.2.x：
```bash
bun --version  # 必须是 1.2.x，不能是 1.3.x
```

如果已安装 1.3.x，需要降级到 1.2.15：
```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.15"

# 或使用 npm
npm install -g bun@1.2.15
```

**`--print` 模式挂起不退出**

确认使用的是本 fork 的构建产物（已修复 sandbox 退出问题）。

---

## OpenAI 兼容接口

本 fork 保留了完整的 OpenAI 兼容接口功能，允许使用任何 OpenAI 格式的 API 端点（包括 OpenAI、Azure OpenAI、本地模型等）。

### 架构

- **配置管理**: `src/utils/llmProvider.ts` - 提供商切换和配置读取
- **格式转换**: `src/services/api/openaiProxy.ts` - 在 fetch 层拦截 Anthropic SDK 请求，透明转换为 OpenAI chat/completions 格式
- **用户界面**: `src/commands/llm-source/` - `/llm-source` 交互式切换命令

### 配置方式

有三种方式配置 OpenAI 端点：

#### 1. 环境变量（临时）

```bash
export OPENAI_API_KEY="sk-xxx"
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_MODEL="gpt-4"

node package/alien-code.js
```

#### 2. 配置文件（持久化）

编辑 `~/.claude/settings.json`：

```json
{
  "llm-source": {
    "current": "openai",
    "openai": {
      "base_url": "https://api.openai.com/v1",
      "api_key": "sk-xxx",
      "model": "gpt-4",
      "max_tokens": 4096
    }
  }
}
```

#### 3. 交互式命令（推荐）

运行 `/llm-source` 命令在 UI 中切换提供商，配置会自动保存到用户设置。

### 支持的端点

理论上支持任何 OpenAI chat/completions 格式的端点：
- OpenAI 官方 API
- Azure OpenAI
- 本地 LLM 服务（Ollama、LM Studio、vLLM 等）
- 第三方兼容服务

### 配置优先级

`settings.json "llm-source".{provider}.xxx` → 环境变量 → 默认值

---

## 目录结构

### 1. Tool System (`src/tools/`)

Every tool Claude Code can invoke is implemented as a self-contained module. Each tool defines its input schema, permission model, and execution logic.

| Tool | Description |
|---|---|
| `BashTool` | Shell command execution |
| `FileReadTool` | File reading (images, PDFs, notebooks) |
| `FileWriteTool` | File creation / overwrite |
| `FileEditTool` | Partial file modification (string replacement) |
| `GlobTool` | File pattern matching search |
| `GrepTool` | ripgrep-based content search |
| `WebFetchTool` | Fetch URL content |
| `WebSearchTool` | Web search |
| `AgentTool` | Sub-agent spawning |
| `SkillTool` | Skill execution |
| `MCPTool` | MCP server tool invocation |
| `LSPTool` | Language Server Protocol integration |
| `NotebookEditTool` | Jupyter notebook editing |
| `TaskCreateTool` / `TaskUpdateTool` | Task creation and management |
| `SendMessageTool` | Inter-agent messaging |
| `TeamCreateTool` / `TeamDeleteTool` | Team agent management |
| `EnterPlanModeTool` / `ExitPlanModeTool` | Plan mode toggle |
| `EnterWorktreeTool` / `ExitWorktreeTool` | Git worktree isolation |
| `ToolSearchTool` | Deferred tool discovery |
| `CronCreateTool` | Scheduled trigger creation |
| `RemoteTriggerTool` | Remote trigger |
| `SleepTool` | Proactive mode wait |
| `SyntheticOutputTool` | Structured output generation |

### 2. Command System (`src/commands/`)

User-facing slash commands invoked with `/` prefix.

| Command | Description |
|---|---|
| `/commit` | Create a git commit |
| `/review` | Code review |
| `/compact` | Context compression |
| `/llm-source` | Switch between Anthropic/OpenAI providers |
| `/mcp` | MCP server management |
| `/config` | Settings management |
| `/doctor` | Environment diagnostics |
| `/login` / `/logout` | 已移除（OAuth 依赖 Anthropic 内部服务） |
| `/memory` | Persistent memory management |
| `/skills` | Skill management |
| `/tasks` | Task management |
| `/vim` | Vim mode toggle |
| `/diff` | View changes |
| `/cost` | Check usage cost |
| `/theme` | Change theme |
| `/context` | Context visualization |
| `/pr_comments` | View PR comments |
| `/resume` | Restore previous session |
| `/share` | Share session |
| `/desktop` | Desktop app handoff |
| `/mobile` | Mobile app handoff |

### 3. Service Layer (`src/services/`)

| Service | Description |
|---|---|
| `api/` | Anthropic API client, file API, bootstrap |
| `api/openaiProxy.ts` | OpenAI 兼容层（fetch 层拦截和格式转换） |
| `api/client.ts` | API client 工厂（根据 provider 选择） |
| `mcp/` | Model Context Protocol server connection and management |
| `oauth/` | OAuth 2.0 authentication flow |
| `lsp/` | Language Server Protocol manager |
| `analytics/` | Feature flags（本 fork 已替换为空实现） |
| `plugins/` | Plugin loader |
| `compact/` | Conversation context compression |
| `policyLimits/` | Organization policy limits |
| `remoteManagedSettings/` | Remote managed settings |
| `extractMemories/` | Automatic memory extraction |
| `tokenEstimation.ts` | Token count estimation |
| `teamMemorySync/` | Team memory synchronization |

### 4. Bridge System (`src/bridge/`)

A bidirectional communication layer connecting IDE extensions (VS Code, JetBrains) with the Claude Code CLI.

- `bridgeMain.ts` — Bridge main loop
- `bridgeMessaging.ts` — Message protocol
- `bridgePermissionCallbacks.ts` — Permission callbacks
- `replBridge.ts` — REPL session bridge
- `jwtUtils.ts` — JWT-based authentication
- `sessionRunner.ts` — Session execution management

### 5. Permission System (`src/hooks/toolPermission/`)

Checks permissions on every tool invocation. Either prompts the user for approval/denial or automatically resolves based on the configured permission mode (`default`, `plan`, `bypassPermissions`, `auto`, etc.).

### 6. Feature Flags

Dead code elimination via Bun's `bun:bundle` feature flags:

```typescript
import { feature } from 'bun:bundle'

// Inactive code is completely stripped at build time
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

Notable flags: `PROACTIVE`, `KAIROS`, `BRIDGE_MODE`, `DAEMON`, `VOICE_MODE`, `AGENT_TRIGGERS`, `MONITOR_TOOL`

---

## Key Files in Detail

### `QueryEngine.ts` (~46K lines)

The core engine for LLM API calls. Handles streaming responses, tool-call loops, thinking mode, retry logic, and token counting.

### `Tool.ts` (~29K lines)

Defines base types and interfaces for all tools — input schemas, permission models, and progress state types.

### `commands.ts` (~25K lines)

Manages registration and execution of all slash commands. Uses conditional imports to load different command sets per environment.

### `main.tsx`

Commander.js-based CLI parser + React/Ink renderer initialization. At startup, parallelizes MDM settings, keychain prefetch, and GrowthBook initialization for faster boot.

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript (strict) |
| Terminal UI | [React](https://react.dev) + [Ink](https://github.com/vadimdemedes/ink) |
| CLI Parsing | [Commander.js](https://github.com/tj/commander.js) (extra-typings) |
| Schema Validation | [Zod v4](https://zod.dev) |
| Code Search | [ripgrep](https://github.com/BurntSushi/ripgrep) (via GrepTool) |
| Protocols | [MCP SDK](https://modelcontextprotocol.io), LSP |
| API | [Anthropic SDK](https://docs.anthropic.com) |
| Telemetry | OpenTelemetry + gRPC（本 fork 已剥离） |
| Feature Flags | GrowthBook（本 fork 已替换为编译时常量） |
| Auth | `ANTHROPIC_API_KEY` 环境变量 |

---

## Notable Design Patterns

### Parallel Prefetch

Startup time is optimized by prefetching MDM settings, keychain reads, and API preconnect in parallel — before heavy module evaluation begins.

```typescript
// main.tsx — fired as side-effects before other imports
startMdmRawRead()
startKeychainPrefetch()
```

### Lazy Loading

Heavy modules (OpenTelemetry ~400KB, gRPC ~700KB) are deferred via dynamic `import()` until actually needed.

### Agent Swarms

Sub-agents are spawned via `AgentTool`, with `coordinator/` handling multi-agent orchestration. `TeamCreateTool` enables team-level parallel work.

### Skill System

Reusable workflows defined in `skills/` and executed through `SkillTool`. Users can add custom skills.

### Plugin Architecture

Built-in and third-party plugins are loaded through the `plugins/` subsystem.

---

## 开发工作流

### 修改源码后的标准流程

⚠️ **重要**: 每次修改 `src/` 目录下的任何文件后，必须重新构建才能生效。

```bash
# 1. 修改源码
vim src/commands/example/index.ts

# 2. 重新构建
bun run build.ts

# 3. 测试
node package/alien-code.js --print "测试"
```

### 添加新功能

- **新工具**: 在 `src/tools/NewTool/` 创建，并在 `src/tools.ts` 注册
- **新命令**: 在 `src/commands/new-command/` 创建，并在 `src/commands.ts` 注册
- **新服务**: 在 `src/services/newService/` 创建

### 模块导入约定

- 所有 import 使用 `.js` 扩展名（TypeScript ESM 约定），磁盘文件是 `.ts`/`.tsx`
- 支持 `src/*` 绝对路径导入（不需要 `../../` 相对路径）
- 构建插件自动处理路径解析

### 常见修复

**修复了 `normalizeMessages` 崩溃**
- **位置**: `src/utils/messages.ts`
- **问题**: 缺少 `default` 分支导致 `undefined` 进入数组
- **修复**: 添加 `default: return []` 和 null 检查

**`/llm-source` 命令类型**
- **类型**: 必须为 `local-jsx`（不是 `local`）
- **文件**: 实现文件必须是 `.tsx`

---

## Disclaimer

本仓库归档了 **2026-03-31** 从 Anthropic npm 包中泄露的源码，并在此基础上进行了构建适配修改。所有原始源码的版权归 [Anthropic](https://www.anthropic.com) 所有。
