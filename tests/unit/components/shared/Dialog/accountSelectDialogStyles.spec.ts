import { describe, expect, it } from 'vitest';

import selectSubAccountSource from '@/features/bridge/components/SelectSubAccount.vue?raw';
import selectSoraAccountSource from '@/components/shared/Dialog/SelectSoraAccount.vue?raw';

const accountDialogSources: Array<[string, string]> = [
  ['SelectSoraAccount.vue', selectSoraAccountSource],
  ['SelectSubAccount.vue', selectSubAccountSource],
];

describe('account select dialog styles', () => {
  it.each(accountDialogSources)(
    'keeps the wallet selector title from over-reserving header control space in %s',
    (_file, source) => {
      expect(source).toContain('.dialog-card .base-title.base-title--center');
      expect(source).toMatch(/padding-left:\s*calc\(var\(--s-size-medium\) \+ 8px\);/);
      expect(source).toMatch(/padding-right:\s*calc\(var\(--s-size-medium\) \+ 8px\);/);
      expect(source).toMatch(/\.dialog-card \.base-title_text\s*\{[\s\S]*min-width:\s*0;/);
      expect(source).toContain('@media (max-width: 480px)');
      expect(source).toMatch(/\.dialog-card \.base-title_text\s*\{[\s\S]*white-space:\s*normal;/);
    }
  );
});
