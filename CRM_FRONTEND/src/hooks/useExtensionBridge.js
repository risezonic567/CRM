import { useEffect } from 'react';

/**
 * Listen for educational Kiwi extension CustomEvent.
 * No-op unless VITE_ENABLE_KIWI_EXT=true (caller should gate).
 */
export function useExtensionBridge(onFlightCaptured) {
  useEffect(() => {
    if (typeof onFlightCaptured !== 'function') return undefined;

    const handler = (event) => {
      onFlightCaptured(event.detail);
    };

    window.addEventListener('crm:flight-captured', handler);
    return () => window.removeEventListener('crm:flight-captured', handler);
  }, [onFlightCaptured]);
}

export default useExtensionBridge;
