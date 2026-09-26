import axios from 'axios';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

let client = null;

export function getDuffelClient() {
  if (client) return client;

  if (!config.duffel.apiKey && !config.duffel.useMock) {
    logger.warn('DUFFEL_API_KEY is empty — set USE_MOCK_DUFFEL=true for offline');
  }

  client = axios.create({
    baseURL: config.duffel.baseUrl,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Duffel-Version': 'v2',
      Authorization: `Bearer ${config.duffel.apiKey}`,
    },
    timeout: 60000,
  });

  return client;
}

export default getDuffelClient;
