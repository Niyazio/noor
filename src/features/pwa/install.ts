/** Native apps are already installed. */
export function useInstallPrompt(): { canInstall: false; ios: false; installed: true; install: () => void } {
  return { canInstall: false, ios: false, installed: true, install: () => undefined };
}
