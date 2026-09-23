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

export type Message = ClassifyMessage;
