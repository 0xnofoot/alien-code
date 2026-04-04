# 🛡️ npm 供应链投毒防护速查卡

## 🚨 威胁等级：HIGH

**攻击时间**：2026-03-31 00:21-03:29 UTC  
**攻击者**：pacifier136  
**攻击向量**：5 个 npm 包抢注 + axios 投毒

---

## ⚡ 快速检查（10 秒）

```bash
# 运行自动检查脚本
./scripts/check-supply-chain.sh

# 或手动快速验证
ls node_modules/ | grep -E "(audio-capture|color-diff|image-processor|modifiers|url-handler)-napi"
# 应该返回空（没有输出）
```

---

## 🔒 安全安装（自动检测）⭐

```bash
# 方式 1: 正常安装（推荐）- 自动检测
bun install          # 会自动运行 postinstall 检查
# 或
npm install          # 会自动运行 postinstall 检查
# ✓ 安装完成 = 依赖安全
# ✗ 安装失败 = 发现投毒

# 方式 2: 保守安装 - 手动检测
npm install --ignore-scripts  # 跳过所有脚本
npm run check-security        # 手动验证
```

---

## ❌ 永远不要做的事

- ❌ 不要在危险时段（2026-03-31 00:21-03:29 UTC）的锁文件上安装
- ❌ 不要忽略检查脚本的警告
- ❌ 不要手动安装 `*-napi` 包

---

## 🛠️ 已部署的防护

| 防护层 | 位置 | 状态 |
|--------|------|------|
| Build Stub | `build.ts` L137-139 | ✅ |
| Package Override | `package.json` overrides | ✅ |
| **postinstall 钩子** ⭐ | `package.json` scripts | ✅ |
| **Git Hooks** ⭐ | `.husky/post-merge` | ✅ |
| 自动检查脚本 | `scripts/check-supply-chain.sh` | ✅ |
| 文档 | `docs/SECURITY-INSTALL.md` | ✅ |

---

## 🚑 紧急响应

如果检查失败：

```bash
# 1. 隔离
mv node_modules node_modules.INFECTED

# 2. 清理
rm -rf package-lock.json bun.lock
npm cache clean --force

# 3. 重新安装
bun install
./scripts/check-supply-chain.sh

# 4. 轮换密钥
# - GitHub tokens
# - API keys (Anthropic, OpenAI)
# - SSH keys
```

---

## 📞 获取帮助

- 📄 详细文档：`docs/SECURITY-INSTALL.md`
- 🐛 报告问题：GitHub Issues
- 📰 威胁来源：[The Hacker News](https://thehackernews.com/2026/04/claude-code-tleaked-via-npm-packaging.html)

---

**最后验证时间**：2026-04-03 ✅  
**当前状态**：安全
