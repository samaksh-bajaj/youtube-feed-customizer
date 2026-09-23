import { storage } from '#imports';

/** The user's feed rule, in their own words. Empty means "filter nothing". */
export const ruleItem = storage.defineItem<string>('local:rule', {
  fallback: '',
});

/** Master on/off switch. Off leaves the feed completely untouched. */
export const enabledItem = storage.defineItem<boolean>('local:enabled', {
  fallback: true,
});

/**
 * The user's own TypeSafe key. Stored locally and read only by the background
 * worker, which is the one context no web page can reach.
 */
export const apiKeyItem = storage.defineItem<string>('local:apiKey', {
  fallback: '',
});
