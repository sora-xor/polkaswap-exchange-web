import { test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SPopover from './SPopover';

function expectMountToThrow(template: string, message: string) {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    expect(() =>
      mount({
        components: { SPopover },
        template,
      })
    ).toThrowError(message);
  } finally {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  }
}

test('Throws an error if no trigger slot', () => {
  expectMountToThrow(`<SPopover />`, '"trigger" slot is required');
});

test('Throws an error if trigger slot is not a single element', () => {
  expectMountToThrow(
    `
      <SPopover>
        <template #trigger>
          <span>A</span>
          <span>B</span>
        </template>
      </SPopover>
    `,
    '"trigger" slot should render exact 1 element'
  );
});

test('Throws an error if popper slot renders more than 1 element', () => {
  expectMountToThrow(
    `
      <SPopover>
        <template #trigger>
          <span>A</span>
        </template>

        <template #popper>
          <span>A</span>
          <span>B</span>
        </template>
      </SPopover>
    `,
    '"popper" slot should return either nothing or the only 1 element'
  );
});
