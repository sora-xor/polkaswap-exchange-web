import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';

import SRow from './SRow.vue';
import SCol from '../Col/SCol.vue';

describe('SRow', () => {
  test('applies gutter, justify, and align styles', () => {
    const wrapper = mount(SRow, {
      props: {
        gutter: 16,
        justify: 'space-between',
        align: 'middle',
      },
      slots: {
        default: '<div />',
      },
    });

    const style = wrapper.attributes('style');

    expect(style).toContain('--s-row-gutter: 16px');
    expect(style).toContain('justify-content: space-between');
    expect(style).toContain('align-items: center');
  });

  test('provides gutter to child columns', () => {
    const wrapper = mount({
      components: { SRow, SCol },
      template: `
        <SRow :gutter="20">
          <SCol data-test="col" />
        </SRow>
      `,
    });

    const col = wrapper.get('[data-test="col"]');
    expect(col.attributes('style')).toContain('--s-col-gutter: 20px');
  });
});
