/**
 * Resolves after the provided delay. Mirrors the wallet helper so async flows
 * can await brief pauses without depending on external packages.
 */
export const delay = (ms = 50): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

export default delay;
