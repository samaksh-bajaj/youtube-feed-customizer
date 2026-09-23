import '@/assets/ui.css';
import './style.css';
import { apiKeyItem } from '@/lib/storage';

const keyInput = document.querySelector<HTMLInputElement>('#api-key')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const status = document.querySelector<HTMLSpanElement>('#status')!;

keyInput.value = await apiKeyItem.getValue();

saveButton.addEventListener('click', async () => {
  await apiKeyItem.setValue(keyInput.value.trim());
  status.textContent = keyInput.value.trim() ? 'Saved' : 'Cleared';
  setTimeout(() => (status.textContent = ''), 1600);
});
