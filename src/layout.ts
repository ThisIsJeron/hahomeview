// Per-page tile order and sizes. Pure; persisted in localStorage.
// ponytail: per-device storage (a wall iPad has its own layout). HA's frontend/set_user_data could sync it per user later.
export type Size = "S" | "M" | "L";
export interface PageLayout {
  order: string[];
  sizes: Record<string, Size>;
}
export type Layouts = Record<string, PageLayout>;

/** [columns, rows] a size spans. */
export const SPAN: Record<Size, [number, number]> = { S: [1, 1], M: [2, 1], L: [2, 2] };
export const nextSize = (s: Size = "S"): Size => (s === "S" ? "M" : s === "M" ? "L" : "S");

const KEY = "hv-layout";
export function loadLayouts(): Layouts {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveLayouts(l: Layouts) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {}
}

/** Known ids first in saved order, then anything new in its natural order. */
export function orderTiles<T extends { id: string }>(tiles: T[], layout?: PageLayout): T[] {
  if (!layout?.order.length) return tiles;
  const rank = new Map(layout.order.map((id, i) => [id, i]));
  return tiles
    .map((t, i) => ({ t, k: rank.has(t.id) ? rank.get(t.id)! : layout.order.length + i }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.t);
}

/** New full order after dragging `from` onto `to`: lands after `to` when moving forward, before it when moving back. */
export function move(ids: string[], from: string, to: string): string[] {
  const out = ids.filter((id) => id !== from);
  out.splice(ids.indexOf(to), 0, from);
  return out;
}
