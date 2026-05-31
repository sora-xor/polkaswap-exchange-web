import { describe, expect, it } from 'vitest';

import stakeDialogSource from '@/modules/staking/demeter/components/StakeDialog.vue?raw';

describe('Demeter StakeDialog source', () => {
  it('reserves enough width for the max percentage value in the farm input', () => {
    expect(stakeDialogSource).toContain("'demeter-stake-part'");
    expect(stakeDialogSource).toMatch(
      /\.s-input\.s-input--stake-part\.demeter-stake-part\s*\{[^}]*@include input-slider;/s
    );
    expect(stakeDialogSource).toMatch(
      /&\.three-char\s+\.el-input__inner\s*\{\s*max-width:\s*3\.6ch;\s*width:\s*3\.6ch;/s
    );
    expect(stakeDialogSource).toMatch(/\.s-input__right\s+\.percent\s*\{\s*display:\s*inline-block;\s*min-width:\s*1ch;/s);
  });
});
