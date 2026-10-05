/**
 * Educational content script for Google Flights.
 * LOCAL LEARNING ONLY — Google ToS may restrict scraping; not for production.
 * Sends same payload shape as kiwi.js → CRM bridge.
 */

console.log('[Google Capture] Content script loaded');

function textOf(el) {
  return (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function collectIataCodes(root) {
  const text = textOf(root);
  const codes = [];
  const noise = new Set([
    'THE', 'AND', 'FOR', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR',
    'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'UTC', 'GMT', 'INR', 'USD', 'EUR',
  ]);
  const re = /\b([A-Z]{3})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!noise.has(m[1]) && !codes.includes(m[1])) codes.push(m[1]);
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

function extractDuration(root) {
  const text = textOf(root);
  const m =
    text.match(/\b(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?\b/i) ||
    text.match(/\b(\d+)\s*hr?\s*(\d+)\s*m\b/i) ||
    text.match(/\b(\d+)\s*h\s*(\d+)\s*m\b/i);
  if (m) return `${m[1]}h ${m[2]}m`;
  const hOnly = text.match(/\b(\d+)\s*h(?:ours?)?\b/i);
  if (hOnly) return `${hOnly[1]}h`;
  return '';
}

function extractPrice(root) {
  const text = textOf(root);
  const m =
    text.match(/₹\s*[\d,]+(?:\.\d+)?/) ||
    text.match(/Rs\.?\s*[\d,]+(?:\.\d+)?/i) ||
    text.match(/\$\s*[\d,]+(?:\.\d+)?/) ||
    text.match(/\bINR\s*[\d,]+(?:\.\d+)?/i) ||
    text.match(/\bUSD\s*[\d,]+(?:\.\d+)?/i);
  return m ? m[0] : '';
}

function extractAirlines(card) {
  const imgs = Array.from(card.querySelectorAll('img[alt]'));
  const airlines = [];
  const logos = [];
  for (const img of imgs) {
    const alt = (img.alt || '').trim();
    const src = img.currentSrc || img.src || '';
    if (
      alt &&
      !/logo|icon|arrow|google/i.test(alt) &&
      alt.length < 40 &&
      !airlines.includes(alt)
    ) {
      airlines.push(alt);
    }
    if (src && /\.(png|svg|jpg|webp)/i.test(src) && !logos.includes(src)) {
      logos.push(src);
    }
  }
  return { airlines: airlines.slice(0, 5), logos: logos.slice(0, 5) };
}

function getSearchContext() {
  const url = window.location.href;
  const u = new URL(url);
  return {
    origin: u.searchParams.get('tfs') ? '' : '',
    destination: '',
    dates: '',
    url,
    queryOrigin: '',
    queryDestination: '',
  };
}

function extractFlightNumberFromText(text) {
  if (!text) return '';
  const labeled = String(text).match(
    /Flight\s*(?:no\.?|number)?\s*[:\s]*([A-Z0-9]{2})\s*-?\s*(\d{1,4})/i
  );
  if (labeled) return `${labeled[1].toUpperCase()} ${labeled[2]}`;
  const m = String(text).match(
    /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*-?\s*(\d{1,4})\b/
  );
  if (!m) return '';
  return `${m[1].toUpperCase()} ${m[2]}`;
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
  if (cabin) lines.push(cabin[0].replace(/\s+/g, ' ').trim());
  if (check) lines.push(check[0].replace(/\s+/g, ' ').trim());
  return lines.slice(0, 4);
}

function extractFlightCard(cardElement) {
  try {
    const iatas = collectIataCodes(cardElement);
    const times = extractTimes(cardElement);
    const { airlines, logos } = extractAirlines(cardElement);
    const price = extractPrice(cardElement);
    const duration = extractDuration(cardElement);
    const cardText = textOf(cardElement);

    const payload = {
      price,
      departure: times[0] || '',
      arrival: times[1] || '',
      duration,
      origin: iatas[0] || '',
      destination: iatas[1] || '',
      airlines,
      logos,
      flightNumber: extractFlightNumberFromText(cardText),
      stops: '',
      cabinClass: '',
      baggage: extractBaggageLines(cardText),
      amenities: [],
      fareOptions: [],
      detailCaptured: false,
      searchContext: getSearchContext(),
      cardTextSnippet: cardText.slice(0, 400),
      captureSource: 'google',
      capturedAt: new Date().toISOString(),
    };

    console.log('[Google Capture] Extracted:', payload);
    return payload;
  } catch (err) {
    console.error('[Google Capture] Extraction error:', err);
    return null;
  }
}

function looksLikeResultCard(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.querySelector('.crm-capture-btn')) return false;
  const t = textOf(el);
  if (t.length < 40 || t.length > 2500) return false;
  const hasTime = /\b([01]?\d|2[0-3]):[0-5]\d\b/.test(t);
  const hasPrice = /₹|\$|INR|USD|Rs\.?/i.test(t);
  return hasTime && hasPrice;
}

function findCards(root = document) {
  const candidates = [];
  const nodes = root.querySelectorAll?.(
    'li, div[role="listitem"], div[class*="pIav2d"], div[class*="OgQ3dd"], div[jsname]'
  );
  if (!nodes?.length) return [];
  nodes.forEach((n) => {
    if (looksLikeResultCard(n)) candidates.push(n);
  });
  // Prefer deeper unique cards — filter parents if child already matched
  return candidates.filter(
    (el) => !candidates.some((other) => other !== el && el.contains(other))
  );
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
      'background:#1a73e8',
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
      if (!data || (!data.price && !data.origin && !data.departure)) {
        alert(
          'Could not extract enough flight data. Check Console [Google Capture] Extracted.'
        );
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
            btn.textContent = 'Send to CRM';
            btn.style.background = '#1a73e8';
          }, 2000);
        }
      );
    });

    const style = window.getComputedStyle(card);
    if (style.position === 'static') card.style.position = 'relative';
    card.appendChild(btn);
  });
}

function setupCardObserver() {
  const scan = () => {
    const cards = findCards(document);
    if (cards.length) injectCaptureButtons(cards);
  };

  const observer = new MutationObserver(() => {
    scan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
  setInterval(scan, 2500);
}

setupCardObserver();
console.log('[Google Capture] Observer active');
