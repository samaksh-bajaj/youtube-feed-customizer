import type { VideoMeta } from '@/lib/types';
import {
  CHANNEL,
  ID_CLASS_PREFIX,
  ID_HOST,
  LOCKUP,
  TITLE,
} from './selectors';

/**
 * Read a feed card. Returns null for anything that isn't a fully rendered
 * video — empty placeholder slots, Shorts shelves, Playables — which the
 * caller should simply leave alone.
 */
export function extractVideo(card: Element): VideoMeta | null {
  const lockup = card.querySelector(LOCKUP);
  if (!lockup) return null;

  const videoId = readVideoId(lockup);
  const title = lockup.querySelector(TITLE)?.textContent?.trim();
  const channel = lockup.querySelector(CHANNEL)?.textContent?.trim();

  if (!videoId || !title) return null;

  return { videoId, title, channel: channel ?? '' };
}

function readVideoId(lockup: Element): string | null {
  const host = lockup.querySelector(ID_HOST);
  if (!host) return null;

  for (const className of host.classList) {
    if (className.startsWith(ID_CLASS_PREFIX)) {
      return className.slice(ID_CLASS_PREFIX.length);
    }
  }
  return null;
}
