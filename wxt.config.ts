import { defineConfig } from 'wxt';

export default defineConfig({
  // A function, not an object: WXT loads .env after reading this file, so the
  // classifier URL is only readable once the manifest is actually built.
  manifest: () => ({
    name: 'YouTube Feed Customizer',
    description:
      'Filter your YouTube home feed with a rule written in plain English. Judged by Jev.',
    permissions: ['storage'],
    host_permissions: [classifierOrigin()],
  }),
});

/**
 * The background worker needs permission for whatever host the classifier is
 * deployed to, and that changes between localhost and production — so it's
 * derived from the same variable the fetch uses rather than hardcoded.
 */
function classifierOrigin(): string {
  const url = process.env.WXT_CLASSIFY_URL;
  if (!url) {
    throw new Error(
      'WXT_CLASSIFY_URL is not set. Copy .env.example to .env and fill it in.',
    );
  }
  return `${new URL(url).origin}/*`;
}
