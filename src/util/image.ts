import base64 from 'base-64';
import { saveAs } from 'file-saver';

import type { Nullable } from '@/types/common';

export enum IMAGE_EXTENSIONS {
  SVG = '.svg',
  PNG = '.png',
  JPEG = '.jpeg',
  WEBP = '.webp',
  GIF = '.gif',
}

export const IMAGE_MIME_TYPES = {
  [IMAGE_EXTENSIONS.SVG]: 'image/svg+xml',
  [IMAGE_EXTENSIONS.PNG]: 'image/png',
  [IMAGE_EXTENSIONS.JPEG]: 'image/jpeg',
  [IMAGE_EXTENSIONS.WEBP]: 'image/webp',
  [IMAGE_EXTENSIONS.GIF]: 'image/gif',
};

/** Converts a base64 data URI into a `Blob`. */
export const dataURItoBlob = (dataURI: string): Blob => {
  // convert base64 to raw binary data held in a string
  const byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const _ia = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    _ia[i] = byteString.charCodeAt(i);
  }

  const dataView = new DataView(arrayBuffer);
  const blob = new Blob([dataView], { type: mimeString });

  return blob;
};

/** Creates a `Blob` from an image URL by drawing it onto a canvas. */
export const createImageBlobByUrl = (url: string, mimeType: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.src = url;

    image.onload = () => {
      const { width, height } = image;
      const canvas = Object.assign(document.createElement('canvas'), { width, height });
      const context = canvas.getContext('2d');

      if (context !== null) {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);

        const dataURI = canvas.toDataURL(mimeType);
        const blob = dataURItoBlob(dataURI);

        resolve(blob);
      } else {
        reject(new Error(''));
      }
    };

    image.onerror = (error) => reject(error);
  });
};

/** Serializes an SVG element into a standalone blob. */
export const createSvgBlob = (svgElement: SVGSVGElement): Blob => {
  const data = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([data], { type: 'image/svg+xml' });

  return blob;
};

/**
 * Persists an SVG element to disk, optionally rasterizing to another format
 * before downloading.
 */
export const svgSaveAs = async (
  svgElement: SVGSVGElement,
  name: string,
  extension: IMAGE_EXTENSIONS = IMAGE_EXTENSIONS.SVG
): Promise<void> => {
  let blob = createSvgBlob(svgElement);

  if (extension !== IMAGE_EXTENSIONS.SVG) {
    const mimeType = IMAGE_MIME_TYPES[extension];
    const url = URL.createObjectURL(blob);

    blob = await createImageBlobByUrl(url, mimeType);

    URL.revokeObjectURL(url);
  }

  const filename = `${name}${extension}`;

  saveAs(blob, filename);
};

const ALLOWED_ICON_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

const DATA_URI_BASE64_REGEX = /^data:(image\/[a-z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/i;
const DATA_URI_UTF8_SVG_REGEX = /^data:(image\/svg\+xml)(?:;charset=[a-z0-9-]+|;utf8)?,(.+)$/i;

const decodeBase64 = (value: string): string => {
  try {
    if (typeof atob === 'function') {
      return atob(value);
    }
  } catch (error) {
    console.error(error);
  }

  return base64.decode(value);
};

const encodeBase64 = (value: string): string => {
  try {
    if (typeof btoa === 'function') {
      return btoa(value);
    }
  } catch (error) {
    console.error(error);
  }

  return base64.encode(value);
};

const sanitizeElementAttributes = (element: Element): void => {
  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name;
    const value = attribute.value || '';

    if (/^on/i.test(name) || value.trim().toLowerCase().startsWith('javascript:')) {
      element.removeAttribute(name);
    }
  });
};

const stripDisallowedSvgContent = (rawSvg: string): string | null => {
  if (typeof DOMParser === 'undefined') return null;

  const parser = new DOMParser();
  const document = parser.parseFromString(rawSvg, 'image/svg+xml');

  if (document.querySelector('parsererror')) return null;

  const root = document.documentElement;

  if (!root) return null;

  const disallowedSelectors = ['script', 'foreignObject'];
  disallowedSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.parentNode?.removeChild(node));
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  sanitizeElementAttributes(root);

  while (walker.nextNode()) {
    const element = walker.currentNode as Element;
    if (!element) continue;

    sanitizeElementAttributes(element);
  }

  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!root.getAttribute('width')) {
    root.setAttribute('width', '80px');
  }
  if (!root.getAttribute('height')) {
    root.setAttribute('height', '80px');
  }

  return new XMLSerializer().serializeToString(document);
};

