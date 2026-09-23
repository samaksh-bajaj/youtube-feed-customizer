import '@/assets/ui.css';
import './style.css';
import type { HiddenCountMessage, HiddenCountReply } from '@/lib/messages';
import { apiKeyItem, enabledItem, ruleItem } from '@/lib/storage';

const ruleInput = document.querySelector<HTMLTextAreaElement>('#rule')!;
const enabledInput = document.querySelector<HTMLInputElement>('#enabled')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const status = document.querySelector<HTMLSpanElement>('#status')!;
const hiddenCount = document.querySelector<HTMLSpanElement>('#hidden-count')!;
const noKeyNotice = document.querySelector<HTMLDivElement>('#no-key')!;
const openOptions = document.querySelector<HTMLButtonElement>('#open-options')!;

let statusTimer: ReturnType<typeof setTimeout> | undefined;

function flash(message: string) {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.textContent = ''), 1600);
}

const [rule, enabled, apiKey] = await Promise.all([
  ruleItem.getValue(),
  enabledItem.getValue(),
  apiKeyItem.getValue(),
]);
ruleInput.value = rule;
enabledInput.checked = enabled;
if (!apiKey) noKeyNotice.setAttribute('data-visible', '');

openOptions.addEventListener('click', () => browser.runtime.openOptionsPage());

saveButton.addEventListener('click', async () => {
  await ruleItem.setValue(ruleInput.value.trim());
  flash('Saved');
  // The content script re-judges the feed on its own; give it a moment.
  setTimeout(showHiddenCount, 1200);
});

// The toggle saves immediately — nobody expects to press Save after flipping a switch.
enabledInput.addEventListener('change', async () => {
  await enabledItem.setValue(enabledInput.checked);
  flash(enabledInput.checked ? 'On' : 'Off');
  setTimeout(showHiddenCount, 600);
});

await showHiddenCount();

/** What the tab behind the popup is currently hiding. */
async function showHiddenCount() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;

  const message: HiddenCountMessage = { type: 'hidden-count', tabId: tab.id };

  try {
    const reply = (await browser.runtime.sendMessage(
      message,
    )) as HiddenCountReply;
    const count = reply?.count ?? 0;
    hiddenCount.textContent = count === 0 ? '' : `${count} hidden`;
  } catch {
    hiddenCount.textContent = '';
  }
}
