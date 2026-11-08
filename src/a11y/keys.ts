/** Keyboard helpers shared by menus, tab lists, segmented controls and dialogs. */

/** Index to move to for an arrow/Home/End key in a row or column of `count` items (wraps), or null for other keys. */
export function arrowTarget(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** Next element for Tab inside a dialog: wraps from last to first (and back with Shift). */
export function cycleFocus(index: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  if (index < 0) return shift ? count - 1 : 0;
  return shift ? (index - 1 + count) % count : (index + 1) % count;
}

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Arrow-key navigation across sibling buttons in a group; moves focus and optionally activates. */
export function onGroupKeys(e: React.KeyboardEvent<HTMLElement>, activate = false) {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])")];
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = arrowTarget(e.key, Math.max(0, i), items.length);
  if (next === null || i < 0) return;
  e.preventDefault();
  items[next].focus();
  if (activate) items[next].click();
}
