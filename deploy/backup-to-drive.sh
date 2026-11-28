#!/usr/bin/env bash
# Nightly backup of everything the club has: the database (data/club.db) and the
# uploaded images (data/uploads/), in one encrypted file, copied to Google Drive.
#
# Runs as the site's user (club) from discovery-club-backup.timer.
# Setup and restore: DEPLOY.md, section 7.
set -euo pipefail
umask 077

SITE="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$(cd "$SITE" && realpath "${DATA_DIR:-data}")"
BACKUPS="${BACKUPS:-$HOME/backups}"
PASSFILE="${PASSFILE:-$HOME/.backup-passphrase}"
REMOTE="${REMOTE:-gdrive:DiscoveryClubJunior-backups}"
KEEP_LOCAL_DAYS="${KEEP_LOCAL_DAYS:-14}"
KEEP_DRIVE_DAYS="${KEEP_DRIVE_DAYS:-90}"

[ -s "$PASSFILE" ] || { echo "Missing passphrase file $PASSFILE (see DEPLOY.md, section 7)" >&2; exit 1; }

name="discovery-club-$(date +%F-%H%M).tar.gz.gpg"
work="$(mktemp -d)"
trap 'gpgconf --homedir "$work/gnupg" --kill gpg-agent 2>/dev/null || true; rm -rf "$work"' EXIT
mkdir -p "$BACKUPS"

# One backup at a time (the nightly timer and the admin's "Back up now" button)
exec 9>"$BACKUPS/.lock"
flock -w 40 9 || { echo "Another backup is still running, try again in a minute" >&2; exit 1; }

# 1. A consistent copy of the database, safe while the site runs
cd "$SITE"
NODE_OPTIONS=--disable-warning=ExperimentalWarning node_modules/.bin/tsx server/backup.ts "$work/club.db" >/dev/null

# 2. Never upload a broken copy
node --disable-warning=ExperimentalWarning -e '
  const { DatabaseSync } = require("node:sqlite");
  const r = new DatabaseSync(process.argv[1]).prepare("PRAGMA integrity_check").get();
  if (r.integrity_check !== "ok") { console.error("Database copy is damaged:", r.integrity_check); process.exit(1); }
' "$work/club.db"

# 3. Database + images in one file, encrypted with the passphrase
mkdir -m 700 "$work/gnupg"
tar -czf - -C "$work" club.db -C "$DATA" uploads \
  | gpg --homedir "$work/gnupg" --batch --yes --quiet --pinentry-mode loopback \
        --passphrase-file "$PASSFILE" --symmetric --cipher-algo AES256 --compress-algo none \
        --output "$BACKUPS/$name"

# 4. Keep the last KEEP_LOCAL_DAYS days on the server
find "$BACKUPS" -name 'discovery-club-*.tar.gz.gpg' -mtime +"$KEEP_LOCAL_DAYS" -delete

# 5. Upload (rclone checks the file's hash on Drive), then remove Drive copies
#    older than KEEP_DRIVE_DAYS. Old copies are only removed after a good upload.
rclone copy "$BACKUPS/$name" "$REMOTE"
rclone delete "$REMOTE" --min-age "${KEEP_DRIVE_DAYS}d" --include 'discovery-club-*.tar.gz.gpg'

echo "Backed up $name ($(du -h "$BACKUPS/$name" | cut -f1)) to $REMOTE"
