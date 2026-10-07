import { getItinerary } from '../../integrations/pnr/pnrConverterAdapter.js';
import { AppError } from '../../utils/apiResponse.js';

export async function convertPnr(rawText) {
  const result = await getItinerary(rawText);

  if (!result.segments?.length) {
    throw new AppError(
      'No valid air segments found. Paste Galileo/Sabre-style lines (13 fields each).',
      400
    );
  }

  return result;
}
