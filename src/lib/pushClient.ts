// Cliente de notificaciones push (PWA).
// - Pide la clave VAPID al servidor, suscribe este dispositivo y la guarda.
// - Muestra un aviso amable una sola vez si el usuario aún no decidió.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getPushState(): Promise<'subscribed' | 'denied' | 'default' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) return 'subscribed';
  } catch { /* seguir */ }
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied';
  return 'default';
}

export async function subscribePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const keyRes = await fetch('/api/push/vapid-public-key', { credentials: 'same-origin' });
    const keyData = await keyRes.json();
    if (!keyData?.success || !keyData.publicKey) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as unknown as ArrayBuffer,
      });
    }
    const json = sub.toJSON();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    const data = await res.json();
    return Boolean(data?.success);
  } catch {
    return false;
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => undefined);
    }
  } catch { /* silencioso */ }
}
