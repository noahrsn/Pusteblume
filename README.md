# Pusteblume – Website

Statische Website (HTML/CSS/JS, kein Build-Schritt), entstanden aus einem Claude-Design-Prototyp.

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
└── assets/
    ├── css/style.css     Gestaltung (Farben, Schriften, Layout)
    ├── js/config.js      Einstellungen: Termine, Kontaktformular
    ├── js/main.js        Verhalten: Menü, Scroll-Effekt, Termine, Formular
    ├── fonts/            Schriften (lokal, DSGVO-freundlich)
    └── img/              Bilder (WebP, für das Web verkleinert)
```

Die HTML-Seiten liegen bewusst direkt im Hauptordner: So ist `index.html` beim Hoster
automatisch die Startseite und die Adressen bleiben kurz (z. B. `/kontakt.html`).

## Lokal ansehen

```
python -m http.server 8000
```
Dann http://localhost:8000 öffnen.

## Veröffentlichen

Den kompletten Projektordner (ohne `.git` und `.idea`) bei einem beliebigen Webhoster hochladen (z. B. per FTP) –
oder kostenlos über Netlify, Cloudflare Pages oder GitHub Pages.

## Inhalte pflegen

| Was                          | Wo                                   |
|------------------------------|--------------------------------------|
| Freie Termine                | `assets/js/config.js` → `termine`           |
| Kontaktformular (E-Mail-Versand) | `assets/js/config.js` → `web3formsKey`  |
| Preise                       | `preise.html`                        |
| Texte                        | jeweilige `.html`-Datei              |
| Impressum / Datenschutz      | `impressum.html`, `datenschutz.html` (gelb markierte Platzhalter ausfüllen!) |
| Farben, Abstände             | `assets/css/style.css` (oben unter `:root`) |

Bilder liegen optimiert in `assets/img/` (WebP, max. ~1600 px). Neue Bilder vorher verkleinern.
