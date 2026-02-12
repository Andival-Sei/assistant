/**
 * Склонение слова «позиция» по числу.
 * 1 позиция, 2 позиции, 5 позиций
 */
export function pluralizePosition(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "позиция";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100))
    return "позиции";
  return "позиций";
}
