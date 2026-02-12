import { isToday, isYesterday, format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * Группирует массив объектов по дате.
 * Ключ: "Сегодня", "Вчера" или "d MMMM yyyy"
 */
export function groupByDate<T extends { date: string }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  const dateLocale = ru;

  for (const item of items) {
    const dateObj = parseISO(item.date);
    let key: string;

    if (isToday(dateObj)) {
      key = "Сегодня";
    } else if (isYesterday(dateObj)) {
      key = "Вчера";
    } else {
      key = format(dateObj, "d MMMM yyyy", { locale: dateLocale });
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return groups;
}
