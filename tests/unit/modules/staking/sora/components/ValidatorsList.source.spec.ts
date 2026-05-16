import { describe, expect, it } from 'vitest';

import validatorsListSource from '@/modules/staking/sora/components/ValidatorsList.vue?raw';

describe('staking sora ValidatorsList source', () => {
  it('pins the production validator list layout rules', () => {
    expect(validatorsListSource).toContain('<div class="info">');
    expect(validatorsListSource).toMatch(
      /\.empty,\s*\.validators-list-scrollbar\s*\{\s*height:\s*380px;\s*padding-bottom:\s*64px;\s*\}/s
    );
    expect(validatorsListSource).toMatch(/\.validator\s*\{[^}]*min-height:\s*60px;[^}]*padding:\s*10px 0;/s);
    expect(validatorsListSource).toMatch(/\.avatar\s*\{\s*flex:\s*0 0 36px;\s*margin-right:\s*10px;/s);
    expect(validatorsListSource).not.toMatch(/\.avatar,\s*\.name\s*\{\s*height:\s*100%;\s*\}/s);
    expect(validatorsListSource).toContain('> .el-scrollbar__wrap > .el-scrollbar__view');
    expect(validatorsListSource).toMatch(
      /&-commission--desc\s+\.chevron,\s*&-return--desc\s+\.chevron,\s*&-staked--desc\s+\.chevron\s*\{\s*transform:\s*rotate\(180deg\);\s*\}/s
    );
    expect(validatorsListSource).toMatch(
      /\.select-area\s*\{\s*position:\s*absolute;\s*cursor:\s*pointer;\s*top:\s*0;\s*left:\s*0;\s*width:\s*calc\(100%\s*-\s*20px\);\s*height:\s*100%;\s*\}/s
    );
  });
});
