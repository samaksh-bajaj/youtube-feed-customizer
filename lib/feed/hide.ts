/**
 * Hiding is one attribute plus one stylesheet rule, so a card can be revealed
 * again by removing the attribute — no saved styles to restore.
 */

const HIDDEN_ATTR = 'data-jev-hidden';
const STYLE_ID = 'jev-hidden-style';

let hiddenCount = 0;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`;
  document.head.appendChild(style);
}

export function hideCard(card: Element) {
  if (card.hasAttribute(HIDDEN_ATTR)) return;

  ensureStyle();
  card.setAttribute(HIDDEN_ATTR, '');
  hiddenCount += 1;
}

export function showCard(card: Element) {
  if (!card.hasAttribute(HIDDEN_ATTR)) return;

  card.removeAttribute(HIDDEN_ATTR);
  hiddenCount = Math.max(0, hiddenCount - 1);
}

/** Reveal everything. Used when the rule changes or the extension is toggled off. */
export function showAll(root: ParentNode = document) {
  for (const card of root.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
    card.removeAttribute(HIDDEN_ATTR);
  }
  hiddenCount = 0;
}

export function getHiddenCount(): number {
  return hiddenCount;
}
