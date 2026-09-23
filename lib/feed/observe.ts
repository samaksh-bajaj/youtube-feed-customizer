import type { ContentScriptContext } from '#imports';
import type { VideoMeta } from '@/lib/types';
import { DEBOUNCE_MS } from '@/lib/policy';
import { extractVideo } from './extract';
import { CARD, FEED_CONTAINER, FEED_CONTENTS } from './selectors';

export interface FeedCard {
  element: Element;
  video: VideoMeta;
}

export interface FeedWatcher {
  /** Forget every decision made so far and look at the whole feed again. */
  rescan(): void;
  stop(): void;
}

/** Marks which video a card element was last processed for. */
const PROCESSED_ATTR = 'data-jev-id';

const CONTAINER_POLL_MS = 500;
const CONTAINER_POLL_ATTEMPTS = 40;

/**
 * Watches the home feed and hands every not-yet-seen video to `onCards`, both
 * for what's already on screen and for everything infinite scroll adds later.
 *
 * Cards are keyed by video id rather than by element because YouTube recycles
 * card elements as you scroll — the same node comes back holding a different
 * video, and that has to count as new.
 */
export function watchFeed(
  ctx: ContentScriptContext,
  onCards: (cards: FeedCard[]) => void,
): FeedWatcher {
  let observer: MutationObserver | undefined;
  let scanTimer: number | undefined;
  let contents: Element | undefined;
  let stopped = false;

  function collect(): FeedCard[] {
    if (!contents) return [];

    const found: FeedCard[] = [];
    for (const element of contents.querySelectorAll(CARD)) {
      const video = extractVideo(element);
      if (!video) continue;
      if (element.getAttribute(PROCESSED_ATTR) === video.videoId) continue;

      element.setAttribute(PROCESSED_ATTR, video.videoId);
      found.push({ element, video });
    }
    return found;
  }

  function scan() {
    if (stopped || !ctx.isValid) return;

    const cards = collect();
    if (cards.length > 0) onCards(cards);
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = ctx.setTimeout(scan, DEBOUNCE_MS);
  }

  function attach(container: Element) {
    contents = container.querySelector(FEED_CONTENTS) ?? container;

    observer = new MutationObserver(scheduleScan);
    observer.observe(contents, { childList: true, subtree: true });

    scan();
  }

  // The grid is rendered after the shell, and after every SPA navigation back
  // to the feed, so we wait for it rather than assuming it's there.
  let attempts = 0;
  function findContainer() {
    if (stopped || !ctx.isValid) return;

    const container = document.querySelector(FEED_CONTAINER);
    if (container) {
      attach(container);
      return;
    }

    if (++attempts < CONTAINER_POLL_ATTEMPTS) {
      ctx.setTimeout(findContainer, CONTAINER_POLL_MS);
    } else {
      console.warn('[jev] gave up looking for the feed container');
    }
  }
  findContainer();

  return {
    rescan() {
      for (const element of document.querySelectorAll(`[${PROCESSED_ATTR}]`)) {
        element.removeAttribute(PROCESSED_ATTR);
      }
      scan();
    },
    stop() {
      stopped = true;
      clearTimeout(scanTimer);
      observer?.disconnect();
      observer = undefined;
    },
  };
}
