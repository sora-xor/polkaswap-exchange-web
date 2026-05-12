/**
 * Resolves after the requested delay. Kept in a small module so startup code
 * can avoid importing the broad utility barrel.
 */
export async function delay(ms = 50, success = true): Promise<void> {
  return await new Promise((resolve, reject) => setTimeout(success ? resolve : reject, ms));
}
