import type { ClassifyRequest, ClassifyResponse } from './api';
import { SECRET_HEADER } from './api';
import type { VideoMeta } from './types';

const CLASSIFY_URL = import.meta.env.WXT_CLASSIFY_URL;
const SHARED_SECRET = import.meta.env.WXT_JEV_SHARED_SECRET;

/**
 * Calls the backend for one batch. Only the background worker may use this:
 * host permissions exempt it from CORS, and a content script's fetch would be
 * subject to youtube.com's rules instead.
 */
export async function classifyBatch(
  rule: string,
  videos: VideoMeta[],
): Promise<Record<string, number>> {
  if (!CLASSIFY_URL || !SHARED_SECRET) {
    throw new Error(
      'WXT_CLASSIFY_URL and WXT_JEV_SHARED_SECRET must be set at build time',
    );
  }

  const body: ClassifyRequest = { rule, videos };

  const response = await fetch(CLASSIFY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [SECRET_HEADER]: SHARED_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Classifier returned ${response.status}`);
  }

  const { scores } = (await response.json()) as ClassifyResponse;
  return scores;
}
