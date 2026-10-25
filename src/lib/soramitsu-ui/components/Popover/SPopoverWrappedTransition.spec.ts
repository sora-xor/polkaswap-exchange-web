import { test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import SPopoverWrappedTransition from './SPopoverWrappedTransition.vue';
import { POPOVER_API_KEY } from './api';

function createPopoverApi() {
  return reactive({
    show: false,
    popper: null,
    addPopperRefOverride: vi.fn(),
    deletePopperRefOverride: vi.fn(),
  });
}

test('forwards transition hook arguments including done callback', async () => {
  const enterSpy = vi.fn((_, done) => {
    expect(typeof done).toBe('function');
    if (typeof done === 'function') done();
  });
  const leaveSpy = vi.fn((_, done) => {
    expect(typeof done).toBe('function');
    if (typeof done === 'function') done();
  });

  const api = createPopoverApi();

  const wrapper = mount(SPopoverWrappedTransition as any, {
    attrs: {
      css: false,
      onEnter: enterSpy,
      onLeave: leaveSpy,
    },
    slots: {
      default: '<div>Content</div>',
    },
    global: {
      provide: {
        [POPOVER_API_KEY as symbol]: api,
      },
      stubs: {
        transition: false,
      },
    },
  });

  await nextTick();

  api.show = true;
  await nextTick();
  await nextTick();

  expect(enterSpy).toHaveBeenCalled();

  api.show = false;
  await nextTick();
  await nextTick();

  expect(leaveSpy).toHaveBeenCalled();

  wrapper.unmount();
});
