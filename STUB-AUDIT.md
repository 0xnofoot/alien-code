# 空实现审计报告

> 审计日期：2026-04-04

## 已处理（本会话）

| 项目 | 状态 |
|------|------|
| `stubs/audio-capture-napi/index.ts` | ✅ 已修复，`isNativeAudioAvailable()` 返回 false，触发 arecord/sox fallback |
| `stubs/@ant/claude-for-chrome-mcp/index.ts` | ✅ 已修复，返回 no-op server（`connect`/`close` 为空 async），不再 `null.connect()` 崩溃 |
| `stubs/@anthropic-ai/mcpb/index.ts` | ✅ 已补充 `McpbManifest` 和 `McpbUserConfigurationOption` 类型别名 |
| `build.ts` 注释 | ✅ 已删除三行已注释的 `@anthropic-ai/*` 死注释 |

---

## 可以清理的空实现

### 1. `src/services/settingsSync/index.ts` — `!false` 硬编码条件

上传/下载逻辑被永久禁用，但代码看起来像 bug：

```typescript
// 上传（约第 63 行）
if (!feature('UPLOAD_USER_SETTINGS') || !false || !getIsInteractive() || !isUsingOAuth()) {
  return  // !false === true，永远在此返回
}

// 下载（约第 152 行）
if (feature('DOWNLOAD_USER_SETTINGS')) {
  if (!false || !isUsingOAuth()) {
    return false  // 同样永远跳过
  }
}
```

**建议**：将函数体直接替换为空实现，消除迷惑性的 `!false` 条件。

---

### 2. `src/utils/telemetry/pluginTelemetry.ts` — 两个空循环体且从未被调用

```typescript
// 约第 191 行
export function logPluginsEnabledForSession(plugins, managedNames, seedDirs): void {
  for (const plugin of plugins) {
    const { marketplace } = parsePluginIdentifier(plugin.repository)
    // 循环体为空，无任何 logEvent 调用
  }
}

// 约第 243 行
export function logPluginLoadErrors(errors, managedNames): void {
  for (const err of errors) {
    const { name, marketplace } = parsePluginIdentifier(err.source)
    // 同样为空
  }
}
```

**建议**：直接删除，这两个函数在整个 src/ 中没有任何调用者。

---

## 不能移除的空实现（设计决策）

依赖 Anthropic 内部服务，保持空实现是正确处理方式。

| 文件 | 空实现内容 | 调用点数 |
|------|-----------|---------|
| `src/services/analytics/growthbook.ts` | 21 个函数全部返回默认值，依赖内部 GrowthBook 服务 | 199+ |
| `src/services/analytics/index.ts` | `logEvent`/`logEventAsync` 为空函数，依赖 Datadog 等后端 | 1083+ |
| `src/services/analytics/sink.ts` | `initializeAnalyticsSink()`/`initializeAnalyticsGates()` 为空 | 4+ |
| `src/utils/auth.ts`（订阅检查） | `isClaudeAISubscriber()`、`getSubscriptionType()` 等 8 个函数全返回 false/null，依赖内部账号服务 | 50+ |
| `src/utils/billing.ts` | `hasClaudeAiBillingAccess()` 等返回 false | 5+ |

---

## Stubs 目录 — 全部需要保留

即使某些代码路径在运行时不会执行，Bun 打包阶段仍需解析完整模块图。

| Stub | 运行时行为 | 保留原因 |
|------|-----------|---------|
| `stubs/@ant/computer-use-mcp/`（3 个文件）| `buildComputerUseTools()→[]`，`feature('CHICAGO_MCP')=false` 已 DCE | 打包时模块图解析需要 |
| `stubs/@ant/computer-use-input/index.ts` | `export default {}`，macOS 平台检查保护 | 打包时模块图解析需要 |
| `stubs/@ant/computer-use-swift/index.ts` | 类型定义 + `export default {}`，macOS 专用 | 打包时模块图解析需要 |
| `stubs/modifiers-napi/index.ts` | `export default {}`，`process.platform === 'darwin'` 检查保护 | 打包时模块图解析需要 |
| `stubs/bun-ffi/index.ts` | `dlopen()` 抛异常，`typeof Bun === 'undefined'` 检查保护 | 打包时模块图解析需要 |
| `stubs/bun-bundle/index.ts` | `feature()→false`，构建时 DCE 已消除所有调用 | 打包时模块图解析需要 |
| `stubs/color-diff-napi/index.ts` | ✅ 非空，重定向到 `src/native-ts/color-diff/`（TS 实现） | 正常工作 |

---

## 构建产物大小参考

| 时间节点 | 大小 | 说明 |
|---------|------|------|
| 初始状态 | 13.4 MB | 修改前 |
| 修复 mcpb 类型后 | 14.4 MB | 真实 mcpb 包被打包进来（+1 MB） |
| 当前 | 14.4 MB | 稳定 |
