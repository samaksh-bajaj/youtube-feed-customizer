import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'YouTube Feed Customizer',
    description:
      'Filter your YouTube home feed with a rule written in plain English. Judged by Jev.',
    permissions: ['storage'],
  },
});
