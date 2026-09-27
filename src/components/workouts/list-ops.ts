/**
 * The builder's list moves, as pure functions on arrays: up and down by
 * one, a copy right below, out. Each returns a new array and leaves an
 * index outside the list alone.
 */

export function moveItem<T>(list: readonly T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item!);
  return next;
}

export function duplicateItem<T>(list: readonly T[], index: number): T[] {
  const item = list[index];
  if (item === undefined) return [...list];
  const next = [...list];
  next.splice(index + 1, 0, structuredClone(item));
  return next;
}

export function removeItem<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

export function replaceItem<T>(list: readonly T[], index: number, item: T): T[] {
  return list.map((current, i) => (i === index ? item : current));
}
