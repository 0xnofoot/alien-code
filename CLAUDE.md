# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是 Alien Code CLI（原 Claude Code）的可构建源码仓库，基于 2026-03-31 从 Anthropic npm 包泄露的源码。本仓库在原始泄露源码基础上完成了构建流程修复与私有依赖剥离，可以脱离 Anthropic 内部基础设施独立编译运行。

**技术栈**: TypeScript (strict) + React/Ink + Bun 打包 + Zod 4

## 关键约束

### 必须使用 Bun 1.2.x

**强制要求**: 构建必须使用 Bun 1.2.x（如 1.2.15），不能使用 1.3.x 或更高版本。

Bun 1.3.x 的 bundler 存在 module 初始化顺序 bug，会导致运行时错误 `Hz is not defined`。已在本地验证 1.2.15 可以正常工作。

### 每次修改源码后必须重新构建

源码位于 `src/` 目录，构建产物是 `package/alien-code.js`。**任何修改 src/ 下文件的操作之后，必须立即运行构建命令**：

```bash
cd /Users/toofonwang/Downloads/claude-code
bun run build.ts
```

如需开发模式（不压缩，带 source map）：

```bash
bun run build.ts --dev
```

## 常用命令

### 构建
```bash
# 生产构建
VERSION=2.1.88 bun run build.ts

# 开发构建（无压缩，带 sourcemap）
VERSION=2.1.88 bun run build.ts --dev
```

### 运行
```bash
# 验证构建（无需 Node.js，直接运行二进制）
./package/alien-code --version

# 使用（需要 API key）
ANTHROPIC_API_KEY=sk-ant-xxx ./package/alien-code --print "你好"
```

### 类型检查
```bash
bun run typecheck
```

## 架构概述

### 核心引擎

- **main.tsx**: CLI 入口，Commander.js 解析 + React/Ink 渲染初始化。启动时并行预取 MDM settings、keychain、GrowthBook 以加快启动
- **QueryEngine.ts** (~46K 行): LLM API 调用核心引擎，处理流式响应、tool-call 循环、thinking mode、重试逻辑、token 计数
- **Tool.ts**: 所有工具的基础类型和接口定义，包括输入 schema、权限模型、进度状态
- **commands.ts**: 所有斜杠命令的注册和执行管理

### 工具系统 (src/tools/)

所有工具都是独立模块，每个工具定义 schema、权限模型和执行逻辑。主要工具包括：

- **BashTool**: Shell 命令执行
- **FileReadTool**: 文件读取（支持图片、PDF、Jupyter notebooks）
- **FileWriteTool**: 文件创建/覆盖
- **FileEditTool**: 部分文件修改（字符串替换）
- **GlobTool**: 文件模式匹配搜索
- **GrepTool**: 基于 ripgrep 的内容搜索
- **AgentTool**: 子 Agent 生成
- **MCPTool**: MCP 服务器工具调用
- **LSPTool**: Language Server Protocol 集成
- **WebFetchTool/WebSearchTool**: Web 抓取和搜索

### 命令系统 (src/commands/)

用户可通过 `/` 前缀调用的斜杠命令，重要命令包括：

- `/commit`: 创建 git commit
- `/compact`: 上下文压缩
- `/llm-source`: 切换 Anthropic/OpenAI 提供商（类型为 `local-jsx`）
- `/mcp`: MCP 服务器管理
- `/config`: 设置管理
- `/tasks`: 任务管理
- `/memory`: 持久化内存管理

**注意**: `/login` 和 `/logout` 已被移除（依赖 Anthropic 内部 OAuth 服务）

### 服务层 (src/services/)

