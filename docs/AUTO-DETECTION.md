# 🤖 自动投毒检测机制说明

## 概述

本仓库已配置**多层自动检测**机制，在关键操作时自动运行供应链安全检查，无需手动干预。

---

## 🎯 自动触发场景

### 1. npm/bun install 后（postinstall hook）

**触发条件**：每次运行 `npm install` 或 `bun install`

**执行流程**：
```
安装依赖 → postinstall 钩子 → 运行 check-supply-chain.sh → 检查结果
```

**结果**：
- ✅ 检查通过：安装成功完成
- ❌ 检查失败：**安装终止**，显示错误信息

**示例输出**：
```bash
$ npm install

> @anthropic-ai/claude-code@2.1.88 postinstall
> bash scripts/check-supply-chain.sh

🔍 供应链安全检查...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 供应链检查通过
```

---

### 2. git pull/merge 后（post-merge hook）

**触发条件**：
- 执行 `git pull`
- 执行 `git merge`
- **且** package.json、package-lock.json 或 bun.lock 发生变化

**执行流程**：
```
git pull → 检测文件变化 → 发现依赖文件改变 → 自动运行检查
```

**示例输出**：
```bash
$ git pull origin main

Updating a1b2c3d..e4f5g6h
Fast-forward
 package.json | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

🔍 检测到依赖文件变更，正在运行供应链安全检查...

🔍 供应链安全检查...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 供应链检查通过
```

---

### 3. 切换分支时（post-checkout hook）

**触发条件**：
- 执行 `git checkout <branch>`
- **且** package.json、package-lock.json 或 bun.lock 在两个分支间不同

**执行流程**：
```
git checkout → 检测文件变化 → 发现依赖文件改变 → 提示需要重装
```

**示例输出**：
```bash
$ git checkout feature-branch

Switched to branch 'feature-branch'

⚠️  依赖文件已改变，建议重新安装依赖：
   bun install
```

---

### 4. 手动检查（任何时候）

**命令**：
```bash
# 方式 1: npm 脚本（推荐）
npm run check-security

# 方式 2: 直接运行脚本
./scripts/check-supply-chain.sh
```

---

## 🔧 技术实现

### package.json 钩子配置

```json
{
  "scripts": {
    "preinstall": "echo '\n🔒 准备安装依赖，安装后将自动运行供应链安全检查...\n'",
    "postinstall": "bash scripts/check-supply-chain.sh",
    "check-security": "bash scripts/check-supply-chain.sh",
    "prepare": "git config core.hooksPath .husky 2>/dev/null || true"
  }
}
```

> `prepare` 脚本在 `npm install` / `bun install` 后自动将 `.husky/` 注册为 Git hooks 目录，确保 post-merge 和 post-checkout 钩子对新克隆的仓库自动生效。

### Git Hooks 配置

- `.husky/post-merge` - 监听 pull/merge 事件
- `.husky/post-checkout` - 监听分支切换事件

---

## 🚨 如果自动检查失败

### 场景 1: npm install 时检查失败

```bash
$ npm install

> postinstall
> bash scripts/check-supply-chain.sh

🔍 供应链安全检查...
  ❌ 发现可疑包目录: node_modules/audio-capture-napi

❌ 发现安全风险，请勿使用此 node_modules
```

**解决方案**：
1. 立即停止使用当前环境
2. 删除 node_modules：`rm -rf node_modules`
3. 清理缓存：`npm cache clean --force`
4. 重新安装：`bun install` 或 `npm install`
5. 检查文档：`docs/SECURITY-INSTALL.md`

---

### 场景 2: git pull 后检查失败

```bash
$ git pull

🔍 检测到依赖文件变更，正在运行供应链安全检查...
  ❌ 发现可疑包目录: node_modules/color-diff-napi
```

**解决方案**：
1. **不要** 运行 `npm install` 或 `bun install`
2. 检查是否有人提交了恶意更改：`git log -p package.json`
3. 如果是误操作，回滚：`git revert HEAD`
4. 如果是恶意提交，报告给团队并回滚到安全版本

---

## 🛠️ 维护与自定义

### 禁用自动检查

**临时禁用（单次安装）**：
```bash
# 跳过所有脚本（包括我们的检查）
npm install --ignore-scripts

# 手动运行检查
npm run check-security
```

**永久禁用（不推荐）**：
从 `package.json` 中删除 `postinstall` 钩子。

### 自定义检查脚本

编辑 `scripts/check-supply-chain.sh` 添加额外检查：

```bash
# 添加自定义包检查
CUSTOM_MALICIOUS_PACKAGES=(
  "your-suspicious-package"
)

for pkg in "${CUSTOM_MALICIOUS_PACKAGES[@]}"; do
  # 检查逻辑
done
```

### 调整 Git Hooks

编辑 `.husky/post-merge` 或 `.husky/post-checkout` 自定义行为。

---

## 🧪 测试自动检测

手动验证各检测层：

```bash
# 1. 验证检查脚本可执行
./scripts/check-supply-chain.sh

# 2. 验证 postinstall 钩子
npm run check-security

# 3. 验证 Git hooks 存在
ls -la .husky/post-merge .husky/post-checkout
```

---

## 📊 防护层级总结

| 防护层 | 触发时机 | 自动/手动 | 阻止安装 |
|--------|----------|-----------|----------|
| package.json overrides | npm/bun 解析依赖时 | 自动 | ✅ |
| build.ts stub 系统 | 构建时 | 自动 | ✅ |
| postinstall 钩子 | npm/bun install 后 | 自动 | ⚠️ (安装后检测并报错) |
| post-merge 钩子 | git pull/merge 后 | 自动 | ❌ (仅警告) |
| post-checkout 钩子 | git checkout 后 | 自动 | ❌ (仅提示) |
| npm run check-security | 手动执行 | 手动 | ❌ (仅检查) |

> **注意**：本项目通过 `.npmrc` 设置 `package-lock=false`，使用 Bun 作为主包管理器。因此检查脚本中涉及 `package-lock.json` 的检查项（检查 2 和检查 4）正常情况下不会触发，它们作为使用 npm 用户的额外防护层保留。

**最强防护**：package.json overrides + postinstall 钩子（双重保障）

---

## ❓ FAQ

### Q: 使用 `--ignore-scripts` 安装后安全吗？

A: 相对安全，但跳过了我们的自动检查。必须手动运行 `npm run check-security`。

### Q: Git hooks 会在 CI/CD 中运行吗？

A: 不会。Git hooks 只在本地开发环境运行。CI/CD 中需要在构建脚本中添加 `npm run check-security`。

### Q: 如果我使用 yarn 或 pnpm？

A: `postinstall` 钩子在 yarn 和 pnpm 中也会运行。但 `overrides` 字段可能需要调整为 `resolutions`（yarn）或 `pnpm.overrides`（pnpm）。

### Q: 自动检查会影响安装速度吗？

A: 影响极小（通常 < 1 秒）。检查脚本只扫描文件系统，不涉及网络请求。

---

## 🔗 相关文档

- 完整安全指南：`docs/SECURITY-INSTALL.md`
- 快速参考：`docs/supply-chain-quickref.md`
- 检查脚本源码：`scripts/check-supply-chain.sh`

---

**最后更新**：2026-04-03  
**测试状态**：✅ 全部通过
