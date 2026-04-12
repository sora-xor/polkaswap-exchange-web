import { describe, expect, it } from 'vitest';

import formSource from '@/components/pages/Swap/Widget/Form.vue?raw';

describe('SwapForm source', () => {
  it('keeps the noir swap CTA depth and text color aligned with production', () => {
    expect(formSource).toContain(':global(.swap-form button.el-button.neumorphic.action-button.s-primary)');
    expect(formSource).toContain('border-color: #ede4e7 !important;');
    expect(formSource).toContain('background-color: #f82088 !important;');
    expect(formSource).toContain('border-color: #f2eaed !important;');
    expect(formSource).toContain('0 0 6.42111px rgba(247, 84, 163, 0.16) !important;');
    expect(formSource).toContain(
      ":global([design-system-theme='dark'] .swap-form button.el-button.neumorphic.action-button.s-primary)"
    );
    expect(formSource).toContain('border-color: #693d81 !important;');
    expect(formSource).toContain('1px 1px 5px #391057');
    expect(formSource).toContain('-1px -1px 5px #9b6fa5 !important;');
    expect(formSource).toContain('background-color: #f754a3 !important;');
    expect(formSource).toContain('border-color: #592d71 !important;');
    expect(formSource).toContain('color: #391057 !important;');
  });
});
