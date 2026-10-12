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
   * Damit Nachrichten direkt per E-Mail ankommen, wird ein kostenloser
   * Formular-Dienst benötigt, z. B. https://web3forms.com
   *   1. Dort mit pusteblume.kt@gmail.com einen "Access Key" anfordern.
   *   2. Den Key unten bei web3formsKey eintragen.
   * Solange kein Key eingetragen ist, öffnet das Formular beim Absenden
   * das E-Mail-Programm der Besucherin / des Besuchers mit vorausgefüllter Nachricht.
   */
  web3formsKey: '',
  email: 'pusteblume.kt@gmail.com',

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
