#!/bin/bash
# 测试自动投毒检测是否工作

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 测试自动投毒检测机制"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 1: 验证 postinstall 钩子配置
echo "✅ 测试 1: 检查 package.json 中的钩子配置"
if grep -q '"postinstall".*check-supply-chain.sh' package.json; then
  echo "   ✓ postinstall 钩子已配置"
else
  echo "   ✗ postinstall 钩子未配置"
  exit 1
fi

if grep -q '"check-security".*check-supply-chain.sh' package.json; then
  echo "   ✓ check-security 命令已配置"
else
  echo "   ✗ check-security 命令未配置"
  exit 1
fi

# 测试 2: 验证检查脚本存在且可执行
echo ""
echo "✅ 测试 2: 检查脚本文件状态"
if [ -f "check-supply-chain.sh" ]; then
  echo "   ✓ check-supply-chain.sh 存在"
else
  echo "   ✗ check-supply-chain.sh 不存在"
  exit 1
fi

if [ -x "check-supply-chain.sh" ]; then
  echo "   ✓ check-supply-chain.sh 可执行"
else
  echo "   ✗ check-supply-chain.sh 不可执行"
  exit 1
fi

# 测试 3: 运行检查脚本
echo ""
echo "✅ 测试 3: 运行供应链检查"
if ./check-supply-chain.sh > /dev/null 2>&1; then
  echo "   ✓ 检查脚本运行成功"
else
  echo "   ✗ 检查脚本运行失败"
  exit 1
fi

# 测试 4: 验证 npm 命令
echo ""
echo "✅ 测试 4: 验证 npm 命令"
if npm run check-security > /dev/null 2>&1; then
  echo "   ✓ npm run check-security 可用"
else
  echo "   ⚠  npm run check-security 失败（可能是 npm 未安装）"
fi

# 测试 5: 验证 Git hooks
echo ""
echo "✅ 测试 5: 检查 Git hooks"
if [ -f ".husky/post-merge" ] && [ -x ".husky/post-merge" ]; then
  echo "   ✓ post-merge hook 已配置"
else
  echo "   ⚠  post-merge hook 未配置或不可执行"
fi

if [ -f ".husky/post-checkout" ] && [ -x ".husky/post-checkout" ]; then
  echo "   ✓ post-checkout hook 已配置"
else
  echo "   ⚠  post-checkout hook 未配置或不可执行"
fi

# 测试 6: 验证 overrides 配置
echo ""
echo "✅ 测试 6: 验证 package.json overrides"
MALICIOUS_PACKAGES=("audio-capture-napi" "color-diff-napi" "image-processor-napi" "modifiers-napi" "url-handler-napi")
OVERRIDES_OK=true

for pkg in "${MALICIOUS_PACKAGES[@]}"; do
  if grep -q "\"$pkg\"" package.json && grep -A1 "\"$pkg\"" package.json | grep -q "nonexistent-package"; then
    echo "   ✓ $pkg 已被 override 阻止"
  else
    echo "   ✗ $pkg 未被正确配置"
    OVERRIDES_OK=false
  fi
done

if [ "$OVERRIDES_OK" = true ]; then
  echo "   ✓ 所有恶意包已被 overrides 阻止"
else
  exit 1
fi

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 所有测试通过！自动检测机制工作正常"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 自动触发场景："
echo "   1. npm install / bun install 后"
echo "   2. git pull / git merge 后（如果依赖文件改变）"
echo "   3. git checkout 切换分支（提示需要重装）"
echo "   4. 手动运行: npm run check-security"
echo ""
