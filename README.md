# Pusteblume – Website

Website für pusteblume-kt.de: statische Seiten (HTML/CSS/JS, kein Build-Schritt) plus ein kleiner
Node-Server, der die Seiten ausliefert und das Kontaktformular über [Resend](https://resend.com) verschickt.

## Struktur

```
├── index.html            Startseite
├── kunsttherapie.html    Unterseiten (eine Datei pro Seite)
├── freies-malen.html
├── ueber-mich.html
├── termine.html
├── preise.html
├── kontakt.html
├── impressum.html
├── datenschutz.html
├── assets/
│   ├── css/style.css     Gestaltung (Farben, Schriften, Layout)
│   ├── js/config.js      Einstellungen: Termine, Kontaktformular
│   ├── js/main.js        Verhalten: Menü, Scroll-Effekt, Termine, Formular
│   ├── fonts/            Schriften (lokal, DSGVO-freundlich)
│   └── img/              Bilder (WebP, für das Web verkleinert)
├── server/server.js      Webserver + Kontaktformular-API (Node.js ≥ 18, keine Abhängigkeiten)
├── Dockerfile
├── docker-compose.yml
└── .env.example          Vorlage für die Zugangsdaten
```

Der Server liefert nur die HTML-Seiten im Hauptordner und `assets/` aus – `server/`, `.env`,
`README.md` und `.git` sind von außen nicht erreichbar.

## Lokal starten

```
node server/server.js
```
Dann http://localhost:3000 öffnen. Ohne `RESEND_API_KEY` funktioniert alles außer dem E-Mail-Versand.

## Einrichtung auf dem Homeserver

### 1. Resend vorbereiten (einmalig)

1. Bei https://resend.com registrieren.
2. **Domains → Add Domain** → `pusteblume-kt.de`, Region **EU (Ireland)** wählen.
3. Die angezeigten DNS-Einträge (DKIM, SPF/MX für `send.pusteblume-kt.de`, optional DMARC) beim
   Domain-Anbieter eintragen und in Resend auf **Verify** klicken.
4. **API Keys → Create API Key** mit „Sending access“, beschränkt auf `pusteblume-kt.de`.
5. Unter **Settings → Legal / DPA** den Vertrag zur Auftragsverarbeitung abschließen (für die DSGVO nötig).

### 2. Server starten

```
cp .env.example .env      # RESEND_API_KEY eintragen
docker compose up -d --build
```

Ohne Docker geht es auch direkt mit Node (z. B. als systemd-Dienst):
`RESEND_API_KEY=… TRUST_PROXY=1 node server/server.js`

### 3. Reverse Proxy

Die Domain auf `http://127.0.0.1:3000` weiterleiten, z. B. mit Caddy (HTTPS automatisch):

```
pusteblume-kt.de, www.pusteblume-kt.de {
    reverse_proxy 127.0.0.1:3000
}
```

oder nginx:

```
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### Aktualisieren

Nach Änderungen an der Website: `git pull && docker compose up -d --build`

## Inhalte pflegen

| Was                     | Wo                                              |
|-------------------------|-------------------------------------------------|
| Freie Termine           | `assets/js/config.js` → `termine`               |
| Empfänger/Absender der Formular-Mails | `.env` → `MAIL_TO`, `MAIL_FROM`   |
| Preise                  | `preise.html`                                   |
| Texte                   | jeweilige `.html`-Datei                         |
| Impressum / Datenschutz | `impressum.html`, `datenschutz.html`            |
| Farben, Abstände        | `assets/css/style.css` (oben unter `:root`)     |

Bilder liegen optimiert in `assets/img/` (WebP, max. ~1600 px). Neue Bilder vorher verkleinern.
