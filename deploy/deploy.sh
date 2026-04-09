#!/bin/bash
set -e

# ==========================================
# Alcoen Website - One-Click Deploy Script
# Usage:
#   ./deploy.sh              # Deploy with public IP (HTTPS via self-signed cert)
#   ./deploy.sh example.com  # Deploy with domain (HTTPS via Let's Encrypt)
# ==========================================

REPO_URL="https://github.com/meta-xucong/alcoen-website.git"
APP_DIR="/opt/alcoen-website"
DOMAIN="${1:-}"

# Auto-detect public IP if domain not provided
if [[ -z "$DOMAIN" ]]; then
    echo "==> Detecting public IP..."
    DOMAIN=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "")
    if [[ -z "$DOMAIN" ]]; then
        echo "ERROR: Could not detect public IP. Please provide it as argument: ./deploy.sh <IP_OR_DOMAIN>"
        exit 1
    fi
    echo "==> Public IP: $DOMAIN"
fi

echo "==> Target domain/IP: $DOMAIN"

# Backup existing data before pulling
BACKUP_DIR="/tmp/alcoen-backup-$(date +%s)"
if [[ -d "$APP_DIR" ]]; then
    mkdir -p "$BACKUP_DIR"
    if [[ -f "$APP_DIR/data/site.json" ]]; then
        cp "$APP_DIR/data/site.json" "$BACKUP_DIR/site.json"
        echo "==> Backed up data/site.json"
    fi
    if [[ -d "$APP_DIR/public/uploads" ]]; then
        cp -r "$APP_DIR/public/uploads" "$BACKUP_DIR/uploads"
        echo "==> Backed up public/uploads"
    fi
fi

# Clone or update code
if [[ -d "$APP_DIR/.git" ]]; then
    echo "==> Pulling latest code..."
    cd "$APP_DIR"
    git reset --hard
    git clean -fd
    git pull origin master
else
    echo "==> Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Restore backups
if [[ -f "$BACKUP_DIR/site.json" ]]; then
    cp "$BACKUP_DIR/site.json" "$APP_DIR/data/site.json"
    echo "==> Restored data/site.json"
fi
if [[ -d "$BACKUP_DIR/uploads" ]]; then
    cp -r "$BACKUP_DIR/uploads/"* "$APP_DIR/public/uploads/" 2>/dev/null || true
    echo "==> Restored public/uploads"
fi

# Ensure directories exist
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/public/uploads"

# Install dependencies
echo "==> Installing npm dependencies..."
cd "$APP_DIR"
npm install --production

# Start / restart app with PM2
echo "==> Starting application with PM2..."
pm2 delete alcoen-website 2>/dev/null || true
pm2 start server.js --name alcoen-website --update-env
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Configure Caddy
echo "==> Configuring Caddy..."
mkdir -p /etc/caddy

if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    TLS_DIRECTIVE="tls internal"
    echo "==> IP address detected. Caddy will use a self-signed certificate (browser will show a warning, click 'Advanced -> Proceed' to continue)."
else
    TLS_DIRECTIVE=""
    echo "==> Domain detected. Caddy will automatically obtain a Let's Encrypt certificate."
fi

cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    encode gzip
    reverse_proxy localhost:3000
    $TLS_DIRECTIVE
}
EOF

# Start Caddy
echo "==> Restarting Caddy..."
if systemctl is-active caddy &>/dev/null || systemctl is-enabled caddy &>/dev/null; then
    systemctl restart caddy
    systemctl enable caddy
else
    # Fallback for direct binary installs without systemd active
    pkill caddy 2>/dev/null || true
    nohup caddy run --config /etc/caddy/Caddyfile &>/var/log/caddy.log &
    sleep 2
fi

echo ""
echo "=========================================="
echo " Deployment Complete!"
echo "=========================================="
echo " Website (frontend):  https://$DOMAIN"
echo " Admin panel:         https://$DOMAIN/admin.html"
echo ""
if [[ -n "$TLS_DIRECTIVE" ]]; then
    echo " NOTE: You are accessing via IP. The HTTPS certificate is self-signed."
    echo "       Browsers will show a security warning on first visit — this is normal."
    echo "       After you point a domain to this server, re-run:"
    echo "       ./deploy.sh your-domain.com"
fi
echo "=========================================="
