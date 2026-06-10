import { useEffect, useState } from 'react'
import { loadJson, saveJson } from './storage'

export function usePersistentState<T>(
  key: string,
  fallback: T,
  normalize?: (value: T) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const loaded = loadJson(key, fallback)
    return normalize ? normalize(loaded) : loaded
  })

  useEffect(() => {
    saveJson(key, value)
  }, [key, value])

  return [value, setValue]
}
