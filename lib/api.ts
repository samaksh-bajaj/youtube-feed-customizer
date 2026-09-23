import type { VideoMeta } from './types';

/** Body of `POST /api/classify`. */
export interface ClassifyRequest {
  /** The user's feed rule, in their own words. */
  rule: string;
  videos: VideoMeta[];
}

/**
 * Jev's probability, per video id, that the video should be kept off the feed.
 * The extension owns the threshold, so the endpoint stays a judgment and the
 * policy can change without a redeploy.
 */
export interface ClassifyResponse {
  scores: Record<string, number>;
}

/** Header carrying the shared secret. */
export const SECRET_HEADER = 'x-jev-secret';

/** Most videos one request may carry. The client batches; this is the guard. */
export const MAX_VIDEOS_PER_REQUEST = 25;
