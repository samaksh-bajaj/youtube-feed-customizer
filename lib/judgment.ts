import { noul } from '@typesafe-ai/sdk';
import type { NoulQuestion } from '@typesafe-ai/sdk';
import type { VideoMeta } from './types';

/**
 * How a feed rule becomes a question Jev can answer.
 *
 * A batch travels as one piece of state with one Noul per video — the fan-out
 * pattern from the TypeSafe docs — so the rule is serialised once and ten
 * videos cost one round trip instead of ten.
 *
 * This is the only place the judgment is defined. Asking Jev something
 * different, or asking it more than one thing per video, starts here.
 */

export function buildState(rule: string, videos: VideoMeta[]) {
  return {
    rule,
    videos: videos.map((video) => ({
      title: video.title,
      channel: video.channel,
    })),
  };
}

export function buildQuestions(
  videos: VideoMeta[],
): Record<string, NoulQuestion> {
  const questions: Record<string, NoulQuestion> = {};

  videos.forEach((_, index) => {
    questions[questionName(index)] = noul(
      `The user's rule for their YouTube home feed is \`rule\`. Considering the video at \`videos[${index}]\`, should it be kept off their feed?`,
      {
        true:
          'The rule asks for videos like this one to be kept off the feed, or ' +
          'the rule describes the feed the user wants and this video clearly ' +
          'does not belong in it.',
        false:
          'The rule allows this video, or the rule says nothing that applies to it.',
      },
    );
  });

  return questions;
}

export function questionName(index: number): string {
  return `v${index}`;
}
