/**
 * Fonts that every route paints with: the Sora UI font and the legacy icon glyph
 * font. Locale-specific fonts (e.g. Noto Nastaliq Urdu) stay on demand.
 */
export const FIRST_PAINT_FONTS: readonly string[] = Object.freeze(['400 1em Sora', '1em soramitsu-icons']);

type FontLoader = Pick<FontFaceSet, 'load'>;

/**
 * Starts downloading the first-paint fonts without waiting for them.
 *
 * Browsers only fetch a web font once text that uses it is rendered, which here
 * is after every startup chunk has loaded; the late font then re-lays out the
 * page. The bootstrap script runs after the stylesheet (with the `@font-face`
 * rules) has loaded, so calling this from bootstrap downloads the fonts
 * alongside the JS chunks without competing with the render-blocking CSS.
 * Best effort: unsupported environments and load failures are ignored.
 */
export function warmFirstPaintFonts(
  fontSet: FontLoader | undefined = typeof document === 'undefined' ? undefined : document.fonts
): void {
  if (typeof fontSet?.load !== 'function') return;

  for (const font of FIRST_PAINT_FONTS) {
    try {
      void fontSet.load(font).catch(() => undefined);
    } catch {
      // Ignore environments that reject the font shorthand.
    }
  }
}
