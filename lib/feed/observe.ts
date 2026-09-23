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
  /** Forget which cards have been handled and look at the whole feed again. */
  rescan(): void;
  stop(): void;
}

/** Marks which video a card element was last processed for. */
const PROCESSED_ATTR = 'data-jev-id';

/**
 * True while a card element is still showing the video it was processed for.
 * Worth checking before acting on a decision that took a network round trip —
 * by then the element may have been recycled for something else.
 */
export function stillShows(element: Element, videoId: string): boolean {
  return element.getAttribute(PROCESSED_ATTR) === videoId;
}

/** How often to check that we're still attached to the feed that's on screen. */
const RECHECK_MS = 1000;

/**
 * Watches the home feed and hands every not-yet-seen video to `onCards`, both
 * for what's already on screen and for everything infinite scroll adds later.
 *
 * Two things make this less simple than a MutationObserver:
 *
 * YouTube is a single-page app. It tears the feed down and builds a new one on
 * navigation without ever reloading the page, which leaves an observer bound to
 * a container that is no longer on screen. Rather than trying to catch every
 * navigation, the watcher re-checks on a timer that the container it holds is
 * still the one in the document, and re-attaches when it isn't. That covers
 * navigations nobody thought to listen for.
 *
 * YouTube also recycles card elements as you scroll, so cards are keyed by
 * video id rather than by element: the same node coming back with a different
 * video in it has to count as new.
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

  /** Attach to whatever feed is on screen now, if it isn't the one we hold. */
  function ensureAttached() {
    if (stopped || !ctx.isValid) return;

    if (contents && document.contains(contents)) return;

    const container = document.querySelector(FEED_CONTAINER);
    if (!container) {
      // Off the home feed, or it hasn't rendered yet. Try again next tick.
      observer?.disconnect();
      observer = undefined;
      contents = undefined;
      return;
    }

    observer?.disconnect();
    contents = container.querySelector(FEED_CONTENTS) ?? container;
    observer = new MutationObserver(scheduleScan);
    observer.observe(contents, { childList: true, subtree: true });
    scan();
  }

  ensureAttached();
  ctx.setInterval(ensureAttached, RECHECK_MS);

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
