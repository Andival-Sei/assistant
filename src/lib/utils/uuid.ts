// Универсальная функция для генерации UUID с поддержкой старых браузеров
export function generateUUID(): string {
  // Проверяем поддержку crypto.randomUUID в безопасном контексте
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn(
        "crypto.randomUUID failed, falling back to manual generation:",
        error
      );
    }
  }

  // Fallback для старых браузеров или небезопасных контекстов
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Более короткая версия для простых ID (если не нужен полный UUID)
export function generateShortId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Проверяем, доступна ли функция crypto
export function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== "undefined" &&
    crypto.randomUUID &&
    typeof crypto.randomUUID === "function"
  );
}
