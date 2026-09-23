import type { FeedCard, FeedWatcher } from '@/lib/feed/observe';
import type { VideoMeta } from '@/lib/types';
import { getHiddenCount, hideCard, showAll } from '@/lib/feed/hide';
import { watchFeed } from '@/lib/feed/observe';
import { isHomeFeed } from '@/lib/feed/selectors';
import { enabledItem, ruleItem } from '@/lib/storage';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',

  async main(ctx) {
    const [rule, enabled] = await Promise.all([
      ruleItem.getValue(),
      enabledItem.getValue(),
    ]);

    let watcher: FeedWatcher | undefined;

    function handleCards(cards: FeedCard[]) {
      for (const { element, video } of cards) {
        if (shouldHide(video, rule)) hideCard(element);
      }
      console.log(
        `[jev] saw ${cards.length} video(s), ${getHiddenCount()} hidden so far`,
      );
    }

    // YouTube is a SPA: the feed is torn down and rebuilt on navigation without
    // ever reloading the page, so the watcher follows the URL.
    function sync() {
      const shouldRun = enabled && rule !== '' && isHomeFeed();

      if (shouldRun && !watcher) {
        watcher = watchFeed(ctx, handleCards);
      } else if (!shouldRun && watcher) {
        watcher.stop();
        watcher = undefined;
        showAll();
      }
    }

    sync();
    ctx.addEventListener(window, 'wxt:locationchange', sync);
  },
});

/**
 * TEMPORARY stand-in for Jev, so the DOM pipeline can be verified on its own:
 * hides a video when the rule text appears literally in its title or channel.
 */
function shouldHide(video: VideoMeta, rule: string): boolean {
  const needle = rule.trim().toLowerCase();
  if (!needle) return false;

  return `${video.title} ${video.channel}`.toLowerCase().includes(needle);
}
