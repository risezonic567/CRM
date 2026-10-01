/**
 * Educational content script for kiwi.com — richer card extraction.
 * LOCAL LEARNING ONLY. Update selectors if Kiwi DOM changes.
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

  // Query params sometimes carry IATA
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
    // skip common English noise
    if (['THE', 'AND', 'FOR', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'UTC', 'GMT', 'AI'].includes(code)) {
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
    if (alt && !airlines.includes(alt)) airlines.push(alt);
    if (src && /\.(png|svg|jpg|webp|gif)/i.test(src) && !logos.includes(src)) {
      logos.push(src);
    }
  }

  return { airlines: airlines.slice(0, 5), logos: logos.slice(0, 5) };
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

    // Fallback: IATA codes from card text (e.g. DEL … DXB)
    const iatas = collectIataCodes(cardElement);
    if (!origin && iatas[0]) origin = iatas[0];
    if (!destination && iatas[1]) destination = iatas[1];
    // If origin text is city name but we also found codes, prefer codes
    if (origin && origin.length > 3 && iatas[0]) origin = iatas[0];
    if (destination && destination.length > 3 && iatas[1]) {
      destination = iatas[1];
    } else if (destination && destination.length > 3 && iatas[0] && iatas[1]) {
      destination = iatas[1];
    }

    // Fallback times from card text
    if (!departure || !arrival) {
      const times = extractTimes(cardElement);
      if (!departure && times[0]) departure = times[0];
      if (!arrival && times[1]) arrival = times[1];
    }

    const { airlines, logos } = extractAirlines(cardElement);
    const searchContext = getSearchContext();

    // URL query IATA overrides empty card stations
    if (!origin && searchContext.queryOrigin) {
      origin = searchContext.queryOrigin;
    }
    if (!destination && searchContext.queryDestination) {
      destination = searchContext.queryDestination;
    }

    const payload = {
      price,
      departure,
      arrival,
      duration,
      origin,
      destination,
      airlines,
      logos,
      flightNumber: firstText(cardElement, [
        '[data-test="FlightNumber"]',
        '[class*="FlightNumber"]',
      ]),
      stops,
      searchContext,
      cardTextSnippet: textOf(cardElement).slice(0, 400),
      captureSource: 'kiwi',
      capturedAt: new Date().toISOString(),
    };

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
          btn.textContent = 'Sent!';
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
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const existing = findCards(document);
  if (existing?.length) injectCaptureButtons(existing);
}

setupCardObserver();
console.log('[Kiwi Capture] Observer active');
