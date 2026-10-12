/*
 * ==========================================================================
 *  EINSTELLUNGEN – hier kann alles Wichtige ohne Programmierkenntnisse
 *  angepasst werden.
 * ==========================================================================
 */

window.PUSTEBLUME = {

  /*
   * Kontaktformular
   * ---------------
   * Das Formular schickt die Nachricht an den eigenen Server (server/server.js),
   * der sie über Resend an das Pusteblume-Postfach weiterleitet.
   * Empfänger und Absender werden dort eingestellt (siehe README).
   */
  kontaktApi: '/api/kontakt',

  /*
   * Freie Termine (freies Malen)
   * ----------------------------
   * Ein Eintrag pro Termin. Datum im Format JJJJ-MM-TT.
   * Vergangene Termine werden automatisch ausgeblendet.
   */
  termine: [
    { datum: '2026-10-17', zeit: '10:00 – 13:00 Uhr', titel: 'Freies Malen in der Gruppe', plaetze: 2 },
    { datum: '2026-10-23', zeit: '18:00 – 20:30 Uhr', titel: 'Freies Malen am Abend',      plaetze: 1 },
    { datum: '2026-11-07', zeit: '14:00 – 17:00 Uhr', titel: 'Freies Malen in der Gruppe', plaetze: 3 },
    { datum: '2026-11-20', zeit: '17:30 – 20:00 Uhr', titel: 'Freies Malen zu Zweit',      plaetze: 1 },
  ],
};
