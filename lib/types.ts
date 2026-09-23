/** Everything we know about one video card, and everything Jev gets to judge it on. */
export interface VideoMeta {
  /** YouTube's video id. Stable across DOM recycling, so it's our cache key. */
  videoId: string;
  title: string;
  channel: string;
}
