# Alien Code — aarch64 交叉部署 SOP

目标平台已验证信息：

| 项目 | 值 |
|------|----|
| 架构 | aarch64 |
| libc | glibc 2.28（Debian deepin1） |
| Node.js | v22.20.0 |
| 系统 | 统信 UOS（deepin 内核） |

---

## 背景

`package/alien-code.js` 是平台无关的 JS ESM bundle，但 `sharp` 图像处理库的原生模块（`.node` / `.so`）是平台相关的，在 `build.ts` 中被声明为 `external`，运行时从 `node_modules/@img/` 动态加载。因此交叉部署的核心工作是为 aarch64 提供正确的 sharp 原生模块。

---

## 前置条件（构建机）

- Bun **1.2.x**（必须，1.3.x 有 bundler bug）
- Node.js ≥ 18 + npm
- 构建机可访问 npm registry

---

## 方案 A：JS 文件 + 系统 Node.js

> 目标机已有 Node.js，部署包约 **12MB**。

### 第一步：构建 JS bundle（如尚未构建）

```bash
cd /root/Downloads/alien-code
VERSION=2.1.88 bun run build.ts
# 产物：package/alien-code.js
```

### 第二步：下载 aarch64 sharp 原生模块

```bash
mkdir -p /tmp/sharp-arm64-dl
cd /tmp/sharp-arm64-dl
npm install \
  @img/sharp-linux-arm64@0.34.5 \
  @img/sharp-libvips-linux-arm64@1.2.4 \
  --no-save --ignore-scripts --force
```

> `--force` 用于绕过 npm 的平台检查（构建机是 x64，但我们要下载 arm64 包）。
> 版本号须与项目 `node_modules/@img/sharp-linux-x64` 的版本一致，可用以下命令确认：
> ```bash
> node -e "console.log(require('./node_modules/@img/sharp-linux-x64/package.json').version)"
> ```

### 第三步：组装部署目录

```bash
cd /root/Downloads/alien-code
mkdir -p deploy-aarch64-methodA/node_modules/@img

# 主文件
cp package/alien-code.js deploy-aarch64-methodA/

# arm64 原生模块
cp -r /tmp/sharp-arm64-dl/node_modules/@img/sharp-linux-arm64 \
      deploy-aarch64-methodA/node_modules/@img/
cp -r /tmp/sharp-arm64-dl/node_modules/@img/sharp-libvips-linux-arm64 \
      deploy-aarch64-methodA/node_modules/@img/

# 安装脚本
cat > deploy-aarch64-methodA/install.sh << 'EOF'
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

cp "$SCRIPT_DIR/alien-code.js" "$LIB_DIR/"
cp -r "$SCRIPT_DIR/node_modules" "$LIB_DIR/"

cat > "$BIN_DIR/$BINARY_NAME" << 'LAUNCHER'
#!/bin/bash
LIB="$(dirname "$(readlink -f "$0")")/../lib/alien-code"
exec env NODE_PATH="$LIB/node_modules" node "$LIB/alien-code.js" "$@"
LAUNCHER
chmod +x "$BIN_DIR/$BINARY_NAME"

if ! echo ":$PATH:" | grep -q ":$BIN_DIR:"; then
    SHELL_RC="$HOME/.bashrc"
    echo "" >> "$SHELL_RC"
    echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
    echo "→ 已追加 PATH 到 $SHELL_RC，请执行: source $SHELL_RC"
fi

echo "✓ 安装完成"
echo "卸载: rm -rf $LIB_DIR && rm -f $BIN_DIR/$BINARY_NAME"
EOF
chmod +x deploy-aarch64-methodA/install.sh
```

### 第四步：打包

```bash
tar -czf deploy-aarch64-methodA.tar.gz deploy-aarch64-methodA/
# 预期大小约 12MB
```

### 第五步：部署到目标机

将 `deploy-aarch64-methodA.tar.gz` 传输到目标机后执行：

