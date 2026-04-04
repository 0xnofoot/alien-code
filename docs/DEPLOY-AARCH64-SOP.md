# Alien Code — aarch64 交叉部署 SOP

目标平台已验证信息：

| 项目 | 值 |
|------|----|
| 架构 | aarch64 |
| libc | glibc 2.28（Debian deepin1） |
| 系统 | 统信 UOS（deepin 内核） |

> 构建产物为 Bun 独立二进制，目标机**无需安装** Node.js 或 Bun，仅需 glibc >= 2.17。

---

## 背景

当前构建流程（`build.ts`）采用两阶段构建：

1. **Phase 1** — `Bun.build()` 将 TypeScript 打包为中间 JS 文件（`package/alien-code-bundle.js`）
2. **Phase 2** — `bun build --compile` 将中间 JS 编译为独立二进制（`package/alien-code`）

默认 Phase 2 编译为**构建机架构**（通常是 x86_64），且中间 JS 文件在编译后被自动删除。交叉部署到 aarch64 需要：

1. 保留中间 JS 文件，用 `--target=bun-linux-arm64` 交叉编译
2. 为 aarch64 提供 `sharp` 图像库的原生模块（`.node` / `.so`），因为这些在 `build.ts` 中被声明为 `external`，运行时从 `node_modules/@img/` 动态加载

---

## 前置条件（构建机）

- Bun **1.2.x**（必须，1.3.x 有 bundler bug）
- npm（用于下载 aarch64 sharp 原生模块）
- 构建机可访问 npm registry

---

## 部署步骤

### 第一步：下载 aarch64 sharp 原生模块

首先确认项目中 sharp 原生模块的实际版本：

```bash
# 在项目根目录执行，获取当前安装的 sharp 原生模块版本
SHARP_VER=$(node -e "console.log(require('./node_modules/@img/sharp-linux-x64/package.json').version)" 2>/dev/null || echo "0.34.2")
VIPS_VER=$(node -e "console.log(require('./node_modules/@img/sharp-libvips-linux-x64/package.json').version)" 2>/dev/null || echo "1.2.4")
echo "sharp: $SHARP_VER, libvips: $VIPS_VER"
```

然后下载对应的 aarch64 版本：

```bash
mkdir -p /tmp/sharp-arm64-dl
cd /tmp/sharp-arm64-dl
npm install \
  @img/sharp-linux-arm64@${SHARP_VER} \
  @img/sharp-libvips-linux-arm64@${VIPS_VER} \
  --no-save --ignore-scripts --force
```

> `--force` 用于绕过 npm 的平台检查（构建机是 x64，但我们要下载 arm64 包）。
> 版本号**必须**与项目中 x64 版本一致，上述命令已自动获取。

### 第二步：构建中间 JS bundle

正常构建会自动清理中间文件，因此需要**临时注释 `build.ts` 中的清理行**来保留它：

```bash
cd <project-root>

# 注释掉 build.ts 末尾的清理行：
#   await Bun.$`rm -f ${tempJsFile}`.quiet()
# 然后执行构建：
VERSION=2.1.88 bun run build.ts

# 确认中间文件存在：
ls -lh package/alien-code-bundle.js
# 构建完成后记得恢复 build.ts
```

> **或者**，直接在 Phase 2 之前手动中断构建，只执行 Phase 1。
> 中间文件路径固定为 `package/alien-code-bundle.js`。

### 第三步：交叉编译 aarch64 可执行文件

```bash
bun build --compile \
  --target=bun-linux-arm64 \
  --outfile=/tmp/alien-code-arm64-bin \
  package/alien-code-bundle.js
```

> - `--target=bun-linux-arm64` 指定目标平台（格式：`bun-{os}-{arch}`）
> - Bun 首次交叉编译时会自动下载 aarch64 运行时（约 100MB，后续缓存）
> - 产物是 ELF 64-bit ARM aarch64 可执行文件
> - `.node` 原生模块无法内嵌到二进制中，必须随包附带

### 第四步：组装部署目录

