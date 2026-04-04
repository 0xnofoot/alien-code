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

当前构建流程（`build.ts`）默认产出 **Bun 独立二进制**（`package/alien-code`），内嵌 Bun 运行时，但该二进制是平台相关的（默认为构建机架构）。`sharp` 图像处理库的原生模块（`.node` / `.so`）在 `build.ts` 中被声明为 `external`，运行时从 `node_modules/@img/` 动态加载。因此交叉部署的核心工作是：1）交叉编译 aarch64 二进制；2）提供正确的 sharp 原生模块。

---

## 前置条件（构建机）

- Bun **1.2.x**（必须，1.3.x 有 bundler bug）
- npm（用于下载 aarch64 sharp 原生模块）
- 构建机可访问 npm registry

---

## 方案 A：交叉编译独立二进制（推荐）

> 目标机无需安装 Node.js 或 Bun，部署包约 **47MB**。

### 第一步：下载 aarch64 sharp 原生模块

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

### 第三步：先构建 x86 中间 JS bundle

构建系统默认会编译为当前平台二进制，但我们需要交叉编译为 aarch64。需要先获取中间 JS bundle：

```bash
cd /root/Downloads/alien-code
VERSION=2.1.88 bun run build.ts
# 构建完成后，中间 JS 文件已被自动清理
# 需要手动执行 Phase 1 获取中间产物：
VERSION=2.1.88 bun run build.ts  # 正常构建
# 或修改 build.ts 临时保留 alien-code-bundle.js
```

> **简便方法**：直接用 `bun build --compile` 交叉编译已有的构建产物中的 JS：
> ```bash
> # 如果已有上次构建的中间文件，或者手动执行 Phase 1
> bun build --compile \
>   --target=bun-linux-arm64 \
>   --outfile=/tmp/alien-code-arm64-bin \
>   package/alien-code-bundle.js
> ```

### 第四步：交叉编译 aarch64 可执行文件

```bash
bun build --compile \
  --target=bun-linux-arm64 \
  --outfile=/tmp/alien-code-arm64-bin \
  package/alien-code-bundle.js
# Bun 会自动下载 aarch64 运行时（首次约 100MB，后续缓存）
```

### 第五步：组装部署目录

```bash
mkdir -p deploy-aarch64-methodA/node_modules/@img

# 独立可执行文件
cp /tmp/alien-code-arm64-bin deploy-aarch64-methodA/alien-code
chmod +x deploy-aarch64-methodA/alien-code

# arm64 原生模块（必须与可执行文件同目录，Bun 从 binary 真实路径解析 node_modules）
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
chmod +x deploy-aarch64-methodA/install.sh
```

### 第六步：打包

```bash
tar -czf deploy-aarch64-methodA.tar.gz deploy-aarch64-methodA/
# 预期大小约 47MB
```

### 第七步：部署到目标机

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
├── alien-code              ← Bun 独立可执行（内嵌运行时）
└── node_modules/@img/
    ├── sharp-linux-arm64/      ← sharp-linux-arm64.node
    └── sharp-libvips-linux-arm64/  ← libvips-cpp.so.8.17.3
~/.local/bin/alien-code     ← 软链接 → ../lib/alien-code/alien-code
```

---

## 说明

由于构建系统已改为默认产出 Bun 独立二进制，原方案 A（JS 文件 + Node.js）和方案 B（Bun 二进制）已合并为上述单一方案。目标机无需安装 Node.js 或 Bun，只需 glibc ≥ 2.17。

---

## 清理构建临时产物

每次构建完成后清理：

```bash
# 项目目录
rm -rf deploy-aarch64-methodA deploy-aarch64-methodA.tar.gz

# /tmp 临时文件
rm -rf /tmp/sharp-arm64-dl /tmp/alien-code-arm64-bin
```
