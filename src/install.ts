interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * The "Install app" entry only exists on browsers that expose
 * `beforeinstallprompt` (Chromium). Elsewhere the button stays hidden and the
 * app is installed the usual way (e.g. Share -> Add to Home Screen on iOS).
 */
function setup(): void {
  const button = document.querySelector<HTMLButtonElement>('button.install');
  const item = button?.closest('li');
  if (!button || !item) {
    return;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    item.removeAttribute('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    item.setAttribute('hidden', '');
  });

  button.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    item.setAttribute('hidden', '');
    await prompt.prompt();
    await prompt.userChoice;
  });
}

export default {
  setup,
};
