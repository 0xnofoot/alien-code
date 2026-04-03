# 空实现清单

本文档列出项目中所有被替换成空实现的部分，这些修改是为了将 Anthropic 内部代码转换为可独立构建的开源版本。

---

## 📋 目录

1. [Stub 替换的包](#stub-替换的包)
2. [遥测与分析系统](#遥测与分析系统)
3. [OAuth 登录系统](#oauth-登录系统)
4. [内部服务依赖](#内部服务依赖)
5. [运行时环境差异](#运行时环境差异)

---

## 1. Stub 替换的包

### 1.1 内部 Anthropic 包（@ant 命名空间）

#### `@ant/claude-for-chrome-mcp`
**位置**: `stubs/@ant/claude-for-chrome-mcp/index.ts`

**原始用途**: Chrome 浏览器集成的 MCP 服务器

**空实现内容**:
```typescript
export const BROWSER_TOOLS: unknown[] = []
export function createClaudeForChromeeMcpServer(_context): null
```

**影响范围**: Chrome 扩展功能不可用

---

#### `@ant/computer-use-mcp`
**位置**: `stubs/@ant/computer-use-mcp/index.ts`

**原始用途**: 计算机使用（Computer Use）MCP 服务器，允许 Claude 控制桌面

**空实现内容**:
```typescript
export const API_RESIZE_PARAMS: unknown = {}
export const targetImageSize: unknown = {}
export const DEFAULT_GRANT_FLAGS: unknown = {}
export const buildComputerUseTools: () => unknown[] = () => []
export function createComputerUseMcpServer(_context): null
```

**影响范围**: Computer Use 功能不可用（屏幕控制、鼠标键盘操作）

---

#### `@ant/computer-use-input`
**位置**: `stubs/@ant/computer-use-input/index.ts`

**原始用途**: 计算机使用的输入处理（鼠标、键盘）

**空实现内容**:
```typescript
export default {}
```

**影响范围**: Computer Use 输入处理不可用

---

#### `@ant/computer-use-swift`
**位置**: `stubs/@ant/computer-use-swift/index.ts`

**原始用途**: macOS 原生 Swift 绑定（用于 Computer Use）

**空实现内容**:
```typescript
export default {}
```

**影响范围**: macOS 原生 Computer Use 功能不可用

---

### 1.2 内部原生扩展（NAPI 模块）

#### `audio-capture-napi`
**位置**: `stubs/audio-capture-napi/index.ts`

**原始用途**: 音频捕获（用于语音模式）

**空实现内容**:
```typescript
// Stub for audio-capture-napi (internal native addon for voice mode)
export default {}
```

**影响范围**: 语音输入功能不可用

---

#### `modifiers-napi`
**位置**: `stubs/modifiers-napi/index.ts`

**原始用途**: 键盘修饰键检测（用于 Computer Use）

**空实现内容**:
```typescript
// Stub for modifiers-napi (internal native addon)
export default {}
```

**影响范围**: Computer Use 键盘修饰键检测不可用

---

#### `color-diff-napi`
**位置**: `stubs/color-diff-napi/index.ts`

**原始用途**: 颜色差异计算（Rust NAPI 模块）

**空实现内容**:
```typescript
// Redirect to pure TypeScript port
export * from '../../src/native-ts/color-diff/index.js'
```

**影响范围**: ✅ **有替代实现**，重定向到 `src/native-ts/color-diff/`（纯 TS 实现）

---

### 1.3 Bun 运行时 API

#### `bun:bundle`
**位置**: `stubs/bun-bundle/index.ts`

**原始用途**: Bun 的 feature flag DCE（死代码消除）

**空实现内容**:
```typescript
// Return false so all feature-gated code paths are disabled (safe default)
export function feature(_name: string): boolean {
  return false
}
```

**影响范围**: 
- 运行时所有 feature flag 返回 `false`
- 构建时通过 `build.ts` 的 `define` 功能注入真实值

---

#### `bun:ffi`
**位置**: `stubs/bun-ffi/index.ts`

**原始用途**: Bun 的 FFI（外部函数接口）

**空实现内容**:
```typescript
// Stub for bun:ffi — not available in Node.js runtime
export const dlopen = () => { 
  throw new Error('bun:ffi not available in Node.js') 
}
export const CString = class {}
export const ptr = () => 0
```

**影响范围**: FFI 功能在 Node.js 运行时不可用（仅在 Bun 运行时可用）

---

## 2. 遥测与分析系统

### 2.1 GrowthBook Feature Flags

**位置**: `src/services/analytics/growthbook.ts`

**原始实现**: 连接到 Anthropic 内部 GrowthBook 服务，动态获取 feature flags

**空实现内容**:
```typescript
// Telemetry disabled — all GrowthBook feature flags return defaults

export function hasGrowthBookEnvOverride(_feature: string): boolean {
  return false
}

export function getAllGrowthBookFeatures(): Record<string, unknown> {
  return {}
}

export async function initializeGrowthBook(): Promise<null> {
  return null
}

export function refreshGrowthBookAfterAuthChange(): void {}
export function resetGrowthBook(): void {}
export function setupPeriodicGrowthBookRefresh(): void {}
```

**影响范围**:
- 所有 feature flags 返回默认值
- 无法远程控制功能开关
- 需要在 `build.ts` 的 `featureFlags` 中硬编码启用的功能

**被清理的调用点**: 199 处

---

### 2.2 事件日志系统

**位置**: `src/services/analytics/index.ts`

**原始实现**: 发送遥测事件到 Datadog 和 Anthropic 内部日志系统

**空实现内容**:
```typescript
export function attachAnalyticsSink(_newSink: AnalyticsSink): void {}

export function logEvent(
  _eventName: string,
  _metadata: LogEventMetadata,
): void {}

export async function logEventAsync(
  _eventName: string,
  _metadata: LogEventMetadata,
): Promise<void> {}
```

**影响范围**:
- 无遥测数据上报
- 无使用统计
- 无错误追踪（需手动调试）

**被清理的调用点**: 1,083 处 `logEvent` / `logEventAsync` 调用

---

### 2.3 已删除的文件

**Datadog 上报**:
- `src/services/analytics/datadog.ts`
- `src/services/analytics/datadogInternal.ts`

**第一方遥测**:
- `src/services/analytics/firstPartyEventLogger.ts`
- `src/services/analytics/firstPartyEventLoggingExporter.ts`

**OpenTelemetry 集成**:
- 虽然依赖包 `@opentelemetry/*` 仍然存在，但实际导出器已被禁用

---

## 3. OAuth 登录系统

### 3.1 已删除的命令

**位置**: ~~`src/commands/login/`~~, ~~`src/commands/logout/`~~

**原始用途**: 
- `/login` - OAuth 2.0 登录流程
- `/logout` - 注销登录

**为何删除**: 依赖 Anthropic 内部 OAuth 服务器（`auth.anthropic.com`）

**影响范围**:
- 无法通过 OAuth 登录
- 必须使用 `ANTHROPIC_API_KEY` 环境变量
- 无法访问需要 OAuth token 的功能（组织管理等）

---

### 3.2 保留的 OAuth 代码

**位置**: `src/services/oauth/` 和相关文件

**状态**: 
- 代码结构保留
- 功能被空实现或跳过 OAuth 检查
- `src/commands/oauth-refresh/` 仍存在但无法正常工作

**影响**:
- 部分需要组织权限的功能（远程设置、团队管理）不可用
- API key 模式仍然完全可用

---

## 4. 内部服务依赖

### 4.1 设置同步服务

**位置**: `src/services/settingsSync/`

**原始用途**: 从 Anthropic 云端同步用户设置

**当前状态**: 
- 代码存在但连接被禁用
- 所有设置从本地 `settings.json` 读取

---

### 4.2 订阅检查

**原始用途**: 验证用户订阅状态（Pro/Team）

**当前状态**: 
- 订阅检查被移除
- 所有功能对所有用户开放

**相关 commit**:
```
6e96eb8b refactor: 完全移除订阅、OAuth、遥测相关代码并修复模型显示
```

---

### 4.3 远程管理设置

**位置**: `src/services/remoteManagedSettings/`

**原始用途**: 企业管理员远程控制用户设置

**当前状态**: 
- 代码存在但功能禁用
- 无法从云端推送策略

---

## 5. 运行时环境差异

### 5.1 构建时 vs 运行时

| 环境 | Feature Flags | FFI | Native Modules |
|------|---------------|-----|----------------|
| **Bun 构建时** | ✅ 真实值（build.ts define） | ✅ 可用 | ✅ 可编译 |
| **Node.js 运行时** | ❌ 全部 false（stub） | ❌ 抛出错误 | ❌ 被 stub 替换 |

---

### 5.2 平台特定功能

#### macOS 特定
- Swift 绑定（Computer Use） - **空实现**
- 原生屏幕控制 - **空实现**

#### Windows 特定
- Win32 API 绑定（Computer Use） - **空实现**

#### Linux 特定
- X11/Wayland 绑定（Computer Use） - **空实现**

---

## 6. 功能对照表

### ✅ 完全保留的功能

| 功能 | 状态 | 说明 |
|------|------|------|
| Anthropic API 调用 | ✅ 完整 | 通过 `ANTHROPIC_API_KEY` |
| OpenAI 兼容接口 | ✅ 完整 | `src/services/api/openaiProxy.ts` |
| 所有 40+ 工具 | ✅ 完整 | Bash, FileRead, Grep, Agent 等 |
| 斜杠命令 | ✅ 大部分 | 除了 /login, /logout |
| MCP 服务器 | ✅ 完整 | 公开的 MCP 实现 |
| 子 Agent 系统 | ✅ 完整 | 多 Agent 协调 |
| Skill 系统 | ✅ 完整 | 自定义技能 |
| IDE 桥接 | ✅ 完整 | VS Code / JetBrains |
| 权限系统 | ✅ 完整 | Tool permission 管理 |
| Hook 系统 | ✅ 完整 | 用户自定义钩子 |

---

### ❌ 不可用的功能

| 功能 | 状态 | 原因 |
|------|------|------|
| OAuth 登录 | ❌ 删除 | 依赖内部 OAuth 服务器 |
| Computer Use | ❌ 空实现 | 原生模块和 MCP 服务器被 stub |
| 语音模式 | ❌ 空实现 | 音频捕获模块被 stub |
| Chrome 集成 | ❌ 空实现 | 内部 MCP 服务器被 stub |
| 遥测上报 | ❌ 空实现 | Datadog 和内部日志被删除 |
| GrowthBook Flags | ❌ 空实现 | 依赖内部服务 |
| 设置同步 | ❌ 禁用 | 依赖内部服务 |
| 订阅检查 | ❌ 删除 | 依赖内部 API |
| 远程管理 | ❌ 禁用 | 依赖内部服务 |

---

### ⚠️ 部分可用的功能

| 功能 | 状态 | 说明 |
|------|------|------|
| color-diff | ⚠️ 替代实现 | 原生模块 → 纯 TS 实现 |
| FFI 调用 | ⚠️ 平台限定 | 仅 Bun 运行时可用 |
| 组织管理 | ⚠️ 受限 | 需要 OAuth，但 API key 下部分功能可用 |

---

## 7. 开发者指南

### 7.1 如何识别空实现？

#### 代码特征
```typescript
// 1. 函数体为空
export function someFunction(...args): void {}

// 2. 返回默认值
export function getValue(): Type {
  return null / undefined / {} / []
}

// 3. 参数带下划线前缀（表示未使用）
export function process(_param: Type): void {}

// 4. 注释明确说明
// Stub for ... / Telemetry disabled / Not available in ...
```

#### 文件位置
- `stubs/**/*.ts` - 所有 stub 文件
- `src/services/analytics/**/*.ts` - 遥测空实现
- 搜索关键词: `// Stub`, `// Telemetry disabled`, `_param`

---

### 7.2 如何添加新的 Stub？

**步骤 1**: 在 `stubs/` 创建文件
```bash
mkdir -p stubs/@your-org/your-package
cat > stubs/@your-org/your-package/index.ts << 'EOF'
// Stub for @your-org/your-package
export default {}
EOF
```

**步骤 2**: 在 `build.ts` 注册
```typescript
const EXPLICIT_STUBS: Record<string, string> = {
  // ...existing stubs...
  '@your-org/your-package': `${ROOT}/stubs/@your-org/your-package/index.ts`,
}
```

**步骤 3**: 重新构建
```bash
bun run build
```

---

### 7.3 如何启用被禁用的功能？

#### 情况 1: 功能需要外部服务

**示例**: GrowthBook

1. 修改 `src/services/analytics/growthbook.ts`
2. 连接到自己的 GrowthBook 实例
3. 移除空实现，恢复真实逻辑

#### 情况 2: 功能需要原生模块

**示例**: audio-capture-napi

1. 找到或重新实现原生模块
2. 替换 `stubs/audio-capture-napi/` 为真实实现
3. 确保跨平台构建

#### 情况 3: 功能需要 Anthropic 内部 API

**示例**: OAuth 登录

1. 分析原始代码（如果有）
2. 实现兼容的 OAuth 服务器
3. 修改 API 端点配置
4. 恢复 `/login` 和 `/logout` 命令

---

## 8. 相关资源

**项目文档**:
- `README.md` - 项目总览
- `CLAUDE.md` - 项目架构说明
- `build.ts` - 构建配置和 stub 映射

**Git 历史**:
```bash
# 查看移除遥测的 commit
git show 6e96eb8b

# 查看移除 login/logout 的 commit
git show a69015c8

# 查看清理 logEvent 的 commit
git show 08edb5d0
```

**问题反馈**:
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

## 9. 总结

### 📊 统计数据

| 类别 | 数量 |
|------|------|
| Stub 包 | 9 个 |
| 删除的文件 | ~10 个 |
| 清理的 logEvent 调用 | 1,083 处 |
| 清理的 GrowthBook 调用 | 199 处 |
| 删除的命令 | 2 个（/login, /logout） |

---

### 🎯 设计原则

本项目的空实现遵循以下原则：

1. **安全第一**: 空实现返回安全的默认值，不会引发运行时错误
2. **最小影响**: 仅替换依赖外部服务的部分，保留所有可独立运行的功能
3. **清晰标注**: 所有空实现都有注释说明原因
4. **可扩展性**: 预留接口，方便社区实现替代方案

---

**最后更新**: 2026-04-03  
**项目版本**: 2.1.88