- **api/**: Anthropic API client、文件 API、引导服务
  - **openaiProxy.ts**: OpenAI 兼容层，拦截 Anthropic SDK fetch 调用，将请求/响应转换为 OpenAI format
  - **client.ts**: API client 工厂，根据 `llmProvider` 创建 Anthropic SDK 实例或注入 OpenAI proxy fetch
- **mcp/**: Model Context Protocol 服务器连接和管理
- **lsp/**: Language Server Protocol 管理器
- **compact/**: 对话上下文压缩
- **analytics/**: Feature flags（本 fork 已替换为空实现）

### LLM 提供商切换 (OpenAI 兼容接口)

项目支持切换到 OpenAI 兼容的 API 端点：

- **配置文件**: `src/utils/llmProvider.ts` - 提供商配置和运行时状态管理
- **代理层**: `src/services/api/openaiProxy.ts` - 在 fetch 层拦截，转换 Anthropic ↔ OpenAI 格式
- **切换命令**: `src/commands/llm-source/` - `/llm-source` 命令 UI

配置优先级：`settings.json "llm-source".{provider}.xxx` → 环境变量 → 默认值

支持的环境变量：
- `OPENAI_BASE_URL`: OpenAI 兼容端点（默认 `https://api.openai.com/v1`）
- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: 默认模型

### Bridge 系统 (src/bridge/)

IDE 扩展（VS Code、JetBrains）与 CLI 的双向通信层：
- **bridgeMain.ts**: Bridge 主循环
- **bridgeMessaging.ts**: 消息协议
- **jwtUtils.ts**: JWT 认证

### 权限系统 (src/hooks/toolPermission/)

每次工具调用前检查权限，根据配置的权限模式（`default`、`plan`、`bypassPermissions`、`auto` 等）提示用户批准/拒绝或自动解析。

### Feature Flags

通过 Bun 的 `bun:bundle` feature flags 实现死代码消除。源码中通过 `feature('FLAG_NAME')` 调用的条件分支在打包阶段被折叠消除。

当前启用的主要标志：`BRIDGE_MODE`、`FORK_SUBAGENT`、`BUILTIN_EXPLORE_PLAN_AGENTS`、`MCP_SKILLS`、`BASH_CLASSIFIER`、`ULTRATHINK`、`TOKEN_BUDGET`、`HISTORY_PICKER`、`REACTIVE_COMPACT`、`HOOK_PROMPTS`

## 构建系统详解

构建入口是 `build.ts`，使用 Bun.build() API 将整个 TS 项目打包为单一 ESM 文件。

### 关键插件

1. **js-to-ts-abs**: `.js` 扩展名 → `.ts` 文件解析（TypeScript ESM 约定）
2. **src-alias**: `src/*` 绝对路径解析
3. **explicit-stubs**: 内部私有包 → `stubs/` 目录替换
4. **auto-stub-missing**: 其余缺失模块 → 空实现兜底

### Stub 替换

Anthropic 内部包通过 `stubs/` 目录的替代实现覆盖：

| 原始包 | Stub 路径 | 说明 |
|--------|-----------|------|
| `@ant/claude-for-chrome-mcp` | `stubs/@ant/claude-for-chrome-mcp/` | Chrome 集成（空实现） |
| `@ant/computer-use-mcp` | `stubs/@ant/computer-use-mcp/` | 计算机使用 MCP（空实现） |
| `color-diff-napi` | `stubs/color-diff-napi/` | 重定向到 TS 纯实现 |
| `bun:bundle` | `stubs/bun-bundle/` | `feature()` DCE 函数（运行时返回 false） |
| `bun:ffi` | `stubs/bun-ffi/` | Bun FFI API（空实现） |

### Feature Flag DCE

`build.ts` 将 `featureFlags` 映射表中的所有标志注入为编译时常量（`$$bunfeature_XXX`）。源码中 `feature('FLAG_NAME')` 的条件分支在打包阶段被完全折叠消除。

### Bun DCE Bug 修复

Bun 处理 `void import('./devtools.js')` 时会生成无效语法 `Promise.resolve().then(() => )`，`build.ts` 用正则自动修复为 `Promise.resolve()`。

## 已知问题与修复

### normalizeMessages 崩溃

**问题**: `normalizeMessages` 缺少 `default` 分支，未知消息类型导致 `undefined` 进入数组，`isNotEmptyMessage` 崩溃。

**修复位置**: `src/utils/messages.ts`
- 添加 `default: return []` 分支
- 添加 null 检查

### /llm-source 命令类型

命令类型必须为 `local-jsx`（不是 `local`），实现文件为 `.tsx`。

## 开发注意事项

### 模块导入约定

- 源码中所有 import 使用 `.js` 扩展名（TypeScript ESM 约定），但磁盘文件是 `.ts`/`.tsx`
- 大量使用 `src/services/...` 形式的绝对 import（非相对路径）
- 构建插件自动处理路径解析

### 私有依赖处理

本 fork 已剥离的 Anthropic 内部依赖：
- Datadog 上报代码
- 第一方遥测代码
- GrowthBook（替换为返回默认值的空实现）
- OAuth 登录流程（依赖内部 OAuth 服务器）
- 清理了全库 1,083 处 `logEvent` 调用、199 处 GrowthBook feature flag 调用

### 保留的核心功能

以下功能完整保留：
- `ANTHROPIC_API_KEY` → API 调用链路
- 所有 40+ 工具
- 所有斜杠命令（login/logout 除外）
- MCP 服务器集成
- 子 Agent 与多 Agent 协调
- Skill 系统
- IDE 桥接
- 权限系统、Hook 系统

## 故障排查

### 构建报 "File not found" 错误

检查缺失文件是否在 `stubs/` 中有对应条目，或在 `build.ts` 的 `EXPLICIT_STUBS` 中补充映射。

### 运行时报 "Cannot find module"

构建产物是 ESM 格式，需要 Node.js 18+：
```bash
node --version  # 需要 v18+
```

### `--print` 模式挂起不退出

确认使用的是本 fork 的构建产物（已修复 sandbox 退出问题）。

### Bun 版本问题

如遇 `Hz is not defined` 或其他运行时初始化错误：
```bash
bun --version  # 必须是 1.2.x，不能是 1.3.x
```

## 文件路径约定

添加新功能时：
- 工具：`src/tools/NewTool/`
- 命令：`src/commands/new-command/`
- 服务：`src/services/newService/`
- 工具和命令都需要注册到 `tools.ts` 或 `commands.ts`

## 自定义修改

### 图标更改

终端图标已从原始的 "Clawd" 替换为绿色滑板外星人（Alien Skater）：
- **修改文件**: `src/components/LogoV2/Clawd.tsx`（重写 ASCII art）
- **颜色**: `src/utils/theme.ts` - `clawd_body` 改为绿色 `rgb(102,204,102)`
- **原始图片**: `assets/icon.jpg`
- **详细文档**: 参见 `ICON_CHANGE.md`

环境变量 `CLAUDE_SIMPLE_LOGO=true` 可切换到简化版 ASCII art。

## 相关资源

- 问题反馈：https://github.com/anthropics/claude-code/issues
- 原始泄露发现者：[@Fried_rice](https://x.com/Fried_rice/status/2038894956459290963)
