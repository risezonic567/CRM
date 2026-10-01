/**
 * Educational bridge on CRM origin (localhost:5173).
 * Registers this tab so background can focus it after Send to CRM.
 */

console.log('[CRM Bridge] Content script loaded on CRM');

try {
  chrome.runtime.sendMessage({ type: 'REGISTER_CRM_TAB' });
} catch {
  /* extension context may be unavailable */
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FLIGHT_RECEIVED') {
    window.dispatchEvent(
      new CustomEvent('crm:flight-captured', {
        detail: message.payload,
      })
    );
    sendResponse({ received: true });
    return true;
  }
  return false;
});
