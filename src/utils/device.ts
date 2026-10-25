/** Resolves platform CSS classes used by the app shell provider. */
export const getMobileCssClasses = (): string[] | undefined => {
  const win: typeof window & Record<string, any> = window;
  const userAgent = navigator.userAgent || navigator.vendor || win.opera;
  const mobileClass = 'mobile';

  // Windows Phone must come first because its UA also contains "Android".
  if (/windows phone/i.test(userAgent)) {
    return [mobileClass, 'windows'];
  }

  if (/android/i.test(userAgent)) {
    return [mobileClass, 'android'];
  }

  if (/iPad|iPhone|iPod/.test(userAgent) && !win.MSStream) {
    return [mobileClass, 'ios'];
  }

  if (navigator?.maxTouchPoints > 2 && /Mac/.test(userAgent)) {
    return [mobileClass, 'ios'];
  }

  return undefined;
};
