import type { FeedCard } from '@/lib/feed/observe';
import type { ClassifyMessage, ClassifyReply } from '@/lib/messages';
import type { VideoMeta } from '@/lib/types';
import { getHiddenCount, hideCard } from '@/lib/feed/hide';
import { stillShows, watchFeed } from '@/lib/feed/observe';
import { isHomeFeed } from '@/lib/feed/selectors';
import { HIDE_THRESHOLD } from '@/lib/policy';
import { enabledItem, ruleItem } from '@/lib/storage';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',

  async main(ctx) {
    const [rule, enabled] = await Promise.all([
      ruleItem.getValue(),
      enabledItem.getValue(),
    ]);

    if (!enabled || rule === '') return;

    // Decisions for this page, so a card that YouTube re-renders can be hidden
    // again immediately instead of waiting on another round trip.
    const decisions = new Map<string, boolean>();

    async function handleCards(cards: FeedCard[]) {
      if (!isHomeFeed()) return;

      const undecided: FeedCard[] = [];
      for (const card of cards) {
        const decided = decisions.get(card.video.videoId);
        if (decided === undefined) undecided.push(card);
        else if (decided) hideCard(card.element);
      }

      if (undecided.length === 0) return;

      const scores = await requestScores(
        rule,
        undecided.map((card) => card.video),
      );

      for (const { element, video } of undecided) {
        const score = scores[video.videoId];
        if (score === undefined) continue; // no judgment: leave it alone

        const hide = score > HIDE_THRESHOLD;
        decisions.set(video.videoId, hide);

        // The round trip gave YouTube time to recycle the element for a
        // different video; hiding it now would hide the wrong thing.
        if (hide && stillShows(element, video.videoId)) hideCard(element);
      }

      console.log(
        `[jev] judged ${undecided.length} new video(s), ` +
          `${getHiddenCount()} hidden on this page`,
      );
    }

    watchFeed(ctx, handleCards);
  },
});

async function requestScores(
  rule: string,
  videos: VideoMeta[],
): Promise<Record<string, number>> {
  const message: ClassifyMessage = { type: 'classify', rule, videos };

  try {
    const reply = (await browser.runtime.sendMessage(message)) as ClassifyReply;
    return reply?.scores ?? {};
  } catch (error) {
    // Fail open. An unreachable background worker leaves the feed as it is.
    console.error('[jev] could not reach the background worker', error);
    return {};
  }
}
