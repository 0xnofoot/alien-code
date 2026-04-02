# 品牌与图标更改说明

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
