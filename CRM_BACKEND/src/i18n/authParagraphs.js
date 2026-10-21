/**
 * PAX authorization paragraph templates per locale.
 * Placeholders: {{authorizerName}} {{agencyName}} {{amountLabel}} {{purpose}}
 * English wording must stay identical to legacy buildAuthorizationText.
 */

const TEMPLATES = Object.freeze({
  en:
    'I, {{authorizerName}}, hereby authorize {{agencyName}} to charge my card ' +
    'for the amount of {{amountLabel}} in connection with the purchase of travel services, ' +
    'specifically the {{purpose}}. I acknowledge and agree that this charge is non-refundable, ' +
    'that bookings purchased are non-transferable, and that name changes are not permitted. ' +
    'I further understand that any request to change the date, route, or time of travel may ' +
    'result in additional penalties and fare differences. By signing below, I confirm that I am ' +
    'willingly paying {{agencyName}} for the travel services offered, which may include flights, ' +
    'hotels, and car bookings in both the U.S. and European markets, and I authorize {{agencyName}} ' +
    'to process the stated amount using the card details I have provided.',

  es:
    'Yo, {{authorizerName}}, autorizo por la presente a {{agencyName}} a cargar mi tarjeta ' +
    'por el importe de {{amountLabel}} en relación con la compra de servicios de viaje, ' +
    'específicamente {{purpose}}. Reconozco y acepto que este cargo no es reembolsable, ' +
    'que las reservas adquiridas no son transferibles y que no se permiten cambios de nombre. ' +
    'Entiendo además que cualquier solicitud de cambio de fecha, ruta o horario de viaje puede ' +
    'conllevar penalizaciones adicionales y diferencias de tarifa. Al firmar abajo, confirmo que ' +
    'pago voluntariamente a {{agencyName}} por los servicios de viaje ofrecidos, que pueden incluir ' +
    'vuelos, hoteles y alquiler de coches en los mercados de EE. UU. y Europa, y autorizo a ' +
    '{{agencyName}} a procesar el importe indicado con los datos de la tarjeta que he facilitado.',

  it:
    'Io, {{authorizerName}}, autorizzo con la presente {{agencyName}} ad addebitare la mia carta ' +
    'per l\'importo di {{amountLabel}} in relazione all\'acquisto di servizi di viaggio, ' +
    'nello specifico {{purpose}}. Riconosco e accetto che questo addebito non è rimborsabile, ' +
    'che le prenotazioni acquistate non sono trasferibili e che non sono consentite modifiche del nome. ' +
    'Comprendo inoltre che qualsiasi richiesta di modifica di data, tratta o orario di viaggio può ' +
    'comportare penali aggiuntive e differenze di tariffa. Firmando qui sotto, confermo di pagare ' +
    'volontariamente {{agencyName}} per i servizi di viaggio offerti, che possono includere voli, ' +
    'hotel e noleggio auto nei mercati USA ed europei, e autorizzo {{agencyName}} a elaborare ' +
    'l\'importo indicato utilizzando i dati della carta che ho fornito.',
});

/** Known purpose phrases → localized (route codes / custom text kept as-is). */
export function localizeAuthPurpose(purpose, locale) {
  const p = String(purpose || '').trim();
  if (!p || locale === 'en') return p;

  if (p === 'the itinerary detailed above') {
    if (locale === 'es') return 'el itinerario detallado arriba';
    if (locale === 'it') return 'l\'itinerario dettagliato sopra';
  }
  if (p === 'travel service fee') {
    if (locale === 'es') return 'la tarifa del servicio de viaje';
    if (locale === 'it') return 'la tariffa del servizio di viaggio';
  }

  const flight = p.match(/^(.+?)\s+flight booking$/i);
  if (flight) {
    if (locale === 'es') return `la reserva de vuelo ${flight[1]}`;
    if (locale === 'it') return `la prenotazione del volo ${flight[1]}`;
  }

  return p;
}

export function renderAuthParagraph(locale, fills = {}) {
  const loc = TEMPLATES[locale] ? locale : 'en';
  const tpl = TEMPLATES[loc];
  const purpose = localizeAuthPurpose(fills.purpose, loc);
  return tpl
    .replaceAll('{{authorizerName}}', String(fills.authorizerName || ''))
    .replaceAll('{{agencyName}}', String(fills.agencyName || ''))
    .replaceAll('{{amountLabel}}', String(fills.amountLabel || ''))
    .replaceAll('{{purpose}}', purpose);
}

export default TEMPLATES;
