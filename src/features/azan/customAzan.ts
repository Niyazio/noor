/**
 * Native builds use the Azan bundled at build time (see bundledSound.ts); a user-chosen file is
 * only supported in the web app, where nothing can be bundled into notifications.
 */
export const customAzanSupported = false;
export async function getCustomAzan(): Promise<{ name: string; url: string } | null> {
  return null;
}
export async function saveCustomAzan(_file: Blob, _name: string): Promise<void> {
  throw new Error('Not supported on this platform');
}
export async function removeCustomAzan(): Promise<void> {}
