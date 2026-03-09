# First-Time EC2 Setup

## Prerequisites

- EC2 instance running Amazon Linux 2023 or Ubuntu 22+
- DuckDNS subdomain pointing at the EC2's public IP
- Ports 22, 80, 443 open in the EC2 security group

---

## 1. Install Node.js 20+

```bash
# Amazon Linux 2023 — use nvm (NodeSource does not support AL2023)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

Verify: `node --version`

### Build tools (required for native packages like better-sqlite3)

```bash
# Amazon Linux 2023
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y python3
```

---

## 2. Install pm2

```bash
sudo npm install -g pm2
```

---

## 3. Install Caddy

**Amazon Linux 2023:** The Caddy COPR repository does not support AL2023. Install the binary directly from GitHub releases instead.

```bash
# Check https://github.com/caddyserver/caddy/releases for the latest version
# Use linux_arm64 for ARM instances, linux_amd64 for x86_64

# x86_64
curl -L "https://github.com/caddyserver/caddy/releases/latest/download/caddy_2.9.1_linux_amd64.tar.gz" -o caddy.tar.gz

# ARM64 (e.g. t4g instances)
curl -L "https://github.com/caddyserver/caddy/releases/latest/download/caddy_2.9.1_linux_arm64.tar.gz" -o caddy.tar.gz

tar -xzf caddy.tar.gz caddy
sudo mv caddy /usr/local/bin/
sudo chmod +x /usr/local/bin/caddy
rm caddy.tar.gz
```

Verify: `caddy version`

Set up Caddy as a systemd service (runs as root so it can bind ports 80/443 and read the Caddyfile):

```bash
sudo tee /etc/systemd/system/caddy.service > /dev/null <<'EOF'
[Unit]
Description=Caddy
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/caddy run --config /home/ec2-user/track-web/Caddyfile --adapter caddyfile
ExecReload=/usr/local/bin/caddy reload --config /home/ec2-user/track-web/Caddyfile --adapter caddyfile
TimeoutStopSec=5s
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

**Ubuntu:**

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

---

## 4. Clone the repo

```bash
cd ~
git clone <your-repo-url> track-web
cd track-web
```

---

## 5. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
EMAIL=you@example.com
SESSION_SECRET=$(openssl rand -hex 32)
PORT=3000
SQLITE_PATH=/home/ec2-user/track-web/data.db
```

Generate your password hash:
```bash
npm run hash-password
# Copy the output hash into .env as PASSWORD_HASH
```

---

## 6. Build and start the app

```bash
npm ci
npm run build
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
```

Enable pm2 to start on reboot:
```bash
pm2 startup
# Run the command it outputs (e.g. sudo env PATH=... pm2 startup systemd ...)
pm2 save
```

---

## 7. Configure and start Caddy

The repo's `Caddyfile` is used directly by the systemd service. Edit it to set your domain:

```
yourapp.duckdns.org {
    reverse_proxy localhost:3000
}
```

Then enable and start the service:

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

Caddy will auto-obtain a Let's Encrypt certificate on the first request.
Verify: `sudo systemctl status caddy`

---

## 8. Verify

1. Visit `https://yourapp.duckdns.org` — should show the login page
2. Log in with your configured email + password
3. Start a task, stop it, check the log tab

---

## Subsequent deploys

From your local machine:
```bash
EC2_HOST=yourapp.duckdns.org ./deploy.sh
```
