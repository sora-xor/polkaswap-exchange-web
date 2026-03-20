import { describe, expect, it, vi } from 'vitest';

import FileUploader from '@/lib/soraneo-wallet/src/components/FileUploader.vue';

describe('Wallet FileUploader', () => {
  it('emits the uploaded file when the file size is within the limit', () => {
    const emit = vi.fn();
    const file = { size: 128 } as File;
    const context = {
      $refs: {
        fileInput: {
          files: [file],
        },
      },
      limit: 1024,
      isFileDraggedOver: false,
      isClearBtnShown: false,
      resetFileInput: vi.fn(),
      $emit: emit,
    };

    (FileUploader as any).methods.upload.call(context);

    expect(emit).toHaveBeenNthCalledWith(1, 'hide-limit');
    expect(emit).toHaveBeenNthCalledWith(2, 'upload', file);
    expect(context.isFileDraggedOver).toBe(true);
    expect(context.isClearBtnShown).toBe(true);
  });

  it('shows the limit warning and resets the input when the file is too large', () => {
    const emit = vi.fn();
    const resetFileInput = vi.fn();

    (FileUploader as any).methods.upload.call({
      $refs: {
        fileInput: {
          files: [{ size: 2048 }],
        },
      },
      limit: 1024,
      resetFileInput,
      $emit: emit,
    });

    expect(emit).toHaveBeenNthCalledWith(1, 'hide-limit');
    expect(emit).toHaveBeenNthCalledWith(2, 'show-limit');
    expect(resetFileInput).toHaveBeenCalledTimes(1);
  });
});
