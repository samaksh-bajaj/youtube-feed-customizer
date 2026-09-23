export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',

  main(ctx) {
    console.log('[jev] content script loaded', location.href);

    // YouTube is a SPA: navigating from /watch back to the home feed never
    // reloads the page, so the script has to react to URL changes itself.
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      console.log('[jev] location changed', newUrl.href);
    });
  },
});
