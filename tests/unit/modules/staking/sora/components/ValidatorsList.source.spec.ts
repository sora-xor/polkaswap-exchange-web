import { describe, expect, it } from 'vitest';

import validatorsListSource from '@/modules/staking/sora/components/ValidatorsList.vue?raw';

describe('staking sora ValidatorsList source', () => {
  it('uses the shared design-system search input for manual validator lists', () => {
    expect(validatorsListSource).toContain('<SearchInput');
    expect(validatorsListSource).toContain('class="validators-search"');
    expect(validatorsListSource).toContain('@clear="clearSearch"');
    expect(validatorsListSource).toContain('<template #right>');
    expect(validatorsListSource).not.toContain('prefix="s-icon-basic-search-24"');
  });

  it('pins the production validator list layout rules', () => {
    expect(validatorsListSource).toContain('<div class="validators-table" role="table">');
    expect(validatorsListSource).toContain('class="validator-cell validator-commission"');
    expect(validatorsListSource).toContain('class="validator-cell validator-return"');
    expect(validatorsListSource).toContain('class="validator-cell validator-staked"');
    expect(validatorsListSource).toContain('v-if="canToggleValidatorSelection"');
    expect(validatorsListSource).toContain(':aria-pressed="isSelected(validator)"');
    expect(validatorsListSource).toContain('v-if="showSelectionControls && canToggleValidatorSelection"');
    expect(validatorsListSource).toContain('@click="selectAllValidators"');
    expect(validatorsListSource).toContain('@click="deselectAllValidators"');
    expect(validatorsListSource).not.toContain('<br />');
    expect(validatorsListSource).toMatch(
      /\.empty,\s*\.validators-list-scrollbar\s*\{\s*height:\s*var\(--validators-list-height,\s*380px\);\s*padding-bottom:\s*64px;\s*\}/s
    );
    expect(validatorsListSource).toMatch(
      /\.table-header\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*var\(--validators-table-columns\);[^}]*height:\s*52px;/s
    );
    expect(validatorsListSource).toMatch(
      /\.validator\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*var\(--validators-table-columns\);[^}]*min-height:\s*60px;[^}]*padding:\s*10px 0;/s
    );
    expect(validatorsListSource).toMatch(
      /\.validator-commission,\s*\.validator-return,\s*\.validator-staked\s*\{[^}]*text-align:\s*right;/s
    );
    expect(validatorsListSource).not.toMatch(/\.avatar,\s*\.name\s*\{\s*height:\s*100%;\s*\}/s);
    expect(validatorsListSource).toContain('> .el-scrollbar__wrap > .el-scrollbar__view');
    expect(validatorsListSource).toMatch(
      /&-commission--desc\s+\.chevron,\s*&-return--desc\s+\.chevron,\s*&-staked--desc\s+\.chevron\s*\{\s*transform:\s*rotate\(180deg\);\s*\}/s
    );
    expect(validatorsListSource).toMatch(
      /\.select-area\s*\{[^}]*position:\s*absolute;[^}]*cursor:\s*pointer;[^}]*width:\s*calc\(100%\s*-\s*20px\);[^}]*height:\s*100%;[^}]*appearance:\s*none;[^}]*background:\s*transparent;/s
    );
  });
});
