import { useRegisterSW } from "virtual:pwa-register/react";

const DEFAULT_REMINDER_BODY = "Откройте приложение и отметьте прогресс.";

type UsePwaRegistrationResult = {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => void;
};

export type PushSupportState = {
  isSupported: boolean;
  reason?: string;
};

function toHumanPushError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Браузер заблокировал push-подписку. Проверьте разрешение на уведомления для сайта.";
    }

    if (error.name === "AbortError") {
      return "Не удалось завершить регистрацию push в браузере. Попробуйте снова.";
    }

    if (error.name === "InvalidStateError") {
      return "Сервис-воркер ещё не готов для push. Обновите страницу и повторите.";
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("registration failed")) {
      return "Не удалось зарегистрировать push в браузере. Проверьте интернет, VPN/блокировщики и повторите попытку.";
    }

    return error.message;
  }

  return "Не удалось включить push-уведомления.";
}

export function getPushSupportState(): PushSupportState {
  if (typeof window === "undefined") {
    return { isSupported: false, reason: "window is not available" };
  }

  if (!("serviceWorker" in navigator)) {
    return { isSupported: false, reason: "serviceWorker is not supported" };
  }

  if (!("Notification" in window)) {
    return { isSupported: false, reason: "notification is not supported" };
  }

  if (!("PushManager" in window)) {
    return { isSupported: false, reason: "push is not supported" };
  }

  return { isSupported: true };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    throw new Error("Уведомления не поддерживаются в этом браузере");
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const support = getPushSupportState();
  if (!support.isSupported) {
    throw new Error("Push-уведомления не поддерживаются на этом устройстве");
  }

  if (!window.isSecureContext) {
    throw new Error(
      "Push работает только в защищённом контексте (HTTPS или localhost)."
    );
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (!vapidPublicKey) {
    throw new Error("VITE_VAPID_PUBLIC_KEY не задан");
  }

  const permission = await ensureNotificationPermission();
  if (permission !== "granted") {
    throw new Error("Нет разрешения на уведомления");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  let applicationServerKey: Uint8Array;
  try {
    applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  } catch {
    throw new Error("Некорректный формат VITE_VAPID_PUBLIC_KEY");
  }

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const maybeCreated = await registration.pushManager.getSubscription();
      if (maybeCreated) {
        return maybeCreated;
      }

      // Иногда браузер хранит неконсистентное состояние push-подписки.
      // Чистим состояние и делаем одну повторную попытку.
      const stale = await registration.pushManager.getSubscription();
      if (stale) {
        await stale.unsubscribe().catch(() => undefined);
      }

      await registration.update().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 250));

      try {
        return await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (retryError) {
        throw new Error(
          `${toHumanPushError(retryError)} Возможна блокировка push-сервиса сетью/браузером.`
        );
      }
    }

    throw new Error(toHumanPushError(error));
  }
}

export async function unsubscribePush(
  subscription: PushSubscription | null
): Promise<void> {
  if (!subscription) return;
  await subscription.unsubscribe();
}

export async function showLocalTaskNotification(
  taskTitle: string
): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification("Напоминание по задаче", {
    body: taskTitle || DEFAULT_REMINDER_BODY,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: `task-reminder-${taskTitle}`,
    data: {
      url: "/dashboard/tasks",
    },
  });
}

export const usePwaRegistration = (): UsePwaRegistrationResult => {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  };
};
