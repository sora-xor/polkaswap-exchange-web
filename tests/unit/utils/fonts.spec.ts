import { describe, expect, it, vi } from 'vitest';

import { FIRST_PAINT_FONTS, warmFirstPaintFonts } from '@/utils/fonts';

describe('warmFirstPaintFonts', () => {
  it('requests the Sora UI font and the icon glyph font', () => {
    const load = vi.fn(async () => []);

    warmFirstPaintFonts({ load } as unknown as FontFaceSet);

    expect(FIRST_PAINT_FONTS).toEqual(['400 1em Sora', '1em soramitsu-icons']);
    expect(load.mock.calls.map(([font]) => font)).toEqual([...FIRST_PAINT_FONTS]);
  });

  it('does not wait for the fonts or surface load failures', async () => {
    const load = vi.fn(() => Promise.reject(new Error('network')));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    expect(warmFirstPaintFonts({ load } as unknown as FontFaceSet)).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.off('unhandledRejection', unhandled);
    expect(load).toHaveBeenCalledTimes(FIRST_PAINT_FONTS.length);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('keeps going when the environment rejects a font shorthand', () => {
    const load = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new SyntaxError('bad font');
      })
      .mockImplementation(async () => []);

    expect(() => warmFirstPaintFonts({ load } as unknown as FontFaceSet)).not.toThrow();
    expect(load).toHaveBeenCalledTimes(FIRST_PAINT_FONTS.length);
  });

  it('is a no-op without the CSS Font Loading API', () => {
    expect(() => warmFirstPaintFonts(undefined)).not.toThrow();
    expect(() => warmFirstPaintFonts({} as unknown as FontFaceSet)).not.toThrow();
  });
});
