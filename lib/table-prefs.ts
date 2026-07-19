const PREFIX = "monitor-processual:column-order:";

export function loadColumnOrder(userId: string): string[] | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((v) => typeof v === "string") ? parsed : null;
  } catch {
    return null;
  }
}

export function saveColumnOrder(userId: string, order: string[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(PREFIX + userId, JSON.stringify(order));
  } catch {
    // Ignore quota/serialization errors — reordering just won't persist this time.
  }
}
