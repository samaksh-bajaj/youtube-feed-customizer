import { TypeSafeClient } from '@typesafe-ai/sdk';
import type { VideoMeta } from './types';
import { buildQuestions, buildState, questionName } from './judgment';

/**
 * Asks Jev about one batch of videos, using the key the user supplied.
 *
 * This runs in the background service worker, which has no `window` and is not
 * reachable from any web page — the key never touches youtube.com. It also
 * means the SDK's browser guard doesn't apply, so retries and backoff come for
 * free.
 */
export async function classifyBatch(
  apiKey: string,
  rule: string,
  videos: VideoMeta[],
): Promise<Record<string, number>> {
  const client = new TypeSafeClient({ apiKey });

  const { answers } = await client.systemOne({
    state: buildState(rule, videos),
    questions: buildQuestions(videos),
  });

  const scores: Record<string, number> = {};
  videos.forEach((video, index) => {
    const answer = answers[questionName(index)];
    if (answer) scores[video.videoId] = answer.noul;
  });

  return scores;
}
