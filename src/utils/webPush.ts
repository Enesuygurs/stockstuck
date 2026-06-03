// Web Push Notification Utilities for StockStuck

let swRegistration: ServiceWorkerRegistration | null = null;

export const isWebPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const getWebPushPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isWebPushSupported()) return null;

  try {
    if (swRegistration) return swRegistration;
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
};

export const requestWebPushPermission = async (): Promise<boolean> => {
  if (!isWebPushSupported()) return false;

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerServiceWorker();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return false;
  }
};

export interface WebPushOptions {
  body: string;
  symbol?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: any;
}

export const sendWebPushNotification = async (
  title: string,
  options: WebPushOptions
): Promise<boolean> => {
  if (!isWebPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

  try {
    const reg = swRegistration || (await registerServiceWorker());
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, {
        body: options.body,
        icon: options.icon || defaultIcon,
        badge: options.badge || defaultIcon,
        tag: options.tag || (options.symbol ? `alert-${options.symbol}` : 'stockstuck-push'),
        vibrate: [200, 100, 200],
        renotify: true,
        data: {
          url: '/',
          symbol: options.symbol,
          ...(options.data || {})
        }
      } as any);
      return true;
    }

    // Direct Notification Fallback
    const notif = new Notification(title, {
      body: options.body,
      icon: options.icon || defaultIcon,
      tag: options.tag || (options.symbol ? `alert-${options.symbol}` : 'stockstuck-push'),
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn('Failed to send web push notification:', err);
    return false;
  }
};
