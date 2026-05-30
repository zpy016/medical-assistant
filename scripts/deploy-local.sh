#!/bin/bash
# ============================================
# 本地一键部署脚本
# 用法: ./scripts/deploy-local.sh "提交描述"
# ============================================

MSG=${1:-"update: $(date '+%Y-%m-%d %H:%M')"}

echo "📦 添加文件..."
git add .

echo "💾 提交: $MSG"
git commit -m "$MSG" || echo "⚠️ 没有变更需要提交"

echo "🚀 推送到 GitHub..."
git push origin main

echo ""
echo "✅ 已推送！GitHub Actions 将自动部署到服务器。"
echo "⏱️ 约 1-2 分钟后生效。"
echo "📍 访问地址: http://69.5.21.128:8050"
