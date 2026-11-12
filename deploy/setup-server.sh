#!/usr/bin/env bash
# ==========================================================================
#  Pusteblume – Einrichtung im Proxmox-Container (Debian 12, ohne Docker)
#
#  Richtet den Node-Server (Website + Kontaktformular über Resend) als
#  systemd-Dienst ein und stellt nginx so um, dass es alle Anfragen an
#  diesen Server weiterleitet. Der Cloudflare Tunnel bleibt unverändert
#  (er zeigt weiter auf Port 80 des Containers).
#
#  Aufruf (als root, im Repo-Ordner):   bash deploy/setup-server.sh
#  Kann gefahrlos mehrfach ausgeführt werden.
# ==========================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE=/etc/pusteblume.env
SERVICE=/etc/systemd/system/pusteblume.service
NGINX_SITE=/etc/nginx/sites-available/pusteblume

[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen."; exit 1; }

echo "==> Node.js installieren"
apt-get update
apt-get install -y nodejs
node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' \
  || { echo "Node.js 18 oder neuer wird benötigt."; exit 1; }

echo "==> Systembenutzer für den Dienst"
id pusteblume >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin pusteblume

echo "==> Zugangsdaten ($ENV_FILE, liegt außerhalb des Web-Ordners)"
if grep -q '^RESEND_API_KEY=re_' "$ENV_FILE" 2>/dev/null; then
  echo "    vorhanden – bleibt unverändert"
else
  read -rsp "    Resend API-Key einfügen (beginnt mit re_): " KEY; echo
  case "$KEY" in re_*) ;; *) echo "    Das sieht nicht wie ein Resend-Key aus."; exit 1 ;; esac
  umask 077
  cat > "$ENV_FILE" <<EOF
RESEND_API_KEY=$KEY
MAIL_TO=pusteblume.kt@gmail.com
MAIL_FROM="Pusteblume Website <kontakt@pusteblume-kt.de>"
HOST=127.0.0.1
PORT=3000
TRUST_PROXY=1
EOF
  chmod 600 "$ENV_FILE"
fi

echo "==> systemd-Dienst 'pusteblume'"
cat > "$SERVICE" <<EOF
[Unit]
Description=Pusteblume Website + Kontaktformular
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=$ENV_FILE
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/server/server.js
User=pusteblume
Restart=always
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable pusteblume >/dev/null
systemctl restart pusteblume

echo "==> nginx als Weiterleitung zum Node-Server"
cat > "$NGINX_SITE" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 64k;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        # echte Besucher-IP von Cloudflare (für das Rate-Limit des Formulars)
        proxy_set_header X-Forwarded-For $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/pusteblume
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Test"
sleep 1
if curl -fsS -o /dev/null http://127.0.0.1/ 2>/dev/null || wget -qO /dev/null http://127.0.0.1/ 2>/dev/null; then
  echo "    Website antwortet über nginx -> Node."
else
  echo "    Achtung: keine Antwort. Log ansehen mit:  journalctl -u pusteblume -n 30"
  exit 1
fi
echo
echo "Fertig. Jetzt auf https://pusteblume-kt.de/kontakt das Formular testen."
echo "Später aktualisieren:  cd $APP_DIR && git pull && systemctl restart pusteblume"
