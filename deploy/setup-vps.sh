#!/usr/bin/env bash
# One-time (and re-runnable) setup of the VPS for urielpapa.com. Run as root:
#   ssh root@VPS 'bash -s' < deploy/setup-vps.sh "<deploy public key>"
# It needs deploy/urielpapa.service and deploy/nginx/urielpapa.com.conf in
# /tmp/urielpapa-deploy/ (deploy/README.md copies them there first).
# Nothing here touches the other sites on the box beyond an `nginx -t` and reload.
set -euo pipefail

PUBKEY="${1:?usage: setup-vps.sh \"<deploy public key>\"}"
SRC=/tmp/urielpapa-deploy

# Node 22 from NodeSource (Ubuntu 24.04 ships Node 18; Astro needs 22.23.4+).
if ! node -v 2>/dev/null | grep -q '^v22\.'; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs rsync
fi
node -v

# A dedicated user that receives releases over SSH and runs the server.
id urielpapa >/dev/null 2>&1 || useradd -m -s /bin/bash urielpapa
passwd -l urielpapa >/dev/null
install -d -m 700 -o urielpapa -g urielpapa /home/urielpapa/.ssh
grep -qxF "$PUBKEY" /home/urielpapa/.ssh/authorized_keys 2>/dev/null ||
  echo "$PUBKEY" >> /home/urielpapa/.ssh/authorized_keys
chown urielpapa:urielpapa /home/urielpapa/.ssh/authorized_keys
chmod 600 /home/urielpapa/.ssh/authorized_keys

# Its only root power: restarting its own service.
echo 'urielpapa ALL=(root) NOPASSWD: /usr/bin/systemctl restart urielpapa.service' \
  > /etc/sudoers.d/urielpapa-deploy
chmod 440 /etc/sudoers.d/urielpapa-deploy
visudo -cf /etc/sudoers.d/urielpapa-deploy

install -d -m 755 -o urielpapa -g urielpapa /srv/urielpapa.com /srv/urielpapa.com/releases

# Server secrets. Created empty once; fill in from Vercel (deploy/README.md).
install -d -m 750 -o root -g urielpapa /etc/urielpapa.com
[ -f /etc/urielpapa.com/env ] || install -m 640 -o root -g urielpapa /dev/null /etc/urielpapa.com/env

install -m 644 "$SRC/urielpapa.service" /etc/systemd/system/urielpapa.service
systemctl daemon-reload
systemctl enable urielpapa.service

# TLS: a Cloudflare Origin CA certificate goes here before cutover. Until then a
# self-signed stand-in lets Nginx load the site for testing.
install -d -m 750 /etc/nginx/ssl/urielpapa.com
if [ ! -f /etc/nginx/ssl/urielpapa.com/fullchain.pem ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 30 -subj "/CN=urielpapa.com" \
    -addext "subjectAltName=DNS:urielpapa.com,DNS:www.urielpapa.com" \
    -keyout /etc/nginx/ssl/urielpapa.com/privkey.pem \
    -out /etc/nginx/ssl/urielpapa.com/fullchain.pem 2>/dev/null
  chmod 600 /etc/nginx/ssl/urielpapa.com/privkey.pem
fi

install -m 644 "$SRC/urielpapa.com.conf" /etc/nginx/sites-available/urielpapa.com
ln -sfn /etc/nginx/sites-available/urielpapa.com /etc/nginx/sites-enabled/urielpapa.com
nginx -t
systemctl reload nginx
echo "VPS ready for urielpapa.com releases."
