import { describe, expect, it, vi } from 'vitest';

import FileUploader from '@/lib/soraneo-wallet/src/components/FileUploader.vue';

const createState = (props: Partial<{ limit: number; accept: string; isLinkProvided: boolean }> = {}, emit = vi.fn()) =>
  (FileUploader as any).setup(
    {
      limit: 100 * 1024,
      accept: 'image/png',
      isLinkProvided: false,
      ...props,
    },
    {
      attrs: {},
      emit,
      expose: vi.fn(),
      slots: {},
    }
  );

describe('Wallet FileUploader', () => {
  it('emits the uploaded file when the file size is within the limit', () => {
    const emit = vi.fn();
    const file = { size: 128 } as File;
    const state = createState({ limit: 1024 }, emit);

    state.fileInput.value = { files: [file] } as HTMLInputElement;
    state.upload();

    expect(emit).toHaveBeenNthCalledWith(1, 'hide-limit');
    expect(emit).toHaveBeenNthCalledWith(2, 'upload', file);
    expect(state.isFileDraggedOver.value).toBe(true);
    expect(state.isClearBtnShown.value).toBe(true);
  });

  it('shows the limit warning and resets the input when the file is too large', () => {
    const emit = vi.fn();
    const state = createState({ limit: 1024 }, emit);

    state.fileInput.value = { files: [{ size: 2048 }] } as HTMLInputElement;
    state.upload();

    expect(emit).toHaveBeenNthCalledWith(1, 'hide-limit');
    expect(emit).toHaveBeenNthCalledWith(2, 'show-limit');
    expect(state.isClearBtnShown.value).toBe(false);
    expect(state.isFileDraggedOver.value).toBe(false);
  });
});
