#!/bin/bash
# ============================================
# 就医助手 - 服务器端部署脚本
# 在服务器上执行此脚本完成配置
# ============================================

set -e

echo "🚀 开始配置就医助手服务器..."

# 1. 创建网站目录
mkdir -p /var/www/medical
echo "✅ 创建目录 /var/www/medical"

# 2. 创建 Nginx 配置文件
cat > /etc/nginx/sites-available/medical << 'EOF'
server {
    listen 8050;
    server_name _;

    root /var/www/medical;
    index index.html;

    # SPA 路由支持（React Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
EOF
echo "✅ Nginx 配置已创建（端口 8050）"

# 3. 启用配置
ln -sf /etc/nginx/sites-available/medical /etc/nginx/sites-enabled/medical

# 4. 检查 Nginx 配置并重启
nginx -t
systemctl restart nginx
systemctl enable nginx
echo "✅ Nginx 重启完成"

# 5. 防火墙放行 8050 端口（如果 ufw 已启用）
if command -v ufw &> /dev/null; then
    ufw allow 8050/tcp || true
    echo "✅ 防火墙已放行 8050 端口"
fi

echo ""
echo "🎉 服务器配置完成！"
echo "📍 访问地址: http://$(curl -s ifconfig.me):8050"
