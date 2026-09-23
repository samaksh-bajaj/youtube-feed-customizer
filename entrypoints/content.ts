import type { FeedCard } from '@/lib/feed/observe';
import type { ClassifyMessage, ClassifyReply, ReportHiddenMessage } from '@/lib/messages';
import type { VideoMeta } from '@/lib/types';
import { getHiddenCount, hideCard, showAll } from '@/lib/feed/hide';
import { stillShows, watchFeed } from '@/lib/feed/observe';
import { isHomeFeed } from '@/lib/feed/selectors';
import { HIDE_THRESHOLD } from '@/lib/policy';
import { enabledItem, ruleItem } from '@/lib/storage';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',

  async main(ctx) {
    let rule = await ruleItem.getValue();
    let enabled = await enabledItem.getValue();

    // Decisions for this page, so a card that YouTube re-renders can be hidden
    // again immediately instead of waiting on another round trip.
    const decisions = new Map<string, boolean>();

    const filtering = () => enabled && rule !== '' && isHomeFeed();

    async function handleCards(cards: FeedCard[]) {
      if (!filtering()) return;

      const undecided: FeedCard[] = [];
      for (const card of cards) {
        const decided = decisions.get(card.video.videoId);
        if (decided === undefined) undecided.push(card);
        else if (decided) hideCard(card.element);
      }

      if (undecided.length === 0) {
        reportHidden();
        return;
      }

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
      reportHidden();
    }

    const watcher = watchFeed(ctx, handleCards);

    // Editing the rule invalidates every judgment made under the old one.
    ruleItem.watch((next) => {
      rule = next;
      decisions.clear();
      showAll();
      reportHidden();
      watcher.rescan();
    });

    enabledItem.watch((next) => {
      enabled = next;
      if (enabled) {
        watcher.rescan();
      } else {
        showAll();
        reportHidden();
      }
    });
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

/** Tells the worker what this tab is hiding, so the popup can show a number. */
function reportHidden() {
  const message: ReportHiddenMessage = {
    type: 'report-hidden',
    count: getHiddenCount(),
  };
  browser.runtime.sendMessage(message).catch(() => {
    // The worker may be asleep. The count is cosmetic; losing it is fine.
  });
}
