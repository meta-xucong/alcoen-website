#!/bin/bash
set -e

# ==========================================
# Alcoen Website - Environment Installer
# Supports: Alibaba Cloud Linux / CentOS / RHEL / Ubuntu / Debian
# ==========================================

echo "==> Detecting OS..."
OS_ID=$(awk -F= '/^ID=/{print $2}' /etc/os-release | tr -d '"')
OS_LIKE=$(awk -F= '/^ID_LIKE=/{print $2}' /etc/os-release | tr -d '"')

PM=""
if command -v dnf &>/dev/null; then
    PM="dnf"
elif command -v yum &>/dev/null; then
    PM="yum"
elif command -v apt &>/dev/null; then
    PM="apt"
else
    echo "ERROR: Unsupported package manager. Please use a system with dnf, yum or apt."
    exit 1
fi

echo "==> Package manager: $PM"

# 1. Git
if command -v git &>/dev/null; then
    echo "[OK] git installed: $(git --version)"
else
    echo "==> Installing git..."
    if [[ "$PM" == "apt" ]]; then
        apt-get update && apt-get install -y git
    else
        $PM install -y git
    fi
fi

# 2. Node.js (require >= 18, prefer 20)
NODE_MAJOR=""
if command -v node &>/dev/null; then
    NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
fi

if [[ -n "$NODE_MAJOR" && "$NODE_MAJOR" -ge 18 ]]; then
    echo "[OK] Node.js installed: $(node -v)"
else
    echo "==> Installing Node.js 20 LTS..."
    if [[ "$PM" == "apt" ]]; then
        apt-get update
        apt-get install -y ca-certificates curl gnupg
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
        apt-get update && apt-get install -y nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $PM install -y nodejs
    fi
    echo "[OK] Node.js installed: $(node -v)"
fi

# 3. PM2
if command -v pm2 &>/dev/null; then
    echo "[OK] pm2 installed: $(pm2 --version)"
else
    echo "==> Installing PM2..."
    npm install -g pm2
    echo "[OK] pm2 installed"
fi

# 4. Caddy
if command -v caddy &>/dev/null; then
    echo "[OK] Caddy installed: $(caddy version | head -n1)"
else
    echo "==> Installing Caddy..."
    if [[ "$PM" == "apt" ]]; then
        apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
        apt-get update && apt-get install -y caddy
    else
        # Try COPR first for RHEL-like systems
        $PM install -y 'dnf-command(copr)' || true
        dnf copr enable @caddy/caddy -y 2>/dev/null || true
        $PM install -y caddy 2>/dev/null || {
            echo "==> Fallback: downloading Caddy binary directly..."
            curl -fsSL 'https://caddyserver.com/api/download?os=linux&arch=amd64' -o /usr/bin/caddy
            chmod +x /usr/bin/caddy
            setcap cap_net_bind_service=+ep /usr/bin/caddy 2>/dev/null || true
            # Create minimal systemd service
            cat > /etc/systemd/system/caddy.service <<'EOF'
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=root
Group=root
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF
            systemctl daemon-reload
            systemctl enable caddy
        }
    fi
    echo "[OK] Caddy installed: $(caddy version | head -n1)"
fi

# 5. Ensure Caddy config directory exists
mkdir -p /etc/caddy

echo ""
echo "=========================================="
echo "Environment check/installation complete!"
echo "Next step: run ./deploy.sh [your-domain.com]"
echo "=========================================="
