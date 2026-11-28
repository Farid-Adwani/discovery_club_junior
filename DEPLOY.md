# Hosting on a VPS

The whole site runs as **one Node process** on your server:

- the website (the built React app in `dist/`),
- the API (`/api/...`),
- the uploaded images (`/uploads/...`), saved in `data/uploads/`,
- the database, a single SQLite file: `data/club.db`.

Nothing else is needed: no Firebase, no database server. **`data/` is everything the club has**: back it up (see the end).

nginx sits in front of it for the domain name and HTTPS.

The commands below are for Ubuntu 24.04. A small VPS (1 vCPU, 1 GB RAM) is enough.

---

## 1. Prepare the server

Point your domain at the server first (an `A` record for `example.tn` and `www.example.tn` → the VPS's IP address).

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx certbot python3-certbot-nginx

# Node.js 22 (22.13 or newer: the database uses Node's built-in SQLite)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version

# A user for the site, and the firewall
sudo adduser --disabled-password --gecos "" club
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 2. Install the site

```bash
sudo -iu club
git clone <your repository URL> site
cd site
npm ci
npm run build
cp .env.example .env
chmod 600 .env          # it holds the push private key: readable by the site's user only
nano .env
```

In `.env`, set at least:

```ini
ADMIN_EMAILS="you@example.com"
PORT=8080
TRUST_PROXY="loopback"      # required behind nginx: without it every visitor shares one address for the sign-in limits
VAPID_PUBLIC_KEY="..."      # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@example.com"
```

## 3. Bring the data

**Moving from Firebase** (once). On your own computer, where the Firebase key is set in `.env`:

```bash
npm run import:firebase
```

It reads every Firestore collection and every uploaded image (Firebase is not changed) and writes them into `data/`. Then copy that folder to the server:

```bash
rsync -a data/ club@<server>:site/data/
```

Accounts, passwords and sign-ins come along, so everyone signs in as before.

Once the import is done, the Firebase key is no longer needed: delete it in the Google Cloud console
(IAM & Admin → Service accounts → the firebase-adminsdk account → Keys) and remove the file and the
`FIREBASE_SERVICE_ACCOUNT_PATH` line from `.env`.

**Or a fresh start**, on the server:

```bash
npm run seed                                   # classes, coaches and shop items to start with
npm run set-password -- you@example.com "a-strong-password"
```

Either way, keep the club's data private to the site's user (children's details and password hashes):

```bash
chmod 700 data && chmod 600 data/club.db*
```

To add an admin later, put the email in `ADMIN_EMAILS` and run `npm run set-password` for it: an account
someone made on the sign-up page with that email never becomes admin until the password is set this way.

## 4. Keep it running (systemd)

As your normal (sudo) user, create `/etc/systemd/system/discovery-club.service`:

```ini
[Unit]
Description=Discovery Club Junior website
After=network.target

[Service]
User=club
WorkingDirectory=/home/club/site
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now discovery-club
sudo systemctl status discovery-club      # should say "active (running)"
journalctl -u discovery-club -f           # the logs
```

The server listens on `127.0.0.1:8080` only: visitors reach it through nginx.

## 5. Domain and HTTPS (nginx)

Create `/etc/nginx/sites-available/discovery-club` (use your domain):

```nginx
server {
    listen 80;
    server_name example.tn www.example.tn;

    # Photos are sent as text inside the request: allow a few MB (nginx refuses more than 1 MB by default)
    client_max_body_size 5m;
    # Don't tell visitors the nginx version (the site sends its own security headers)
    server_tokens off;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/discovery-club /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.tn -d www.example.tn     # HTTPS, renewed automatically
```

HTTPS is required for push notifications and for installing the site on a phone.

Then update the domain in `index.html` (canonical URL, link preview), `SITE_URL` in `src/utils/routes.ts`, `public/robots.txt` and `public/sitemap.xml`, and rebuild.

## 6. Updating the site

```bash
sudo -iu club
cd site
git pull
npm ci
npm run build
exit
sudo systemctl restart discovery-club
```

`data/` is not touched by updates.

## 7. Backups (every night, to Google Drive)

`deploy/backup-to-drive.sh` copies the database (safe while the site runs) and the images (`data/uploads/`) into one encrypted file. It keeps 14 days of these files on the server in `~club/backups/`, and uploads each one to a `DiscoveryClubJunior-backups` folder in Google Drive, which keeps 90 days. A systemd timer runs it every night at 03:30.

One-time setup, as root:

```bash
SITE=/home/club/site      # where the site is (/srv/discovery-club/site on our VPS)
apt install -y rclone
```

**1. The encryption passphrase.** The script refuses to run without it. Save a copy in your password manager: without it, the backups cannot be opened.

```bash
sudo -u club -H sh -c 'umask 077; openssl rand -base64 32 > ~/.backup-passphrase'
cat ~club/.backup-passphrase
```

**2. Connect Google Drive.** rclone signs in through a web page on port 53682 of the server. Forward that port so the page opens in your computer's browser:

```bash
ssh -L 53682:127.0.0.1:53682 root@<server>                  # from your computer
sudo -u club -H rclone config create gdrive drive scope=drive.file
```

Open the `http://127.0.0.1:53682/auth?...` link it prints, sign in with the Google account that should hold the backups, and allow. With `scope=drive.file`, rclone only sees the files it creates, not the rest of that Drive.

**3. The nightly timer**

```bash
cat > /etc/systemd/system/discovery-club-backup.service <<EOF
[Unit]
Description=Discovery Club Junior backup to Google Drive
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=club
Group=club
ExecStart=$SITE/deploy/backup-to-drive.sh
Nice=10
NoNewPrivileges=true
PrivateTmp=true
EOF

cat > /etc/systemd/system/discovery-club-backup.timer <<EOF
[Unit]
Description=Nightly Discovery Club Junior backup

[Timer]
OnCalendar=*-*-* 03:30
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now discovery-club-backup.timer
systemctl start discovery-club-backup                 # a first backup right now
journalctl -u discovery-club-backup -n 5 --no-pager
```

The last line should say `Backed up discovery-club-….tar.gz.gpg (…) to gdrive:DiscoveryClubJunior-backups`, and the file appears in Drive.

Admins also have a **Back up now** button on their dashboard. It runs the same script from the site's own service. If that service is sandboxed with `ProtectSystem=strict`, let it write the backups and rclone's sign-in: add `-/home/club/backups -/home/club/.config/rclone` to its `ReadWritePaths=` line, then `systemctl daemon-reload && systemctl restart discovery-club`. Later: `systemctl list-timers discovery-club-backup` shows the last and next run, `journalctl -u discovery-club-backup` shows what happened.

To restore a backup (from `~club/backups/`, or downloaded from Drive):

```bash
mkdir -p /tmp/restore && cd /tmp/restore
sudo -u club -H rclone copy gdrive:DiscoveryClubJunior-backups/discovery-club-2026-11-29-0330.tar.gz.gpg .
gpg --pinentry-mode loopback -o backup.tar.gz -d discovery-club-2026-11-29-0330.tar.gz.gpg   # asks for the passphrase
tar -xzf backup.tar.gz                                # -> club.db and uploads/

systemctl stop discovery-club
install -o club -g club -m 600 club.db $SITE/data/club.db
rm -f $SITE/data/club.db-wal $SITE/data/club.db-shm
rsync -a --chown=club:club uploads/ $SITE/data/uploads/
systemctl start discovery-club
```

`npm run backup` still makes a quick database-only copy in `data/backups/`, for example before a risky change.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run set-password -- <email> <password>` | Creates an account or changes its password (works while the site runs) |
| `npm run backup` | Copies the database to `data/backups/` |
| `sudo systemctl start discovery-club-backup` | Backs up the database and images to Google Drive now |
| `journalctl -u discovery-club -f` | Live logs |
| `sudo systemctl restart discovery-club` | Restart after an update or a change in `.env` |