const sanitizeSvgDataUri = (dataUri: string): string => {
  try {
    let decodedSvg = '';

    const base64Match = DATA_URI_BASE64_REGEX.exec(dataUri);
    if (base64Match) {
      const [, mimeType, payload] = base64Match;
      if (mimeType.toLowerCase() !== 'image/svg+xml') return '';
      decodedSvg = decodeBase64(payload);
    } else {
      const utf8Match = DATA_URI_UTF8_SVG_REGEX.exec(dataUri);
      if (!utf8Match) return '';

      const [, mimeType, payload] = utf8Match;
      if (mimeType.toLowerCase() !== 'image/svg+xml') return '';
      decodedSvg = decodeURIComponent(payload);
    }

    const sanitizedSvg = stripDisallowedSvgContent(decodedSvg);

    if (!sanitizedSvg) return '';

    const base64SvgEncoded = encodeBase64(sanitizedSvg);
    return `data:image/svg+xml;base64,${base64SvgEncoded}`;
  } catch (error) {
    console.error(error);
    return '';
  }
};

const sanitizeDataUri = (dataUri: string): string => {
  const base64Match = DATA_URI_BASE64_REGEX.exec(dataUri);
  const utf8SvgMatch = DATA_URI_UTF8_SVG_REGEX.exec(dataUri);
  const mimeType = (base64Match?.[1] ?? utf8SvgMatch?.[1] ?? '').toLowerCase();

  if (!mimeType || !ALLOWED_ICON_MIME_TYPES.has(mimeType)) return '';

  if (mimeType === 'image/svg+xml') {
    return sanitizeSvgDataUri(dataUri);
  }

  if (!base64Match) return '';

  return dataUri;
};

/**
 * Ensures the provided icon URL or data URI is safe to embed. Returns an empty
 * string when the input is considered unsafe.
 */
export const sanitizeIconSource = (icon: Nullable<string>): string => {
  if (!icon) return '';

  const trimmed = icon.trim();

  if (trimmed.startsWith('data:')) {
    return sanitizeDataUri(trimmed);
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return '';
    if (/["'()\s]/.test(trimmed)) return '';

    return url.href;
  } catch (error) {
    console.error(error);
    return '';
  }
};

/**
 * Formats a safe CSS `url()` string escaping troublesome characters.
 */
export const buildCssUrl = (url: string): string => {
  const escaped = url.replace(/["\\\n\r]/g, (char) => `\\${char}`);
  const parenthesesEscaped = escaped.replace(/\)/g, '\\)');

  return `url("${parenthesesEscaped}")`;
};

/** Transform svg data URIs into base64 encoded PNG icons. */
export async function getBase64Icon(icon: string): Promise<string> {
  const safeIcon = sanitizeIconSource(icon);

  if (!safeIcon) return '';
  if (safeIcon.startsWith('data:image/png;base64')) return safeIcon;
  if (safeIcon.startsWith('data:image/svg+xml;base64')) {
    return base64SvgToBase64Png(safeIcon);
  }

  if (safeIcon.startsWith('https://')) {
    return safeIcon;
  }

  return '';
}

/** Helper that renders a base64-encoded SVG onto a canvas and returns a PNG. */
function base64SvgToBase64Png(imgsrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');

    canvas.setAttribute('width', '80');
    canvas.setAttribute('height', '80');

    const context = canvas.getContext('2d');

    const image = new Image();
    image.src = imgsrc;

    image.onload = function () {
      try {
        if (context) {
          context.drawImage(image, 0, 0);
          const base64PNG = canvas.toDataURL('image/png');
          resolve(base64PNG);
        }
      } catch (e) {
        reject(e);
      }
    };
  });
}
