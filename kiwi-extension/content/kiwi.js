/**
 * Educational content script for kiwi.com — list card + detail panel merge.
 * LOCAL LEARNING ONLY. Update selectors if Kiwi DOM changes.
 *
 * Capture still sends type: FLIGHT_CAPTURED (bridge unchanged).
 * Extra fields are additive so older CRM mappers keep working.
 */

console.log('[Kiwi Capture] Content script loaded on Kiwi.com');

function textOf(el) {
  return (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function firstText(root, selectors) {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      const t = textOf(el);
      if (t) return t;
    } catch {
      /* invalid selector */
    }
  }
  return '';
}

function getSearchContext() {
  const url = window.location.href;
  const u = new URL(url);
  const pathMatch = url.match(/\/search\/results\/([^/]+)\/([^/]+)\/([^/?#]+)/);

  const qOrigin =
    u.searchParams.get('origin') ||
    u.searchParams.get('departure') ||
    u.searchParams.get('flyFrom') ||
    '';
  const qDest =
    u.searchParams.get('destination') ||
    u.searchParams.get('arrival') ||
    u.searchParams.get('flyTo') ||
    '';

  return {
    origin: pathMatch?.[1] || qOrigin || '',
    destination: pathMatch?.[2] || qDest || '',
    dates: pathMatch?.[3] || '',
    url,
    queryOrigin: qOrigin,
    queryDestination: qDest,
  };
}

/** Collect 3-letter airport-looking codes from an element subtree */
function collectIataCodes(root) {
  const text = textOf(root);
  const codes = [];
  const re = /\b([A-Z]{3})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const code = m[1];
    if (
      [
        'THE',
        'AND',
        'FOR',
        'OCT',
        'NOV',
        'DEC',
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'UTC',
        'GMT',
        'AI',
        'INR',
        'USD',
        'EUR',
        'GBP',
      ].includes(code)
    ) {
      continue;
    }
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

function extractTimes(root) {
  const text = textOf(root);
  const times = [];
  const re = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    times.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  return times;
}

function extractAirlines(card) {
  const imgs = Array.from(
    card.querySelectorAll(
      '[data-test="AirlineLogo"] img, [class*="Airline"] img, [class*="airline"] img, img[alt]'
    )
  );
  const airlines = [];
  const logos = [];

  for (const img of imgs) {
    const alt = (img.alt || '').trim();
    const src = img.currentSrc || img.src || '';
    if (alt && !airlines.includes(alt) && alt.length < 60) airlines.push(alt);
    if (src && /\.(png|svg|jpg|webp|gif)/i.test(src) && !logos.includes(src)) {
      logos.push(src);
    }
  }

  return { airlines: airlines.slice(0, 5), logos: logos.slice(0, 5) };
}

/** e.g. FZ 442, FZ442, AI-2447 */
function extractFlightNumberFromText(text) {
  if (!text) return '';
  const m = String(text).match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*-?\s*(\d{1,4})\b/);
  if (!m) return '';
  return `${m[1].toUpperCase()} ${m[2]}`;
}

function extractFlightNumberLabeled(text) {
  if (!text) return '';
  const m = String(text).match(
    /Flight\s*no\.?\s*[:\s]*([A-Z0-9]{2})\s*-?\s*(\d{1,4})/i
  );
  if (m) return `${m[1].toUpperCase()} ${m[2]}`;
  return extractFlightNumberFromText(text);
}

function extractOperatingAirline(text) {
  if (!text) return '';
  const m = String(text).match(/Operating\s*airline\s*[:\s]*([^\n|·•]+)/i);
  return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 80) : '';
}

function extractCabinClass(text) {
  if (!text) return '';
  const m = String(text).match(
    /\b(Economy|Premium Economy|Business|First|Economy Light|Economy Classic|Economy Flex)\b/i
  );
  return m ? m[1] : '';
}

function extractBaggageLines(text) {
  if (!text) return [];
  const lines = [];
  const cabin = text.match(
    /(?:cabin|carry[- ]?on|hand\s*baggage)[^.\n]{0,80}/i
  );
  const check = text.match(
    /(?:checked|check[- ]?in)\s*(?:bag|baggage|luggage)[^.\n]{0,80}/i
  );
  const kg = text.match(/\b(\d+)\s*kg\b[^.\n]{0,40}(?:bag|baggage|cabin|check)?/gi);
  if (cabin) lines.push(cabin[0].replace(/\s+/g, ' ').trim());
  if (check) lines.push(check[0].replace(/\s+/g, ' ').trim());
  if (kg) {
    for (const k of kg.slice(0, 3)) {
      const t = k.replace(/\s+/g, ' ').trim();
      if (!lines.some((l) => l.includes(t))) lines.push(t);
    }
  }
  return lines.slice(0, 6);
}

function extractAmenities(text) {
  if (!text) return [];
  const out = [];
  const pairs = [
    [/Seat\s*pitch\s*[:\s]*([^\n|·•]+)/i, 'Seat pitch'],
    [/Seat\s*width\s*[:\s]*([^\n|·•]+)/i, 'Seat width'],
    [/Seat\s*recline\s*[:\s]*([^\n|·•]+)/i, 'Seat recline'],
    [/In-?seat\s*power\s*[:\s]*([^\n|·•]+)/i, 'In-seat power'],
    [/Wi-?Fi\s*(?:on\s*board)?\s*[:\s]*([^\n|·•]+)/i, 'Wi-Fi'],
    [/Audio\s*&\s*video[^:\n]*[:\s]*([^\n|·•]+)/i, 'Audio & video'],
  ];
  for (const [re, label] of pairs) {
    const m = text.match(re);
    if (m) out.push(`${label}: ${m[1].replace(/\s+/g, ' ').trim()}`);
  }
  return out.slice(0, 8);
}

/**
 * Best-effort fare tiers from detail panel (Guarantee / Basic).
 * Does not change which price is primary — that stays the card/list price
 * unless detail clearly shows a selected total.
 */
function extractFareOptions(text) {
  if (!text) return [];
  const options = [];
  const guarantee = text.match(
    /Guarantee[^₹$\d]{0,120}(?:₹|Rs\.?|INR|USD|\$)\s*([\d,]+(?:\.\d+)?)/i
  );
  const basic = text.match(
    /Basic(?:\s*price)?[^₹$\d]{0,80}(?:₹|Rs\.?|INR|USD|\$)\s*([\d,]+(?:\.\d+)?)/i
  );
  const total = text.match(
    /Total\s*price[^₹$\d]{0,40}(?:₹|Rs\.?|INR|USD|\$)\s*([\d,]+(?:\.\d+)?)/i
  );
  const currency = /₹|Rs\.?/i.test(text)
    ? 'INR'
    : /\$|USD/i.test(text)
      ? 'USD'
      : 'INR';

  if (basic) {
    options.push({
      name: 'Basic',
      amount: Number(String(basic[1]).replace(/,/g, '')),
      currency,
    });
  }
  if (guarantee || total) {
    const amt = total?.[1] || guarantee?.[1];
    if (amt) {
      options.push({
        name: 'Guarantee',
        amount: Number(String(amt).replace(/,/g, '')),
        currency,
      });
    }
  }
  return options;
}

/**
 * Open itinerary / booking drawer (Kiwi detail modal).
 * Returns null if nothing useful is open — list-card capture still works alone.
 */
function findDetailPanel() {
  const candidates = [
    ...document.querySelectorAll('[role="dialog"]'),
    ...document.querySelectorAll('[data-test*="Modal"], [data-test*="Drawer"], [data-test*="Booking"], [data-test*="Itinerary"]'),
    ...document.querySelectorAll('[class*="Modal"], [class*="Drawer"], [class*="BottomSheet"]'),
  ];

  let best = null;
  let bestScore = 0;
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const t = textOf(el);
    if (t.length < 80) continue;
    let score = 0;
    if (/Flight\s*no/i.test(t)) score += 3;
    if (/Operating\s*airline/i.test(t)) score += 2;
    if (/Seat\s*pitch|baggage|Guarantee|Basic\s*price/i.test(t)) score += 2;
    if (/\b\d{1,2}:\d{2}\b/.test(t)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return bestScore >= 2 ? best : null;
}

function extractFromDetailPanel(panel) {
  if (!panel) return null;
  const text = textOf(panel);
  const times = extractTimes(panel);
  const iatas = collectIataCodes(panel);
  const { airlines, logos } = extractAirlines(panel);

  const durationMatch =
    text.match(/\b(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?\b/i) ||
    text.match(/\b(\d+)\s*h\s*(\d+)\s*m\b/i);

  const selectedTotal =
    firstText(panel, [
      '[data-test*="TotalPrice"]',
      '[class*="TotalPrice"]',
      'button[class*="Continue"]',
    ]) || '';
  const priceFromTotal =
    selectedTotal.match(/(?:₹|Rs\.?|INR|USD|\$)\s*[\d,]+(?:\.\d+)?/i)?.[0] ||
    text.match(/Total\s*price[^₹$\d]{0,40}((?:₹|Rs\.?|INR|USD|\$)\s*[\d,]+(?:\.\d+)?)/i)?.[1] ||
    '';

  return {
    price: priceFromTotal,
    departure: times[0] || '',
    arrival: times[1] || '',
    duration: durationMatch
      ? `${durationMatch[1]}h ${durationMatch[2]}m`
      : '',
    origin: iatas[0] || '',
    destination: iatas[1] || '',
    airlines,
    logos,
    flightNumber: extractFlightNumberLabeled(text),
    operatingAirline: extractOperatingAirline(text),
    cabinClass: extractCabinClass(text),
    baggage: extractBaggageLines(text),
    amenities: extractAmenities(text),
    fareOptions: extractFareOptions(text),
    detailSnippet: text.slice(0, 600),
    detailCaptured: true,
  };
}

function mergePrefer(base, detail) {
  if (!detail) return base;
  const pick = (a, b) => (a && String(a).trim() ? a : b || '');
  return {
    ...base,
    price: pick(base.price, detail.price),
    departure: pick(base.departure, detail.departure),
    arrival: pick(base.arrival, detail.arrival),
    duration: pick(base.duration, detail.duration),
    origin: pick(base.origin, detail.origin),
    destination: pick(base.destination, detail.destination),
    airlines:
      base.airlines?.length > 0 ? base.airlines : detail.airlines || [],
    logos: base.logos?.length > 0 ? base.logos : detail.logos || [],
    flightNumber: pick(base.flightNumber, detail.flightNumber),
    operatingAirline: detail.operatingAirline || base.operatingAirline || '',
    cabinClass: pick(base.cabinClass, detail.cabinClass),
    baggage:
      Array.isArray(detail.baggage) && detail.baggage.length
        ? detail.baggage
        : base.baggage || [],
    amenities:
      Array.isArray(detail.amenities) && detail.amenities.length
        ? detail.amenities
        : base.amenities || [],
    fareOptions:
      Array.isArray(detail.fareOptions) && detail.fareOptions.length
        ? detail.fareOptions
        : base.fareOptions || [],
    detailSnippet: detail.detailSnippet || '',
    detailCaptured: Boolean(detail.detailCaptured),
  };
}

function extractFlightCard(cardElement) {
  try {
    const price =
      firstText(cardElement, [
        '[data-test="ResultCardPrice"]',
        '[data-test="ResultCardPrice-price"]',
        '[class*="ResultCardPrice"]',
        '[class*="price"]',
      ]) || '';

    let origin = firstText(cardElement, [
      '[data-test="OutboundDepartureStation"]',
      '[data-test="ResultCardDepartureStation"]',
      '[data-test="departure-station"]',
      '[class*="DepartureStation"]',
    ]);
    let destination = firstText(cardElement, [
      '[data-test="OutboundArrivalStation"]',
      '[data-test="ResultCardArrivalStation"]',
      '[data-test="arrival-station"]',
      '[class*="ArrivalStation"]',
    ]);

    let departure = firstText(cardElement, [
      '[data-test="OutboundDepartureTime"]',
      '[data-test="ResultCardDepartureTime"]',
      '[class*="DepartureTime"]',
    ]);
    let arrival = firstText(cardElement, [
      '[data-test="OutboundArrivalTime"]',
      '[data-test="ResultCardArrivalTime"]',
      '[class*="ArrivalTime"]',
    ]);

    const duration =
      firstText(cardElement, [
        '[data-test="OutboundDuration"]',
        '[data-test="ResultCardDuration"]',
        '[class*="Duration"]',
      ]) ||
      (() => {
        const text = textOf(cardElement);
        const m =
          text.match(/\b(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?\b/i) ||
          text.match(/\b(\d+)\s*h\s*(\d+)\s*m\b/i);
        if (m) return `${m[1]}h ${m[2]}m`;
        return '';
      })();

    const stops = firstText(cardElement, [
      '[data-test="StopsInfo"]',
      '[data-test="ResultCardStops"]',
      '[class*="Stops"]',
    ]);

    const iatas = collectIataCodes(cardElement);
    if (!origin && iatas[0]) origin = iatas[0];
    if (!destination && iatas[1]) destination = iatas[1];
    if (origin && origin.length > 3 && iatas[0]) origin = iatas[0];
    if (destination && destination.length > 3 && iatas[1]) {
      destination = iatas[1];
    } else if (destination && destination.length > 3 && iatas[0] && iatas[1]) {
      destination = iatas[1];
    }

    if (!departure || !arrival) {
      const times = extractTimes(cardElement);
      if (!departure && times[0]) departure = times[0];
      if (!arrival && times[1]) arrival = times[1];
    }

    const { airlines, logos } = extractAirlines(cardElement);
    const searchContext = getSearchContext();
    const cardText = textOf(cardElement);

    if (!origin && searchContext.queryOrigin) {
      origin = searchContext.queryOrigin;
    }
    if (!destination && searchContext.queryDestination) {
      destination = searchContext.queryDestination;
    }

    let flightNumber =
      firstText(cardElement, [
        '[data-test="FlightNumber"]',
        '[class*="FlightNumber"]',
      ]) || extractFlightNumberFromText(cardText);

    const cardBase = {
      price,
      departure,
      arrival,
      duration,
      origin,
      destination,
      airlines,
      logos,
      flightNumber,
      stops,
      operatingAirline: '',
      cabinClass: extractCabinClass(cardText),
      baggage: extractBaggageLines(cardText),
      amenities: [],
      fareOptions: [],
      detailSnippet: '',
      detailCaptured: false,
      searchContext,
      cardTextSnippet: cardText.slice(0, 400),
      captureSource: 'kiwi',
      capturedAt: new Date().toISOString(),
    };

    // If itinerary modal/drawer is open, merge richer fields (additive).
    const detail = extractFromDetailPanel(findDetailPanel());
    const payload = mergePrefer(cardBase, detail);

    console.log('[Kiwi Capture] Extracted:', payload);
    return payload;
  } catch (err) {
    console.error('[Kiwi Capture] Extraction error:', err);
    return null;
  }
}

function injectCaptureButtons(cards) {
  cards.forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    if (card.querySelector('.crm-capture-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'crm-capture-btn';
    btn.textContent = 'Send to CRM';
    btn.style.cssText = [
      'position:absolute',
      'top:8px',
      'right:8px',
      'z-index:9999',
      'background:#0f172a',
      'color:#fff',
      'padding:6px 12px',
      'border-radius:6px',
      'border:none',
      'cursor:pointer',
      'font-size:12px',
      'font-weight:600',
    ].join(';');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = extractFlightCard(card);
      if (!data) {
        alert('Could not extract flight data — update selectors in kiwi.js');
        return;
      }
      if (!data.price && !data.origin && !data.departure) {
        alert(
          'Capture looked empty. Open DevTools Console for [Kiwi Capture] Extracted log and update selectors.'
        );
      }

      chrome.runtime.sendMessage(
        { type: 'FLIGHT_CAPTURED', payload: data },
        () => {
          if (chrome.runtime.lastError) {
            console.warn(chrome.runtime.lastError.message);
            return;
          }
          const rich = data.detailCaptured
            ? 'Sent (details)!'
            : 'Sent!';
          btn.textContent = rich;
          btn.style.background = '#16a34a';
          setTimeout(() => {
            btn.textContent = 'Send to CRM';
            btn.style.background = '#0f172a';
          }, 2000);
        }
      );
    });

    const style = window.getComputedStyle(card);
    if (style.position === 'static') {
      card.style.position = 'relative';
    }
    card.appendChild(btn);
  });
}

/**
 * Also inject a capture button on the open detail panel so agents can
 * open the itinerary first, then Send — without changing list-card flow.
 */
function injectDetailCaptureButton() {
  const panel = findDetailPanel();
  if (!panel || panel.querySelector('.crm-capture-btn-detail')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'crm-capture-btn-detail';
  btn.textContent = 'Send details to CRM';
  btn.style.cssText = [
    'position:sticky',
    'top:8px',
    'z-index:10000',
    'display:block',
    'margin:8px auto',
    'background:#0369a1',
    'color:#fff',
    'padding:8px 14px',
    'border-radius:8px',
    'border:none',
    'cursor:pointer',
    'font-size:13px',
    'font-weight:600',
    'box-shadow:0 2px 8px rgba(0,0,0,.15)',
  ].join(';');

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prefer merging with nearest result card if still in DOM; else detail-only.
    const cards = findCards(document);
    const card = cards?.[0] instanceof HTMLElement ? cards[0] : null;
    const data = card
      ? extractFlightCard(card)
      : mergePrefer(
          {
            price: '',
            departure: '',
            arrival: '',
            duration: '',
            origin: '',
            destination: '',
            airlines: [],
            logos: [],
            flightNumber: '',
            stops: '',
            searchContext: getSearchContext(),
            cardTextSnippet: '',
            captureSource: 'kiwi',
            capturedAt: new Date().toISOString(),
          },
          extractFromDetailPanel(panel)
        );

    if (!data) {
      alert('Could not extract detail panel — update kiwi.js selectors');
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'FLIGHT_CAPTURED', payload: data },
      () => {
        if (chrome.runtime.lastError) {
          console.warn(chrome.runtime.lastError.message);
          return;
        }
        btn.textContent = 'Sent!';
        btn.style.background = '#16a34a';
        setTimeout(() => {
          btn.textContent = 'Send details to CRM';
          btn.style.background = '#0369a1';
        }, 2000);
      }
    );
  });

  panel.prepend(btn);
}

function findCards(root = document) {
  const primary = root.querySelectorAll?.(
    '[data-test="ResultCardWrapper"], [data-test="ResultCard"], [data-test="ResultList-result"]'
  );
  if (primary?.length) return primary;
  return root.querySelectorAll?.(
    '[class*="ResultCard"], article[class*="result"], div[class*="ResultList"] > div'
  );
}

function setupCardObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const cards = findCards(node);
        if (cards?.length) injectCaptureButtons(cards);
        if (
          node.matches?.(
            '[data-test="ResultCardWrapper"], [data-test="ResultCard"]'
          )
        ) {
          injectCaptureButtons([node]);
        }
      }
    }
    // Detail drawer may open without matching ResultCard selectors
    try {
      injectDetailCaptureButton();
    } catch {
      /* ignore */
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const existing = findCards(document);
  if (existing?.length) injectCaptureButtons(existing);
  try {
    injectDetailCaptureButton();
  } catch {
    /* ignore */
  }
}

setupCardObserver();
console.log('[Kiwi Capture] Observer active (list + detail)');
