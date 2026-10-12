/*
 * Pusteblume – kleiner Webserver
 *
 * - liefert die Website aus (HTML-Seiten im Projektordner + assets/)
 * - nimmt das Kontaktformular unter POST /api/kontakt entgegen und
 *   verschickt es über Resend (https://resend.com)
 *
 * Keine Abhängigkeiten, benötigt Node.js 18 oder neuer.
 *
 * Umgebungsvariablen:
 *   RESEND_API_KEY   (Pflicht) API-Key aus dem Resend-Dashboard
 *   MAIL_TO          Empfänger, Standard: pusteblume.kt@gmail.com
 *   MAIL_FROM        Absender (Domain muss in Resend verifiziert sein),
 *                    Standard: Pusteblume Website <kontakt@pusteblume-kt.de>
 *   PORT             Standard: 3000
 *   HOST             Standard: 0.0.0.0
 *   TRUST_PROXY      "1", wenn ein Reverse Proxy (nginx, Caddy, …) davor läuft,
 *                    damit die echte Besucher-IP fürs Rate-Limit genutzt wird
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_TO = process.env.MAIL_TO || 'pusteblume.kt@gmail.com';
const MAIL_FROM = process.env.MAIL_FROM || 'Pusteblume Website <kontakt@pusteblume-kt.de>';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

if (!RESEND_API_KEY) {
  console.warn('WARNUNG: RESEND_API_KEY ist nicht gesetzt – das Kontaktformular kann keine E-Mails versenden.');
}

/* ---------- Statische Dateien ---------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

// Nur HTML-Seiten im Hauptordner und alles unter assets/ wird ausgeliefert –
// server/, README, .git usw. bleiben unerreichbar.
function resolveStatic(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p === '/') p = '/index.html';
  if (!p.includes('.') && !p.endsWith('/')) p += '.html'; // /kontakt -> /kontakt.html

  const rel = path.normalize(p).replace(/^[/\\]+/, '');
  const isPage = /^[a-z0-9-]+\.html$/i.test(rel);
  const isAsset = rel.startsWith('assets' + path.sep) && !rel.includes('..');
  if (!isPage && !isAsset) return null;

  const file = path.join(ROOT, rel);
  return file.startsWith(ROOT + path.sep) ? file : null;
}

function serveStatic(req, res, urlPath) {
  const file = resolveStatic(urlPath);
  fs.stat(file || '', (err, stat) => {
    if (!file || err || !stat.isFile()) return notFound(res);
    const ext = path.extname(file).toLowerCase();
    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Last-Modified': stat.mtime.toUTCString(),
      // HTML, CSS und JS bei jedem Aufruf kurz prüfen lassen (304, wenn unverändert),
      // damit Änderungen sofort ankommen. Bilder und Schriften 7 Tage cachen.
      'Cache-Control': ['.html', '.css', '.js'].includes(ext) ? 'no-cache' : 'public, max-age=604800',
    };
    if (req.headers['if-modified-since'] &&
        new Date(req.headers['if-modified-since']) >= new Date(stat.mtime.toUTCString())) {
      res.writeHead(304, headers);
      return res.end();
    }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

function notFound(res) {
  res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><meta charset="utf-8"><title>Seite nicht gefunden</title>' +
    '<p style="font-family:sans-serif;padding:40px">Diese Seite gibt es leider nicht. ' +
    '<a href="/">Zur Startseite</a></p>');
}

/* ---------- Kontaktformular ---------- */

const ANLIEGEN = [
  'Kostenloses Infogespräch',
  'Kunsttherapeutisches Coaching',
  'Freies Malen – Terminanfrage',
  'Kleinigkeiten zum Verschenken',
  'Sonstiges',
];
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// Einfaches Rate-Limit: max. 5 Anfragen pro IP in 15 Minuten
const RATE_WINDOW = 15 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_MAX;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (list.every((t) => now - t >= RATE_WINDOW)) hits.delete(ip);
}, RATE_WINDOW).unref();

function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) {
    return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}

function json(res, status, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 20000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s) => s.replace(/[\r\n]+/g, ' ');

async function handleKontakt(req, res) {
  if (rateLimited(clientIp(req))) {
    return json(res, 429, { ok: false, error: 'Zu viele Anfragen. Bitte versuche es später noch einmal.' });
  }

  let data;
  try {
    data = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { ok: false, error: 'Ungültige Anfrage.' });
  }

  // Honeypot: Bots füllen das versteckte Feld aus – so tun, als wäre alles gut.
  if (data.botcheck) return json(res, 200, { ok: true });

  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const anliegen = ANLIEGEN.includes(data.anliegen) ? data.anliegen : 'Sonstiges';
  const name = oneLine(str(data.name, 120));
  const email = oneLine(str(data.email, 200));
  const telefon = oneLine(str(data.telefon, 60));
  const nachricht = str(data.nachricht, 5000);

  if (!name || !EMAIL_RE.test(email) || !nachricht || data.datenschutz !== true) {
    return json(res, 400, { ok: false, error: 'Bitte fülle alle Pflichtfelder aus.' });
  }
  if (!RESEND_API_KEY) {
    return json(res, 503, { ok: false, error: 'Der E-Mail-Versand ist noch nicht eingerichtet.' });
  }

  const rows = [['Anliegen', anliegen], ['Name', name], ['E-Mail', email], ['Telefon', telefon || '–']];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${nachricht}\n`;
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.5">' +
    '<table cellpadding="4" style="border-collapse:collapse">' +
    rows.map(([k, v]) => `<tr><td style="color:#8a3d66;font-weight:bold;vertical-align:top">${k}</td><td>${escapeHtml(v)}</td></tr>`).join('') +
    '</table>' +
    `<p style="white-space:pre-wrap;margin-top:16px">${escapeHtml(nachricht)}</p>` +
    '<p style="color:#999;font-size:12px;margin-top:24px">Gesendet über das Kontaktformular auf pusteblume-kt.de – ' +
    'mit „Antworten“ geht die Antwort direkt an die Absenderin / den Absender.</p></div>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [MAIL_TO],
        reply_to: email,
        subject: `${anliegen} – ${name}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      console.error('Resend-Fehler', r.status, await r.text());
      return json(res, 502, { ok: false, error: 'Die Nachricht konnte nicht gesendet werden.' });
    }
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('Resend nicht erreichbar:', err.message);
    return json(res, 502, { ok: false, error: 'Die Nachricht konnte nicht gesendet werden.' });
  }
}

/* ---------- Server ---------- */

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;

  if (urlPath === '/api/kontakt') {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
    return handleKontakt(req, res).catch((err) => {
      console.error(err);
      json(res, 500, { ok: false, error: 'Interner Fehler.' });
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, SECURITY_HEADERS);
    return res.end();
  }
  serveStatic(req, res, urlPath);
});

server.listen(PORT, HOST, () => {
  console.log(`Pusteblume läuft auf http://${HOST}:${PORT}`);
});
