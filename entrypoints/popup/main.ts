import { enabledItem, ruleItem } from '@/lib/storage';

const ruleInput = document.querySelector<HTMLTextAreaElement>('#rule')!;
const enabledInput = document.querySelector<HTMLInputElement>('#enabled')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const status = document.querySelector<HTMLSpanElement>('#status')!;

let statusTimer: number | undefined;

function flash(message: string) {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.textContent = ''), 1600);
}

const [rule, enabled] = await Promise.all([
  ruleItem.getValue(),
  enabledItem.getValue(),
]);
ruleInput.value = rule;
enabledInput.checked = enabled;

saveButton.addEventListener('click', async () => {
  await ruleItem.setValue(ruleInput.value.trim());
  flash('Saved');
});

// The toggle saves immediately — nobody expects to press Save after flipping a switch.
enabledInput.addEventListener('change', async () => {
  await enabledItem.setValue(enabledInput.checked);
  flash(enabledInput.checked ? 'On' : 'Off');
});
