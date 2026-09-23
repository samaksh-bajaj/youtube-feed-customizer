import type { ClassifyMessage, ClassifyReply } from '@/lib/messages';
import type { VideoMeta } from '@/lib/types';
import { classifyBatch } from '@/lib/classify';
import { BATCH_SIZE } from '@/lib/policy';

export default defineBackground(() => {
  // Judgments for this browser session, keyed by rule and video. Keying on the
  // rule means editing the rule invalidates the old answers for free.
  const cache = new Map<string, number>();

  browser.runtime.onMessage.addListener(
    (message: ClassifyMessage, _sender, sendResponse) => {
      if (message?.type !== 'classify') return;

      classify(message.rule, message.videos, cache).then(sendResponse);
      return true; // keeps the channel open for the async reply
    },
  );
});

async function classify(
  rule: string,
  videos: VideoMeta[],
  cache: Map<string, number>,
): Promise<ClassifyReply> {
  const scores: Record<string, number> = {};
  const unknown: VideoMeta[] = [];

  for (const video of videos) {
    const cached = cache.get(cacheKey(rule, video.videoId));
    if (cached === undefined) unknown.push(video);
    else scores[video.videoId] = cached;
  }

  const batches = chunk(unknown, BATCH_SIZE);
  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        return await classifyBatch(rule, batch);
      } catch (error) {
        // Fail open: no scores means nothing gets hidden. A broken backend
        // must never eat someone's feed.
        console.error('[jev] classification failed', error);
        return {};
      }
    }),
  );

  for (const result of results) {
    for (const [videoId, score] of Object.entries(result)) {
      cache.set(cacheKey(rule, videoId), score);
      scores[videoId] = score;
    }
  }

  return { scores };
}

function cacheKey(rule: string, videoId: string): string {
  return `${rule}\n${videoId}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
