#!/bin/bash
# ============================================
# 就医助手 - 服务器端一键初始化脚本
# 在服务器上执行此脚本完成环境准备
# ============================================

set -e

echo "🚀 开始配置就医助手服务器..."

# ─── 1. 检查/安装 Node.js ───
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    echo "⬇️  安装 Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    echo "✅ Node.js $(node -v) installed"
else
    echo "✅ Node.js $(node -v) already installed"
fi

# 确保 node 在 /usr/bin/
if [ ! -f /usr/bin/node ] && command -v node &> /dev/null; then
    ln -sf "$(which node)" /usr/bin/node
fi
if [ ! -f /usr/bin/npm ] && command -v npm &> /dev/null; then
    ln -sf "$(which npm)" /usr/bin/npm
fi

# ─── 2. 创建目录 ───
mkdir -p /var/www/medical
mkdir -p /opt/medical-server
echo "✅ 目录已创建"

# ─── 3. 创建 Nginx 配置文件 ───
cat > /etc/nginx/sites-available/medical << 'EOF'
server {
    listen 8050;
    server_name _;

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        client_max_body_size 20M;
    }

    # 静态文件（React SPA）
    location / {
        root /var/www/medical;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
EOF
echo "✅ Nginx 配置已创建"

# ─── 4. 启用配置 ───
ln -sf /etc/nginx/sites-available/medical /etc/nginx/sites-enabled/medical

# 禁用默认配置（如果存在）
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
    echo "✅ 已禁用 Nginx 默认配置"
fi

# ─── 5. 检查 Nginx 配置并重启 ───
nginx -t
systemctl restart nginx
systemctl enable nginx
echo "✅ Nginx 重启完成"

# ─── 6. 防火墙放行 ───
if command -v ufw &> /dev/null; then
    ufw allow 8050/tcp || true
    echo "✅ 防火墙已放行 8050 端口"
fi

# ─── 7. 清理旧端口 ───
if command -v ufw &> /dev/null; then
    ufw delete allow 8080/tcp 2>/dev/null || true
fi

echo ""
echo "🎉 服务器初始化完成！"
echo "📍 访问地址: http://$(curl -s ifconfig.me):8050"
echo ""
echo "⚠️  注意：后端服务将由 GitHub Actions 自动部署和启动。"
echo "   如果后端未运行，请检查 /opt/medical-server/ 目录和 systemd 状态。"