```bash
tar -xzf deploy-aarch64-methodA.tar.gz
cd deploy-aarch64-methodA
./install.sh
source ~/.bashrc       # 非 root 时刷新 PATH

alien-code --version   # 验证
```

安装后结构：
```
~/.local/lib/alien-code/
├── alien-code.js
└── node_modules/@img/
    ├── sharp-linux-arm64/      ← sharp-linux-arm64.node
    └── sharp-libvips-linux-arm64/  ← libvips-cpp.so.8.17.3
~/.local/bin/alien-code         ← 启动器脚本（设置 NODE_PATH）
```

---

## 方案 B：Bun 独立可执行文件（无需 Node.js）

> 目标机无需安装 Node.js，内嵌 Bun 运行时，部署包约 **47MB**。

### 第一步：确认已完成方案 A 的第二步

arm64 sharp 原生模块需要在 `/tmp/sharp-arm64-dl/node_modules/@img/` 下存在。

### 第二步：交叉编译 aarch64 可执行文件

```bash
cd /root/Downloads/alien-code
bun build --compile \
  --target=bun-linux-arm64 \
  --outfile=/tmp/alien-code-arm64-bin \
  package/alien-code.js
# Bun 会自动下载 aarch64 运行时（首次约 100MB，后续缓存）
# 产物：ELF 64-bit LSB executable, ARM aarch64，约 110MB
```

> **注意**：`bun build --compile` 的 `--target` 格式为 `bun-linux-arm64`，不是 `bun`。
> Bun 将 JS bundle 与运行时合并为单一 ELF，但 `.node` 原生模块无法内嵌，仍需随包附带。

### 第三步：组装部署目录

```bash
mkdir -p deploy-aarch64-methodB/node_modules/@img

# 独立可执行文件
cp /tmp/alien-code-arm64-bin deploy-aarch64-methodB/alien-code
chmod +x deploy-aarch64-methodB/alien-code

# arm64 原生模块（必须与可执行文件同目录，Bun 从 binary 真实路径解析 node_modules）
cp -r /tmp/sharp-arm64-dl/node_modules/@img/sharp-linux-arm64 \
      deploy-aarch64-methodB/node_modules/@img/
cp -r /tmp/sharp-arm64-dl/node_modules/@img/sharp-libvips-linux-arm64 \
      deploy-aarch64-methodB/node_modules/@img/

# 安装脚本
cat > deploy-aarch64-methodB/install.sh << 'EOF'
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
    SHELL_RC="$HOME/.bashrc"
    echo "" >> "$SHELL_RC"
    echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
    echo "→ 已追加 PATH 到 $SHELL_RC，请执行: source $SHELL_RC"
fi

echo "✓ 安装完成"
echo "卸载: rm -rf $LIB_DIR && rm -f $BIN_DIR/$BINARY_NAME"
EOF
chmod +x deploy-aarch64-methodB/install.sh
```

### 第四步：打包

```bash
tar -czf deploy-aarch64-methodB.tar.gz deploy-aarch64-methodB/
# 预期大小约 47MB
```

### 第五步：部署到目标机

```bash
tar -xzf deploy-aarch64-methodB.tar.gz
cd deploy-aarch64-methodB
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

## 方案对比

| | 方案 A | 方案 B |
|---|---|---|
| 部署包大小 | ~12 MB | ~47 MB |
| 目标机依赖 | Node.js ≥ 18 | 无（glibc ≥ 2.17 即可） |
| 目标机入口 | 启动器脚本（设置 NODE_PATH） | 软链接到 Bun ELF |
| 首次启动速度 | 取决于系统 Node.js | 略快 |
| 推荐场景 | 目标机已有 Node.js | 纯净环境 |

---

## 清理构建临时产物

每次构建完成后清理：

```bash
# 项目目录
rm -rf deploy-aarch64-methodA deploy-aarch64-methodA.tar.gz
rm -rf deploy-aarch64-methodB deploy-aarch64-methodB.tar.gz

# /tmp 临时文件
rm -rf /tmp/sharp-arm64-dl /tmp/alien-code-arm64-bin
```
