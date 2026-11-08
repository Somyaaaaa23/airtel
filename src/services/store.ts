/** Small wrapper over localStorage for the prototype's records. Storage can be blocked (private window), so every call is guarded. */
export function readList<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export function writeList<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, 100)));
  } catch {
    // Not persisted; the session still works.
  }
}
