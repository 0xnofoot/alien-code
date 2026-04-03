#!/bin/bash
# 演示自动检测机制（不实际安装依赖）

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎬 自动投毒检测机制演示"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 场景 1: 模拟 npm install 的 postinstall 钩子
echo "📦 场景 1: npm install 后自动检测"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$ npm install"
echo ""
echo "添加了 123 个包，已审计 456 个包"
echo ""
echo "> @anthropic-ai/claude-code@2.1.88 postinstall"
echo "> bash check-supply-chain.sh || exit 1"
echo ""

# 实际运行检查（隐藏详细输出，只显示结果）
if ./check-supply-chain.sh > /tmp/check-output.txt 2>&1; then
  cat /tmp/check-output.txt
  echo ""
  echo "✅ npm install 成功完成"
else
  cat /tmp/check-output.txt
  echo ""
  echo "❌ npm install 失败：发现供应链安全风险"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 场景 2: 模拟检测到恶意包的情况
echo "📦 场景 2: 检测到恶意包时的行为"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "假设 node_modules 中出现了恶意包..."
echo ""

# 创建一个临时的恶意包目录来演示
TEST_DIR="node_modules/audio-capture-napi-TEST"
mkdir -p "$TEST_DIR"
echo '{"name":"audio-capture-napi","version":"1.0.0"}' > "$TEST_DIR/package.json"

echo "$ npm install"
echo ""
echo "添加了 123 个包，已审计 456 个包"
echo ""
echo "> @anthropic-ai/claude-code@2.1.88 postinstall"
echo "> bash check-supply-chain.sh || exit 1"
echo ""

# 运行检查（会失败因为有恶意包）
if ls node_modules/ | grep -q "audio-capture-napi-TEST"; then
  echo "🔍 供应链安全检查..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📦 检查 1: 扫描 node_modules 中的可疑包..."
  echo "  ❌ 发现可疑包目录: node_modules/audio-capture-napi-TEST"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ 发现安全风险，请勿使用此 node_modules"
  echo ""
  echo "🛡️ 建议操作："
  echo "  1. rm -rf node_modules package-lock.json"
  echo "  2. 使用 bun install（推荐）或 npm install --ignore-scripts"
  echo "  3. 重新运行此脚本验证"
  echo ""
  echo "❌ npm install 失败（退出代码 1）"
fi

# 清理测试目录
rm -rf "$TEST_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 场景 3: 手动运行检查
echo "📦 场景 3: 手动运行安全检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$ npm run check-security"
echo ""
npm run check-security 2>&1 | sed 's/^/  /'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 关键要点："
echo ""
echo "  ✓ 每次 npm install/bun install 后自动检查"
echo "  ✓ 发现问题时安装会失败，保护您的环境"
echo "  ✓ 可以随时手动运行: npm run check-security"
echo "  ✓ Git pull/merge 时也会自动检查依赖变更"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
