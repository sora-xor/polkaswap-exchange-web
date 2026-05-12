/**
 * Keeps document picture-in-picture windows aligned with the active app theme.
 */
export const updatePipTheme = (): void => {
  const pipWindow = (window as any).documentPictureInPicture?.window;
  if (pipWindow) {
    const htmlElement = pipWindow.document.documentElement;
    const theme = document.documentElement.getAttribute('design-system-theme');
    htmlElement.setAttribute('design-system-theme', theme);
  }
};
