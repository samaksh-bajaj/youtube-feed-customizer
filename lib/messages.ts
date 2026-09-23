import type { VideoMeta } from './types';

/** Content script asks the background worker to judge a set of videos. */
export interface ClassifyMessage {
  type: 'classify';
  rule: string;
  videos: VideoMeta[];
}

/**
 * Probabilities by video id. Ids may be missing — a failed request or an
 * unanswered question means "no judgment", which the caller treats as "leave
 * it visible".
 */
export interface ClassifyReply {
  scores: Record<string, number>;
}

/** Content script tells the worker how many videos it has hidden. */
export interface ReportHiddenMessage {
  type: 'report-hidden';
  count: number;
}

/** Popup asks the worker what a given tab has hidden. */
export interface HiddenCountMessage {
  type: 'hidden-count';
  tabId: number;
}

export interface HiddenCountReply {
  count: number;
}

export type Message =
  ClassifyMessage | ReportHiddenMessage | HiddenCountMessage;
