#!/bin/bash
# 模拟供应链投毒场景（安全测试，不实际安装恶意包）

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 模拟供应链投毒检测失败场景"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  注意：这是一个安全的模拟测试，不会真的安装恶意包"
echo ""

# 备份原始状态
BACKUP_DIR=".test-backup-$(date +%s)"
echo "📦 创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 创建模拟的恶意包目录
echo ""
echo "🎭 步骤 1: 模拟恶意包进入 node_modules..."
echo ""

MALICIOUS_PKG="node_modules/audio-capture-napi"
mkdir -p "$MALICIOUS_PKG"

cat > "$MALICIOUS_PKG/package.json" << 'EOF'
{
  "name": "audio-capture-napi",
  "version": "1.0.0",
  "description": "Malicious package (simulated)",
  "author": "pacifier136",
  "main": "index.js"
}
EOF

cat > "$MALICIOUS_PKG/index.js" << 'EOF'
// 模拟的恶意代码
console.log("This is a simulated malicious package");
module.exports = {};
EOF

echo "   ✓ 已创建模拟恶意包: $MALICIOUS_PKG"

# 模拟 npm install 的输出
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 模拟 npm install 行为"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$ npm install"
echo ""
echo "added 206 packages in 45s"
echo ""
echo "> @anthropic-ai/claude-code@2.1.88 postinstall"
echo "> bash check-supply-chain.sh || exit 1"
echo ""

# 运行检查脚本（会失败）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 运行供应链检查..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 实际运行检查（会检测到恶意包）
if ./check-supply-chain.sh 2>&1; then
  echo ""
  echo "❌ 测试失败：检查脚本应该失败但却通过了"
  exit 1
else
  EXIT_CODE=$?
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ npm install 失败（退出代码: $EXIT_CODE）"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🛡️  防护机制成功阻止了恶意包的安装！"
  echo ""
  echo "📝 实际场景中会发生："
  echo "   1. ❌ npm install 终止（退出代码非 0）"
  echo "   2. ❌ node_modules 不可用"
  echo "   3. ⚠️  显示清理建议"
  echo "   4. 🚨 用户收到警告，不会使用被污染的依赖"
  echo ""
fi

# 清理模拟的恶意包
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 清理测试环境..."
rm -rf "$MALICIOUS_PKG"
rm -rf "$BACKUP_DIR"
echo "   ✓ 已清理模拟恶意包"
echo ""

# 验证环境恢复正常
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 验证环境已恢复正常"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ./check-supply-chain.sh > /dev/null 2>&1; then
  echo "✅ 供应链检查通过 - 环境安全"
else
  echo "❌ 环境仍有问题，请手动检查"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 测试总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "本次测试演示了："
echo ""
echo "  ✓ 恶意包进入 node_modules 后会被立即检测"
echo "  ✓ postinstall 钩子会失败并返回非 0 退出代码"
echo "  ✓ npm install 整体失败，保护用户环境"
echo "  ✓ 清晰的错误信息指导用户清理"
echo "  ✓ 清理后环境可以恢复正常"
echo ""
echo "🛡️  您的自动投毒检测系统工作正常！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
