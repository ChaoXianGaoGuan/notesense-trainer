export function randomItem<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty list')
  }
  return items[Math.floor(Math.random() * items.length)]
}

export function randomItemAvoiding<T>(items: readonly T[], avoid: T | undefined): T {
  if (items.length <= 1 || avoid === undefined) {
    return randomItem(items)
  }

  const candidates = items.filter((item) => item !== avoid)
  return randomItem(candidates.length > 0 ? candidates : items)
}

export function randomKeyAvoiding<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  previousKey: string | undefined
): T {
  if (!previousKey || items.length <= 1) {
    return randomItem(items)
  }

  const candidates = items.filter((item) => keyOf(item) !== previousKey)
  return randomItem(candidates.length > 0 ? candidates : items)
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}
