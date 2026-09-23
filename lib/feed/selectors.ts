/**
 * Every YouTube CSS selector in the project. When the extension suddenly stops
 * filtering, YouTube changed its markup and this is the only file to look at.
 *
 * Verified against the home feed as of September 2026, which renders each video
 * as a `yt-lockup-view-model` inside a `ytd-rich-item-renderer`. Shorts and
 * Playables live in `ytd-rich-section-renderer` siblings and are left alone.
 */

/** The scrolling container YouTube appends new feed rows to. */
export const FEED_CONTAINER = 'ytd-rich-grid-renderer';

/** The container's direct child that actually holds the cards. */
export const FEED_CONTENTS = ':scope > #contents';

/** One feed slot. May hold a video, a Shorts shelf, or nothing yet. */
export const CARD = 'ytd-rich-item-renderer';

/** Present only when the card holds a regular video — our filtering unit. */
export const LOCKUP = 'yt-lockup-view-model';

/** Carries a `content-id-<videoId>` class. */
export const ID_HOST = '[class*="content-id-"]';
export const ID_CLASS_PREFIX = 'content-id-';

export const TITLE = 'a.ytLockupMetadataViewModelTitle';

/** The metadata row reads "<channel> · <views> · <age>"; the channel is first. */
export const CHANNEL = '.ytContentMetadataViewModelMetadataText';

/** The extension only touches the home feed. */
export function isHomeFeed(url: URL | Location = location): boolean {
  return url.pathname === '/';
}
