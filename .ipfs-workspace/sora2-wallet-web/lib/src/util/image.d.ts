import type { Nullable } from '@/types/common';
export declare enum IMAGE_EXTENSIONS {
  SVG = '.svg',
  PNG = '.png',
  JPEG = '.jpeg',
  WEBP = '.webp',
  GIF = '.gif',
}
export declare const IMAGE_MIME_TYPES: {
  '.svg': string;
  '.png': string;
  '.jpeg': string;
  '.webp': string;
  '.gif': string;
};
/** Converts a base64 data URI into a `Blob`. */
export declare const dataURItoBlob: (dataURI: string) => Blob;
/** Creates a `Blob` from an image URL by drawing it onto a canvas. */
export declare const createImageBlobByUrl: (url: string, mimeType: string) => Promise<Blob>;
/** Serializes an SVG element into a standalone blob. */
export declare const createSvgBlob: (svgElement: SVGSVGElement) => Blob;
/**
 * Persists an SVG element to disk, optionally rasterizing to another format
 * before downloading.
 */
export declare const svgSaveAs: (
  svgElement: SVGSVGElement,
  name: string,
  extension?: IMAGE_EXTENSIONS
) => Promise<void>;
/**
 * Ensures the provided icon URL or data URI is safe to embed. Returns an empty
 * string when the input is considered unsafe.
 */
export declare const sanitizeIconSource: (icon: Nullable<string>) => string;
/**
 * Formats a safe CSS `url()` string escaping troublesome characters.
 */
export declare const buildCssUrl: (url: string) => string;
/** Transform svg data URIs into base64 encoded PNG icons. */
export declare function getBase64Icon(icon: string): Promise<string>;
