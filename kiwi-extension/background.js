/**
 * Educational service worker — bridges Kiwi ↔ CRM and focuses CRM after capture.
 */

console.log('[Kiwi Capture] Service worker started');

let lastCrmTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'REGISTER_CRM_TAB') {
    if (sender?.tab?.id) {
      lastCrmTabId = sender.tab.id;
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === 'FLIGHT_CAPTURED') {
    const flight = {
      ...message.payload,
      id: crypto.randomUUID(),
      source: message.payload?.captureSource || 'kiwi',
    };

    chrome.storage.local.get(['capturedFlights'], (result) => {
      const list = Array.isArray(result.capturedFlights)
        ? result.capturedFlights
        : [];
      list.push(flight);
      chrome.storage.local.set({ capturedFlights: list });
    });

    notifyAndFocusCrm(flight).then(() => {
      sendResponse({ success: true, id: flight.id });
    });
    return true;
  }

  if (message?.type === 'GET_CAPTURED_FLIGHTS') {
    chrome.storage.local.get(['capturedFlights'], (result) => {
      sendResponse({
        flights: Array.isArray(result.capturedFlights)
          ? result.capturedFlights
          : [],
      });
    });
    return true;
  }

  if (message?.type === 'CLEAR_FLIGHTS') {
    chrome.storage.local.set({ capturedFlights: [] });
    sendResponse({ success: true });
    return true;
  }

  return false;
});

async function notifyAndFocusCrm(flight) {
  let targetTabId = lastCrmTabId;

  try {
    const tabs = await chrome.tabs.query({ url: 'http://localhost:5173/*' });
    const ids = tabs.map((t) => t.id).filter(Boolean);

    if (!targetTabId || !ids.includes(targetTabId)) {
      targetTabId = ids[0] || null;
    }

    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'FLIGHT_RECEIVED',
          payload: flight,
        });
      } catch (err) {
        console.warn('[Kiwi Capture] CRM tab not ready:', err?.message);
      }
    }

    if (targetTabId) {
      const tab = await chrome.tabs.get(targetTabId);
      await chrome.tabs.update(targetTabId, { active: true });
      if (tab.windowId != null) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    }
  } catch (err) {
    console.warn('[Kiwi Capture] notifyAndFocusCrm failed:', err?.message);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ capturedFlights: [] });
});
