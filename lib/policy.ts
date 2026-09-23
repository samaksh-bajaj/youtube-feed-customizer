/**
 * The tunables. Everything you'd reach for when the filtering feels wrong
 * lives here, so you don't have to go reading the DOM code to find it.
 */

/** Hide a video when Jev's probability that it should be hidden exceeds this. */
export const HIDE_THRESHOLD = 0.7;

/** Videos per request to the classifier. Drop to 1 if judgments look contaminated. */
export const BATCH_SIZE = 10;

/** How long to wait for the feed to settle before processing newly added cards. */
export const DEBOUNCE_MS = 300;
