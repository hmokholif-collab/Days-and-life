// Notifications helper: the old buttons called Notification.requestPermission()
// and ignored the result, so a tap did nothing visible when the browser had
// already blocked notifications (requestPermission then returns 'denied'
// immediately, with no prompt). These helpers always report the real state.

export type NotifState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getNotificationState(): NotifState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifState;
}

export async function requestNotificationPermission(): Promise<NotifState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result as NotifState;
  } catch {
    return Notification.permission as NotifState;
  }
}

// Show a local notification. Prefer the service worker so it also appears
// when the PWA is in the background; fall back to a page notification.
export async function showNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: '/icon.svg' });
      return;
    }
  } catch {
    // fall through to the page notification
  }
  try {
    new Notification(title, { body });
  } catch {
    // notifications unavailable in this context
  }
}