```bash
mkdir -p deploy-aarch64/node_modules/@img

# 独立可执行文件
cp /tmp/alien-code-arm64-bin deploy-aarch64/alien-code
chmod +x deploy-aarch64/alien-code

# arm64 原生模块（必须与可执行文件同目录，Bun 从 binary 真实路径解析 node_modules）
cp -r /tmp/sharp-arm64-dl/node_modules/@img/sharp-linux-arm64 \
      deploy-aarch64/node_modules/@img/
cp -r /tmp/sharp-arm64-dl/node_modules/@img/sharp-libvips-linux-arm64 \
      deploy-aarch64/node_modules/@img/

# 安装脚本
cat > deploy-aarch64/install.sh << 'EOF'
#!/bin/bash
set -euo pipefail

BINARY_NAME="alien-code"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" = "0" ]; then
    PREFIX="/usr/local"
else
    PREFIX="$HOME/.local"
fi

LIB_DIR="$PREFIX/lib/$BINARY_NAME"
BIN_DIR="$PREFIX/bin"

echo "→ 安装目录: $LIB_DIR"
mkdir -p "$LIB_DIR" "$BIN_DIR"

# binary 与 node_modules 必须同目录
cp "$SCRIPT_DIR/alien-code" "$LIB_DIR/"
chmod +x "$LIB_DIR/alien-code"
cp -r "$SCRIPT_DIR/node_modules" "$LIB_DIR/"

# 软链接：Bun 通过 readlink 解析真实路径，symlink 安全
ln -sf "$LIB_DIR/$BINARY_NAME" "$BIN_DIR/$BINARY_NAME"

if ! echo ":$PATH:" | grep -q ":$BIN_DIR:"; then
    # 检测用户当前 shell 的配置文件
    CURRENT_SHELL="$(basename "${SHELL:-/bin/bash}")"
    case "$CURRENT_SHELL" in
        zsh)  SHELL_RC="$HOME/.zshrc" ;;
        fish) SHELL_RC="$HOME/.config/fish/config.fish" ;;
        *)    SHELL_RC="$HOME/.bashrc" ;;
    esac

    # 避免重复追加
    PATH_LINE_PATTERN="$BIN_DIR"
    if ! grep -qF "$PATH_LINE_PATTERN" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        if [ "$CURRENT_SHELL" = "fish" ]; then
            echo "set -gx PATH $BIN_DIR \$PATH" >> "$SHELL_RC"
        else
            echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
        fi
        echo "→ 已追加 PATH 到 $SHELL_RC，请执行: source $SHELL_RC"
    else
        echo "→ PATH 已在 $SHELL_RC 中配置"
    fi
fi

echo "✓ 安装完成"
echo "卸载: rm -rf $LIB_DIR && rm -f $BIN_DIR/$BINARY_NAME"
EOF
chmod +x deploy-aarch64/install.sh
```

### 第五步：打包传输

```bash
tar -czf deploy-aarch64.tar.gz deploy-aarch64/
# 预期大小约 47MB
```

### 第六步：部署到目标机

将 `deploy-aarch64.tar.gz` 传输到目标机后执行：

```bash
tar -xzf deploy-aarch64.tar.gz
cd deploy-aarch64
./install.sh
source ~/.bashrc       # 非 root 时刷新 PATH

alien-code --version   # 验证
```

安装后结构：
```
~/.local/lib/alien-code/
├── alien-code              ← Bun 独立可执行（内嵌运行时）
└── node_modules/@img/
    ├── sharp-linux-arm64/      ← sharp-linux-arm64.node
    └── sharp-libvips-linux-arm64/  ← libvips-cpp.so.8.17.3
~/.local/bin/alien-code     ← 软链接 → ../lib/alien-code/alien-code
```

---

## 清理构建临时产物

```bash
# 项目目录
rm -rf deploy-aarch64 deploy-aarch64.tar.gz
# 恢复 build.ts（如果修改过）
git checkout build.ts

# /tmp 临时文件
rm -rf /tmp/sharp-arm64-dl /tmp/alien-code-arm64-bin
```
