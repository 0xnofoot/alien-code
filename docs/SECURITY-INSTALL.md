# 供应链安全安装指南

## ⚠️ 威胁背景

2026 年 3 月 31 日，npm 生态遭遇供应链投毒攻击：

1. **Axios 投毒**：2026-03-31 00:21-03:29 UTC 期间，axios 包被植入跨平台 RAT 木马
2. **域名仿冒**：攻击者 `pacifier136` 抢注了 5 个 Anthropic 内部包名：
   - `audio-capture-napi`
   - `color-diff-napi`
   - `image-processor-napi`
   - `modifiers-napi`
   - `url-handler-napi`

来源：[The Hacker News](https://thehackernews.com/2026/04/claude-code-tleaked-via-npm-packaging.html)

---

## 🛡️ 本仓库的防护措施

### 1. Build-time Stub 系统

所有内部包通过 `build.ts` 映射到本地文件，**不从 npm 下载**：

```typescript
// build.ts 第 137-139 行
EXPLICIT_STUBS = {
  'color-diff-napi': `${ROOT}/stubs/color-diff-napi/index.ts`,
  'audio-capture-napi': `${ROOT}/stubs/audio-capture-napi/index.ts`,
  'modifiers-napi': `${ROOT}/stubs/modifiers-napi/index.ts`,
}
```

### 2. package.json Overrides

已在 `package.json` 添加 `overrides` 字段，强制阻止这些包的任何版本安装：

```json
"overrides": {
  "audio-capture-napi": "npm:nonexistent-package@0.0.0",
  "color-diff-napi": "npm:nonexistent-package@0.0.0",
  "image-processor-napi": "npm:nonexistent-package@0.0.0",
  "modifiers-napi": "npm:nonexistent-package@0.0.0",
  "url-handler-napi": "npm:nonexistent-package@0.0.0"
}
```

### 3. npm 生命周期钩子（自动检测）⭐ 新增

**每次 `npm install` 或 `bun install` 后自动运行检查**：

```json
"scripts": {
  "postinstall": "bash scripts/check-supply-chain.sh || exit 1",
  "preinstall": "echo '🔒 准备安装依赖，安装后将自动运行供应链安全检查...'",
  "check-security": "bash scripts/check-supply-chain.sh"
}
```

### 4. Git Hooks（版本控制检测）⭐ 新增

自动检测依赖变更：

- **post-merge**：`git pull` 或 `git merge` 后，如果依赖文件改变，自动运行检查
- **post-checkout**：切换分支时，如果依赖文件改变，提示需要重新安装

### 5. .npmrc 配置

已更新 `.npmrc`，添加供应链防护注释。

### 6. 自动检查脚本

提供 `scripts/check-supply-chain.sh` 脚本，用于检测是否安装了恶意包。

---

## ✅ 安全安装流程

### 方法 1：使用 Bun（推荐）⭐ 自动检测

Bun 使用独立的包解析机制，受 npm 供应链攻击影响较小：

```bash
# 1. 清理旧依赖（可选）
rm -rf node_modules bun.lock

# 2. 使用 Bun 安装（会自动运行 postinstall 检查）
bun install
# ✓ 安装完成后会自动运行 check-supply-chain.sh
# ✓ 如果发现问题，安装会失败并显示错误

# 3. 构建项目
bun run build
```

**自动检测说明**：
- ✅ 安装成功 = 依赖安全
- ❌ 安装失败 = 发现投毒包，需要手动清理

### 方法 2：使用 npm（正常安装）⭐ 自动检测

**推荐方式**（允许我们的安全检查脚本运行）：

```bash
# 1. 清理旧依赖
rm -rf node_modules package-lock.json

# 2. 正常安装（会自动运行 postinstall 检查）
npm install
# ✓ 安装完成后会自动运行 check-supply-chain.sh
# ✓ 如果发现问题，安装会失败

# 3. 构建项目
bun run build
```

### 方法 3：使用 npm --ignore-scripts（最保守）

如果担心第三方包的 postinstall 脚本：

```bash
# 1. 清理旧依赖
rm -rf node_modules package-lock.json

# 2. 禁用所有脚本安装
npm install --ignore-scripts

# 3. 手动运行安全检查
npm run check-security
# 或
./scripts/check-supply-chain.sh

# 4. 手动运行必要的构建脚本（如果需要）
npm rebuild sharp  # 仅示例

# 5. 构建项目
bun run build
```

**注意**：使用 `--ignore-scripts` 会跳过我们的自动检查，需要手动运行 `npm run check-security`。

### 方法 3：离线安装（最安全）

如果您已有安全的 `node_modules`：

```bash
# 1. 备份当前安全的 node_modules
tar czf node_modules-safe-$(date +%Y%m%d).tar.gz node_modules

# 2. 后续恢复
rm -rf node_modules
tar xzf node_modules-safe-YYYYMMDD.tar.gz

# 3. 验证
./scripts/check-supply-chain.sh
```

---

## 🔍 安全检查命令

### 运行完整检查

```bash
./scripts/check-supply-chain.sh
```

### 手动检查命令

```bash
# 检查可疑包目录
ls -d node_modules/*-napi 2>/dev/null

# 检查 package-lock.json
grep -E "(audio-capture|color-diff|image-processor|modifiers-napi|url-handler)" package-lock.json

# 检查依赖树
npm ls audio-capture-napi color-diff-napi image-processor-napi modifiers-napi url-handler-napi

# 检查 axios 版本和脚本
cat node_modules/axios/package.json | jq '{version, scripts}'

# 验证没有 pacifier136 的包
find node_modules -name "package.json" -exec grep -l "pacifier136" {} \;
```

---

## 🚨 如果发现投毒包

如果 `scripts/check-supply-chain.sh` 报告发现可疑包：

### 1. 立即隔离

```bash
# 停止运行任何已构建的程序
pkill -f alien-code

# 隔离 node_modules
mv node_modules node_modules.INFECTED-$(date +%Y%m%d-%H%M%S)
```

### 2. 清理环境

```bash
# 删除构建产物
rm -rf package/alien-code.js

# 删除锁文件
rm -f package-lock.json bun.lock

# 清理 npm 缓存
npm cache clean --force

# 清理 Bun 缓存
rm -rf ~/.bun/install/cache
```

### 3. 检查系统入侵迹象

```bash
# 检查异常进程
ps aux | grep -i "node\|bun\|npm"

# 检查异常网络连接
lsof -i -n -P | grep -i "node\|bun"

# 检查最近创建的文件
find ~ -type f -mtime -1 -ls

# 检查 shell 历史
history | grep -E "curl|wget|nc|bash -c"
```

### 4. 轮换密钥

如果机器可能已被入侵，轮换所有敏感凭据：

- GitHub/GitLab personal access tokens
- SSH keys
- API keys（Anthropic、OpenAI 等）
- 数据库密码
- 云服务凭据（AWS、GCP、Azure）

### 5. 重新安装

按照上述"安全安装流程"重新安装。

---

## 📊 验证当前环境安全性

运行以下命令确认您当前的环境是安全的：

```bash
# 完整检查（推荐）
./scripts/check-supply-chain.sh

# 快速检查
[ ! -d "node_modules/audio-capture-napi" ] && \
[ ! -d "node_modules/color-diff-napi" ] && \
[ ! -d "node_modules/image-processor-napi" ] && \
[ ! -d "node_modules/modifiers-napi" ] && \
[ ! -d "node_modules/url-handler-napi" ] && \
echo "✅ 环境安全" || echo "❌ 发现可疑包"
```

---

## 🔗 参考资源

- [The Hacker News 报道](https://thehackernews.com/2026/04/claude-code-tleaked-via-npm-packaging.html)
- [知乎讨论](https://www.zhihu.com/question/2022394365436248248/answer/2022822701530629535)
- [npm 供应链攻击防护最佳实践](https://docs.npmjs.com/about-supply-chain-attacks)
- [Snyk 依赖安全扫描](https://snyk.io/)

---

## 📝 维护者备注

**最后更新**：2026-04-03  
**状态**：防护措施已部署  
**验证**：当前 node_modules 已通过检查

如有安全问题，请在 GitHub Issues 报告。
