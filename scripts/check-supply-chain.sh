#!/bin/bash
# 供应链安全检查脚本
# 用途：在 npm install 前后验证是否安装了恶意包

set -e

MALICIOUS_PACKAGES=(
  "audio-capture-napi"
  "color-diff-napi"
  "image-processor-napi"
  "modifiers-napi"
  "url-handler-napi"
)

MALICIOUS_AUTHOR="pacifier136"

echo "🔍 供应链安全检查..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 1: node_modules 中是否存在恶意包目录
echo ""
echo "📦 检查 1: 扫描 node_modules 中的可疑包..."
FOUND_DIRS=0
for pkg in "${MALICIOUS_PACKAGES[@]}"; do
  if [ -d "node_modules/$pkg" ]; then
    echo "  ❌ 发现可疑包目录: node_modules/$pkg"
    FOUND_DIRS=1
  fi
done

if [ $FOUND_DIRS -eq 0 ]; then
  echo "  ✅ 未发现可疑包目录"
fi

# 检查 2: package-lock.json 中是否有恶意包记录
echo ""
echo "🔒 检查 2: 扫描 package-lock.json..."
if [ -f "package-lock.json" ]; then
  FOUND_LOCK=0
  for pkg in "${MALICIOUS_PACKAGES[@]}"; do
    if grep -q "\"$pkg\"" package-lock.json; then
      echo "  ⚠️  在 package-lock.json 中发现: $pkg"
      FOUND_LOCK=1
    fi
  done

  if [ $FOUND_LOCK -eq 0 ]; then
    echo "  ✅ package-lock.json 干净"
  fi
else
  echo "  ℹ️  package-lock.json 不存在（使用 Bun）"
fi

# 检查 3: bun.lockb 二进制锁文件（仅提示）
echo ""
echo "🔒 检查 3: bun.lock 状态..."
if [ -f "bun.lock" ]; then
  LOCK_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" bun.lock 2>/dev/null || stat -c "%y" bun.lock 2>/dev/null)
  echo "  ℹ️  bun.lock 最后更新: $LOCK_DATE"
  echo "  ⚠️  如果此时间在 2026-03-31 00:21-03:29 UTC 之间，需要重新安装"
else
  echo "  ❌ bun.lock 不存在"
fi

# 检查 4: 使用 npm ls 检查依赖树（如果有 npm）
echo ""
echo "🌳 检查 4: 扫描依赖树..."
if command -v npm &> /dev/null; then
  FOUND_DEPS=0
  for pkg in "${MALICIOUS_PACKAGES[@]}"; do
    if npm ls "$pkg" 2>/dev/null | grep -q "$pkg"; then
      echo "  ❌ 在依赖树中发现: $pkg"
      FOUND_DEPS=1
    fi
  done

  if [ $FOUND_DEPS -eq 0 ]; then
    echo "  ✅ 依赖树中未发现可疑包"
  fi
else
  echo "  ⚠️  npm 不可用，跳过依赖树检查"
fi

# 检查 5: 验证 axios 版本
echo ""
echo "🔧 检查 5: 验证 axios 版本..."
if [ -f "node_modules/axios/package.json" ]; then
  if command -v jq &> /dev/null; then
    AXIOS_VERSION=$(jq -r '.version' node_modules/axios/package.json 2>/dev/null || echo "unknown")
    AXIOS_AUTHOR=$(jq -r 'if .author then (if .author | type == "string" then .author else .author.name end) else "unknown" end' node_modules/axios/package.json 2>/dev/null || echo "unknown")
    echo "  📍 axios 版本: $AXIOS_VERSION"
    echo "  👤 axios 作者: $AXIOS_AUTHOR"

    # 检查是否有异常的 postinstall 脚本
    if jq -e '.scripts.postinstall' node_modules/axios/package.json > /dev/null 2>&1; then
      echo "  ⚠️  axios 包含 postinstall 脚本，请检查："
      jq '.scripts.postinstall' node_modules/axios/package.json
    else
      echo "  ✅ axios 无可疑脚本"
    fi
  else
    # 如果没有 jq，使用 grep 简单检查
    AXIOS_VERSION=$(grep '"version"' node_modules/axios/package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
    echo "  📍 axios 版本: $AXIOS_VERSION"
    if grep -q '"postinstall"' node_modules/axios/package.json; then
      echo "  ⚠️  axios 包含 postinstall 脚本"
    else
      echo "  ✅ axios 无可疑脚本"
    fi
  fi
else
  echo "  ❌ axios 未安装"
fi

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FOUND_DIRS -eq 0 ] && [ $FOUND_LOCK -eq 0 ] && [ $FOUND_DEPS -eq 0 ]; then
  echo "✅ 供应链检查通过"
  exit 0
else
  echo "❌ 发现安全风险，请勿使用此 node_modules"
  echo ""
  echo "🛡️ 建议操作："
  echo "  1. rm -rf node_modules package-lock.json"
  echo "  2. 使用 bun install（推荐）或 npm install --ignore-scripts"
  echo "  3. 重新运行此脚本验证"
  exit 1
fi
