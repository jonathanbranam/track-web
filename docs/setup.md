# First-Time EC2 Setup

## Prerequisites

- EC2 instance running Amazon Linux 2023 or Ubuntu 22+
- DuckDNS subdomain pointing at the EC2's public IP
- Ports 22, 80, 443 open in the EC2 security group

---

## 1. Install Node.js 20+

```bash
# Amazon Linux 2023
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

Verify: `node --version`

---

## 2. Install pm2

```bash
sudo npm install -g pm2
```

---

## 3. Install Caddy

```bash
# Amazon Linux 2023
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable -y @caddy/caddy
sudo dnf install -y caddy

# Ubuntu
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
npm ci -w client
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

Edit `/etc/caddy/Caddyfile` (or use the repo's `Caddyfile`):
```
yourapp.duckdns.org {
    reverse_proxy localhost:3000
}
```

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
