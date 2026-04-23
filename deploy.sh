#!/bin/bash

# dadanggeun.skrr.store Deployment Script
# 이 스크립트는 dadanggeun/ 폴더 내에서 실행하여 프로젝트를 배포합니다.

set -e

# 스크립트가 위치한 디렉토리를 절대 경로로 획득
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

SSH_ALIAS="skrr"
REMOTE_PATH="/var/www/dadanggeun"
NGINX_CONF="/etc/nginx/sites-available/dadanggeun"
NGINX_LINK="/etc/nginx/sites-enabled/dadanggeun"
DOMAIN="dadanggeun.skrr.store"

echo "========================================="
echo "Deploying Dadanggeun from: $SCRIPT_DIR"
echo "Target Domain: $DOMAIN"
echo "========================================="

# 1. 서버 디렉토리 생성 및 권한 설정
echo "[1/5] Preparing remote directory..."
ssh $SSH_ALIAS "sudo mkdir -p $REMOTE_PATH && sudo chown -R \$USER:\$USER $REMOTE_PATH"

# 2. 프론트엔드 빌드
echo "[2/5] Building React App..."
cd "$SCRIPT_DIR/frontend"

# 로컬 환경에서도 Node 버전 체크 (Vite 요구사항 방영)
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    if ! nvm use 22 &> /dev/null; then
        echo "Node 22 not found locally. Installing..."
        nvm install 22
        nvm use 22
    fi
fi

npm install
npm run build
cd "$SCRIPT_DIR"

# 3. 파일 업로드 (rsync)
echo "[3/5] Uploading files to server..."
# --exclude를 통해 DB와 업로드 파일이 덮어씌워지지 않도록 보호
rsync -avz \
  --exclude 'database.sqlite' \
  --exclude 'backend/uploads/' \
  --exclude 'backend/node_modules/' \
  --exclude 'frontend/node_modules/' \
  --exclude '.git/' \
  --delete --progress \
  "$SCRIPT_DIR/" $SSH_ALIAS:$REMOTE_PATH/

# 4. 백엔드 및 PM2 설정
echo "[4/5] Setting up Node Backend & PM2..."
ssh $SSH_ALIAS << 'ENDSSH'
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    if ! nvm use 20 &> /dev/null; then
        echo "Node 20 not found via NVM. Installing..."
        nvm install 20
        nvm use 20
    fi

    cd /var/www/dadanggeun/backend
    # node_modules 캐시 삭제 후 재설치 (충돌 방지)
    rm -rf node_modules package-lock.json
    npm install --production
    npm install -g pm2
    
    # PM2 프로세스 재시작 (없으면 새로 시작)
    pm2 restart dadanggeun-api || pm2 start src/server.js --name "dadanggeun-api"
    pm2 save
ENDSSH

# 5. Nginx & SSL 설정
echo "[5/5] Finalizing Nginx & HTTPS..."
ssh $SSH_ALIAS "sudo tee $NGINX_CONF > /dev/null <<'EOF'
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 50M;

    # HSTS 설정 (보안 강화)
    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;

    location / {
        root $REMOTE_PATH/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads/ {
        alias $REMOTE_PATH/backend/uploads/;
    }
}
EOF
sudo ln -sf $NGINX_CONF $NGINX_LINK
sudo nginx -t && sudo systemctl reload nginx

# Certbot 인증서 갱신/배포
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@skrr.store --redirect || echo 'SSL Setup Warning'"

echo ""
echo "========================================="
echo "Deployment Successful!"
echo "URL: https://$DOMAIN"
echo "========================================="
