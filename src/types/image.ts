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
