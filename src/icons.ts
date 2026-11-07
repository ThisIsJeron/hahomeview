// Icon names via HA's `frontend/get_icons`, SVG paths via HA's /static/mdi chunks (proxied). Nothing bundled.
// Port of HA frontend src/data/icons.ts (getEntityIcon) and src/data/iconsets.ts (findIconChunk).
import type { Connection } from "home-assistant-js-websocket";
import type { EntityEntry, EntityState } from "./rooms.ts";
import { computeDomain } from "./rooms.ts";

interface Translations {
  default?: string;
  state?: Record<string, string>;
  range?: Record<string, string>;
}
type IconResources = Record<string, Record<string, any>>;

const resourceCache = new Map<string, Promise<IconResources>>();
function getIcons(conn: Connection, category: string, integration?: string): Promise<IconResources> {
  const key = `${category}|${integration ?? ""}`;
  let p = resourceCache.get(key);
  if (!p) {
    p = conn
      .sendMessagePromise<{ resources: IconResources }>({ type: "frontend/get_icons", category, integration })
      .then((r) => r.resources);
    resourceCache.set(key, p);
  }
  return p;
}

function pick(t: Translations | undefined, state: string): string | undefined {
  if (!t) return undefined;
  const byState = t.state?.[state];
  if (byState) return byState;
  if (t.range) {
    const n = Number(state);
    if (!Number.isNaN(n)) {
      let best: string | undefined;
      for (const [k, v] of Object.entries(t.range).sort((a, b) => Number(a[0]) - Number(b[0]))) {
        if (n >= Number(k)) best = v;
      }
      if (best) return best;
    }
  }
  return t.default;
}

export async function resolveIconName(conn: Connection, entry: EntityEntry | undefined, s: EntityState): Promise<string> {
  if (s.attributes.icon) return s.attributes.icon;
  if (entry?.ic) return entry.ic;
  const domain = computeDomain(s.entity_id);
  if (entry?.tk && entry.pl) {
    const res = await getIcons(conn, "entity", entry.pl).catch(() => ({}) as IconResources);
    const icon = pick(res[entry.pl]?.[domain]?.[entry.tk], s.state);
    if (icon) return icon;
  }
  const res = await getIcons(conn, "entity_component").catch(() => ({}) as IconResources);
  const comp = res[domain];
  const icon = pick(comp?.[s.attributes.device_class] ?? comp?._, s.state);
  return icon ?? "mdi:bookmark";
}

interface Meta {
  version: string;
  parts: { start?: string; file: string }[];
}
const CACHE_KEY = "hv-icons";
let meta: Promise<Meta> | undefined;
let paths = new Map<string, string>();
const chunks = new Map<string, Promise<Record<string, string>>>();

function loadMeta(version: string): Promise<Meta> {
  if (!meta) {
    meta = fetch(`/static/mdi/iconMetadata.json?v=${encodeURIComponent(version)}`)
      .then((r) => r.json() as Promise<Meta>)
      .then((m) => {
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
          if (cached?.version === m.version) paths = new Map(Object.entries(cached.icons as Record<string, string>));
        } catch {}
        return m;
      });
  }
  return meta;
}

/** Same algorithm as HA's findIconChunk: last part whose `start` is undefined or <= name. */
export function findChunk(parts: Meta["parts"], name: string): string {
  let last = parts[0];
  for (const p of parts) {
    if (p.start !== undefined && name < p.start) break;
    last = p;
  }
  return last.file;
}

export async function iconPath(icon: string, haVersion: string): Promise<string | undefined> {
  const i = icon.indexOf(":");
  const prefix = icon.slice(0, i);
  const name = icon.slice(i + 1);
  if (!["mdi", "hass", "hassio", "hademo"].includes(prefix)) return undefined;
  const m = await loadMeta(haVersion);
  const hit = paths.get(name);
  if (hit) return hit;
  const file = findChunk(m.parts, name);
  let chunk = chunks.get(file);
  if (!chunk) {
    chunk = fetch(`/static/mdi/${file}.json`).then((r) => r.json());
    chunks.set(file, chunk);
  }
  const path = (await chunk)[name];
  if (path) {
    paths.set(name, path);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ version: m.version, icons: Object.fromEntries(paths) }));
    } catch {}
  }
  return path;
}

export const iconSvg = (path: string) => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${path}"/></svg>`;
