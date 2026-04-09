# Alcoen Website 一键部署方案

> **目标**：在任意一台空白 VPS 上，通过一条命令完成环境检查、安装、代码拉取、SSL 配置和上线，实现 **IP 直连 HTTPS**，后续绑定域名后自动切换为正式证书。

---

## 一、方案概述

| 组件 | 作用 |
|------|------|
| **Node.js + PM2** | 运行后端服务（`server.js`，默认端口 `3000`） |
| **Caddy** | 反向代理 + HTTPS 自动证书管理。IP 访问时自动生成自签名证书；域名访问时自动申请 Let's Encrypt 正式证书。 |
| **Git** | 从 GitHub 拉取最新源码 |
| **部署脚本** | 自动检查缺失环境、安装依赖、备份数据、启动服务 |

**前后端入口：**
- 前端网站：`https://<IP_OR_DOMAIN>/`
- 管理后台：`https://<IP_OR_DOMAIN>/admin.html`

---

## 二、前置要求

1. **VPS 规格**：1 核 2G 及以上，推荐 **Alibaba Cloud Linux 3 / CentOS 8 / Ubuntu 20.04+ / Debian 11+**
2. **网络**：安全组/防火墙必须放行 **TCP 80、443、3000** 端口（3000 用于本地回环，外部只需 80 和 443）
3. **root 权限**：部署脚本需要在 root 用户下执行（用于安装系统包和绑定 80/443 端口）

> 💡 **阿里云/腾讯云用户注意**：请在控制台 → 安全组 → 入方向规则中，添加允许 `0.0.0.0/0` 访问 **80** 和 **443** 的规则。

---

## 三、快速开始（只需一条命令）

### 3.1 通过 IP 直接 HTTPS 访问（适合没有域名时）

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/meta-xucong/alcoen-website/master/deploy/install.sh) \
  && bash <(curl -fsSL https://raw.githubusercontent.com/meta-xucong/alcoen-website/master/deploy/deploy.sh)
```

运行结束后，终端会输出访问地址，例如：

```
Website (frontend):  https://101.133.234.199
Admin panel:         https://101.133.234.199/admin.html
```

> ⚠️ 通过 IP 访问时，浏览器会提示“您的连接不是私密连接”，这是因为使用的是 **Caddy 自签名证书**。点击“高级”→“继续前往”即可正常访问。后续绑定域名后会自动变为受信任的正式证书。

### 3.2 绑定域名后部署（自动正式 HTTPS）

先将域名的 A 记录解析到 VPS 的公网 IP，然后运行：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/meta-xucong/alcoen-website/master/deploy/install.sh) \
  && bash <(curl -fsSL https://raw.githubusercontent.com/meta-xucong/alcoen-website/master/deploy/deploy.sh) your-domain.com
```

Caddy 会自动向 Let's Encrypt 申请证书，无需手动操作，且到期自动续期。

---

## 四、分步说明（推荐下载到服务器执行）

如果你希望把脚本下载到服务器上以便复用，按以下步骤操作：

### 步骤 1：SSH 登录服务器

```bash
ssh root@<YOUR_SERVER_IP>
```

### 步骤 2：下载脚本

```bash
mkdir -p /opt/deploy-scripts && cd /opt/deploy-scripts
curl -fsSL -O https://raw.githubusercontent.com/meta-xucong/alcoen-website/master/deploy/install.sh
curl -fsSL -O https://raw.githubusercontent.com/meta-xucong/alcoen-website/master/deploy/deploy.sh
chmod +x install.sh deploy.sh
```

### 步骤 3：运行环境检查与安装

```bash
./install.sh
```

此脚本会检查并自动安装：**Git、Node.js 20 LTS、PM2、Caddy**。如果已安装且版本符合要求，会跳过。

### 步骤 4：运行部署脚本

```bash
# 仅使用 IP（自签名 HTTPS）
./deploy.sh

# 或使用域名（自动正式 HTTPS）
./deploy.sh your-domain.com
```

部署流程：
1. 从 GitHub `master` 分支拉取/更新代码到 `/opt/alcoen-website`
2. 自动备份并恢复 `data/site.json` 和 `public/uploads/`（防止更新覆盖已有数据）
3. 执行 `npm install --production`
4. 使用 **PM2** 启动/重启 `server.js`，并设置开机自启
5. 生成 Caddy 配置文件，启动/重启 Caddy

---

## 五、日常运维命令

### 查看服务状态

```bash
# 查看 Node.js 应用状态
pm2 status

# 查看 Caddy 状态
systemctl status caddy
```

### 更新网站代码

```bash
cd /opt/alcoen-website
git pull
npm install --production
pm2 reload alcoen-website
```

或直接重新运行：

```bash
/opt/deploy-scripts/deploy.sh [your-domain.com]
```

### 手动备份数据

```bash
cp /opt/alcoen-website/data/site.json /root/site-backup.json
cp -r /opt/alcoen-website/public/uploads /root/uploads-backup
```

### 查看日志

```bash
# 应用日志
pm2 logs alcoen-website

# Caddy 日志 (systemd)
journalctl -u caddy -f

# Caddy 日志 (fallback 无 systemd)
tail -f /var/log/caddy.log
```

---

## 六、目录结构说明

| 路径 | 说明 |
|------|------|
| `/opt/alcoen-website` | 网站源码目录 |
| `/opt/alcoen-website/data/site.json` | 网站内容数据库（会自动备份） |
| `/opt/alcoen-website/public/uploads` | 用户上传的图片/附件目录（会自动备份） |
| `/etc/caddy/Caddyfile` | Caddy 反向代理与 HTTPS 配置 |

---

## 七、常见问题

### Q1：为什么 IP 访问时浏览器提示不安全？

因为公网 CA（如 Let's Encrypt）不为纯 IP 地址签发证书。Caddy 在检测到 IP 地址时，会自动使用内置的 **自签名证书**（`tls internal`）来启用 HTTPS，因此浏览器会提示风险，但数据传输仍然是加密的。绑定域名并重新运行 `./deploy.sh your-domain.com` 后即可消除警告。

### Q2：域名解析后如何切换到正式 HTTPS？

只需将域名 A 记录指向 VPS IP，然后执行：

```bash
/opt/deploy-scripts/deploy.sh your-domain.com
```

Caddy 会自动申请 Let's Encrypt 证书并替换旧配置。

### Q3：如果已经用 IP 部署过，切换到域名后原来的数据会丢失吗？

不会。`deploy.sh` 会在更新代码前自动备份 `data/site.json` 和 `public/uploads/`，并在更新后自动恢复。

### Q4：支持哪些 Linux 发行版？

已适配：
- **Alibaba Cloud Linux 3**（ CentOS/RHEL 系）
- **CentOS 7/8/Stream**
- **Ubuntu 20.04 / 22.04 / 24.04**
- **Debian 11 / 12**

---

## 八、技术栈版本

- **Node.js**：20.x LTS
- **PM2**：latest
- **Caddy**：2.x

---

## 九、文件说明

本部署方案涉及 3 个文件，均位于仓库 `deploy/` 目录下：

| 文件 | 说明 |
|------|------|
| `deploy/install.sh` | 环境检查与安装脚本 |
| `deploy/deploy.sh` | 一键部署脚本 |
| `deploy/Caddyfile.tpl` | Caddy 配置模板（由 `deploy.sh` 动态生成最终配置） |

---

*最后更新：2026-04-09*
