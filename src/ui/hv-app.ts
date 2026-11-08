import { LitElement, html, css, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { HassEntities } from "home-assistant-js-websocket";
import "./hv-clock.ts";
import "./hv-tile.ts";
import type { Home, Tile } from "../rooms.ts";
import { brightnessPercent, tapAction } from "../rooms.ts";
import type { HA } from "../ha.ts";
import { resolveIconName, iconPath, iconSvg } from "../icons.ts";
import { loadLayouts, saveLayouts, orderTiles, move, nextSize, sizeForSpan, SPAN, type Layouts, type Size } from "../layout.ts";
import { glassChip, glassLayers } from "./glass.ts";
import { pokeLens } from "../glass-lens.ts";

const CLOCK = "clock";
type Item = Tile | { id: typeof CLOCK };
const GAP = 14;

interface Press {
  x: number;
  y: number;
  id: string;
  page: string;
  moved: boolean;
  pointerId: number;
  /** Starting brightness when this press can dim. Absent for everything else. */
  dimFrom?: number;
  armed?: boolean;
  timer?: ReturnType<typeof setTimeout>;
  sentAt?: number;
  sentLevel?: number;
}
interface Drag { id: string; page: string; left: number; top: number; w: number; h: number; dx: number; dy: number; last?: string }
interface Resize { id: string; page: string; pointerId: number; left: number; top: number; x: number; y: number; moved: boolean }
interface Dim { id: string; level: number }

export class HvApp extends LitElement {
  static properties = {
    home: { attribute: false },
    states: { attribute: false },
    ha: { attribute: false },
    version: {},
    error: {},
    _page: { state: true },
    _icons: { state: true },
    _editing: { state: true },
    _layouts: { state: true },
    _drag: { state: true },
    _resize: { state: true },
    _dim: { state: true },
  };
  declare home?: Home;
  declare states: HassEntities;
  declare ha?: HA;
  declare version?: string;
  declare error?: string;
  declare _page: number;
  declare _icons: Map<string, string>; // "entity_id|state" -> svg markup
  declare _editing?: string; // page id in edit mode
  declare _layouts: Layouts;
  declare _drag?: Drag;
  declare _resize?: Resize;
  /** Live brightness while a short-hold drag is dimming a light. */
  declare _dim?: Dim;
  private _press?: Press;
  private _suppressClick = false;
  private _cols = 3;
  private _tile = 180;

  constructor() {
    super();
    this.states = {};
    this._page = 0;
    this._icons = new Map();
    this._layouts = loadLayouts();
    this.addEventListener("pointermove", this._onMove);
    this.addEventListener("pointerup", this._onUp);
    this.addEventListener("pointercancel", this._onUp);
    this.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  connectedCallback() {
    super.connectedCallback();
    new ResizeObserver(() => this._measure()).observe(this);
  }
  updated() {
    this._measure();
    pokeLens();
  }

  /** Fit the grid to the device: tiles are about a third of the short side, never under 150px. */
  private _measure() {
    const grid = this.renderRoot.querySelector(".grid") as HTMLElement | null;
    const w = grid ? grid.clientWidth : this.clientWidth - 32;
    if (!w) return;
    const target = Math.max(150, Math.min(w, this.clientHeight) / 3);
    const cols = Math.max(2, Math.min(8, Math.round((w + GAP) / (target + GAP))));
    const tile = Math.floor((w - GAP * (cols - 1)) / cols);
    if (cols === this._cols && tile === this._tile) return;
    this._cols = cols;
    this._tile = tile;
    this.style.setProperty("--cols", String(cols));
    this.style.setProperty("--tile", `${tile}px`);
  }

  static styles = [
    glassChip,
    css`
    :host { display: block; height: 100%; --cols: 3; --tile: 180px; }
    * { box-sizing: border-box; }
    .pages {
      display: flex;
      height: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .pages::-webkit-scrollbar { display: none; }
    .page {
      flex: 0 0 100%;
      height: 100%;
      scroll-snap-align: start;
      overflow-y: auto;
      padding: calc(env(safe-area-inset-top) + 16px) calc(env(safe-area-inset-right) + 16px)
        calc(env(safe-area-inset-bottom) + 40px) calc(env(safe-area-inset-left) + 16px);
    }
    h1 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 4px 6px 14px;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.35px;
    }
    h1 span { font-size: 20px; font-weight: 500; color: var(--text-2); }
    .glass-chip {
      --radius: 980px;
      --glass-rim: 2px;
      --glass-lens: 1;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 0;
      padding: 7px 14px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      overflow: hidden;
      color: var(--text);
      cursor: pointer;
      flex: none;
    }
    .glass-chip > span,
    .glass-chip > input { position: relative; z-index: 5; }
    h1 button.glass-chip { font-size: 16px; font-weight: 600; padding: 6px 16px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(var(--cols), var(--tile));
      grid-auto-rows: var(--tile);
      gap: ${GAP}px;
      justify-content: center;
    }
    .grid > * { min-width: 0; min-height: 0; }
    .slot {
      display: grid;
      min-width: 0;
      min-height: 0;
      position: relative;
    }
    .slot > hv-tile,
    .slot > hv-clock { width: 100%; height: 100%; }
    /* A tall cell stays two rows tall. The clock face stays a circle in the middle of it. */
    .slot[data-shape="tall"] > hv-clock {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
      align-self: center;
      justify-self: center;
    }
    .slot.editing { touch-action: none; }
    .slot.dragging {
      border-radius: var(--radius);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.95);
    }
    hv-clock[editing] { touch-action: none; animation: wiggle 0.35s ease-in-out infinite; }
    hv-tile[resizing],
    hv-clock[resizing] { animation: none; }
    hv-clock[dragging] { opacity: 0.35; animation: none; }
    @keyframes wiggle { 0%, 100% { transform: rotate(-0.8deg); } 50% { transform: rotate(0.8deg); } }
    .ghost {
      position: fixed;
      z-index: 10;
      pointer-events: none;
      transform: scale(1.05);
      border-radius: var(--radius);
      filter: drop-shadow(0 18px 36px var(--glass-shadow-lift));
    }
    .ghost { display: flex; align-items: center; justify-content: center; }
    .ghost > hv-tile { width: 100%; height: 100%; }
    .ghost > hv-clock { width: 100%; height: auto; aspect-ratio: 1; }
    .dots {
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(env(safe-area-inset-bottom) + 12px);
      display: flex;
      justify-content: center;
      gap: 7px;
      pointer-events: none;
    }
    .dots i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--text);
      opacity: 0.22;
      transition: opacity var(--duration) var(--ease-out), transform var(--duration) var(--ease-out);
    }
    .dots i.on { opacity: 0.85; transform: scale(1.15); }
    .pill {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      color: var(--text-2);
      padding: 24px;
      text-align: center;
    }
    @media (prefers-reduced-motion: reduce) {
      .dots i { transition: none; }
      hv-clock[editing] { animation: none; }
      .dots i.on { transform: none; }
    }
  `,
  ];

  private _onScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    this._page = Math.round(el.scrollLeft / el.clientWidth);
    pokeLens();
  }

  private _tap(tile: Tile) {
    if (this._editing || this._suppressClick) {
      this._suppressClick = false;
      return;
    }
    const s = this.states[tile.id];
    const action = s && tapAction(s);
    if (action && this.ha) this.ha.call(action, tile.id).catch(console.error);
  }

  // ---- short hold + vertical drag dims a light; a still long press edits; tap toggles ----
  private _brightnessOf(id: string): number | undefined {
    const s = this.states[id];
    return s ? brightnessPercent(s) : undefined;
  }

  private _isHandle(e: Event) {
    return e.composedPath().some((n) => n instanceof HTMLElement && n.classList.contains("handle"));
  }

  private _onDown(e: PointerEvent, id: string, page: string) {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    if (this._editing === page) {
      const r = el.getBoundingClientRect();
      try { el.setPointerCapture(e.pointerId); } catch {}
      if (this._isHandle(e)) {
        this._resize = { id, page, pointerId: e.pointerId, left: r.left, top: r.top, x: e.clientX, y: e.clientY, moved: false };
        this._suppressClick = true;
        return;
      }
      this._press = { x: e.clientX, y: e.clientY, id, page, moved: false, pointerId: e.pointerId };
      this._drag = { id, page, left: r.left, top: r.top, w: r.width, h: r.height, dx: 0, dy: 0 };
      return;
    }
    const dimFrom = this._brightnessOf(id);
    this._press = {
      x: e.clientX, y: e.clientY, id, page, moved: false, pointerId: e.pointerId,
      dimFrom,
      timer: setTimeout(() => this._onHold(), dimFrom == null ? 500 : 180),
    };
  }

  private _onHold() {
    const p = this._press;
    if (!p || p.moved || this._editing) return;
    if (p.dimFrom == null) {
      this._beginEdit(p);
      return;
    }
    p.armed = true;
    const el = (this.renderRoot as ShadowRoot).querySelector(`[data-id="${p.id}"]`) as HTMLElement | null;
    try { el?.setPointerCapture(p.pointerId); } catch {}
    p.timer = setTimeout(() => {
      if (this._press && !this._press.moved) this._beginEdit(this._press);
    }, 320);
  }

  private _beginEdit(p: Press) {
    clearTimeout(p.timer);
    this._press = undefined;
    this._dim = undefined;
    this._suppressClick = true;
    this._editing = p.page;
    (navigator as any).vibrate?.(10);
  }

  private _onMove = (e: PointerEvent) => {
    const rz = this._resize;
    if (rz && rz.pointerId === e.pointerId) {
      if (!rz.moved && Math.hypot(e.clientX - rz.x, e.clientY - rz.y) > 8) rz.moved = true;
      if (rz.moved) {
        const step = this._tile + GAP;
        this._setSize(rz.page, rz.id, sizeForSpan((e.clientX - rz.left) / step, (e.clientY - rz.top) / step));
      }
      return;
    }
    const p = this._press;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) > 8) {
      p.moved = true;
      clearTimeout(p.timer);
      if (p.armed && p.dimFrom != null) {
        this._suppressClick = true;
        if (e.cancelable) e.preventDefault();
        this._slideDim(p, e.clientY);
        return;
      }
      if (!this._drag) {
        this._press = undefined; // it was a scroll, not a hold
        return;
      }
    }
    if (p.armed && p.moved && p.dimFrom != null) {
      if (e.cancelable) e.preventDefault();
      this._slideDim(p, e.clientY);
      return;
    }
    if (!this._drag || !p.moved) return;
    this._drag = { ...this._drag, dx, dy };
    const under = (this.renderRoot as ShadowRoot).elementFromPoint(e.clientX, e.clientY);
    const target = under?.closest?.("[data-id]")?.getAttribute("data-id") ?? undefined;
    if (!target) this._drag.last = undefined;
    else if (target !== this._drag.id && target !== this._drag.last) {
      this._drag.last = target;
      this._reorder(p.page, this._drag.id, target);
    }
  };

  /** Up raises the level, down lowers it. One tile-height of travel covers the whole 0–100 range. */
  private _slideDim(p: Press, clientY: number) {
    const travel = Math.max(120, this._tile);
    const level = Math.max(0, Math.min(100, Math.round(p.dimFrom! + ((p.y - clientY) / travel) * 100)));
    this._dim = { id: p.id, level };
    this._pushDim(p, level, false);
  }

  private _pushDim(p: Press, level: number, done: boolean) {
    if (!this.ha) return;
    const now = performance.now();
    if (!done && p.sentLevel === level) return;
    if (!done && p.sentAt && now - p.sentAt < 80) return;
    p.sentAt = now;
    p.sentLevel = level;
    const call = level <= 0
      ? this.ha.call({ domain: "light", service: "turn_off" }, p.id)
      : this.ha.call({ domain: "light", service: "turn_on" }, p.id, { brightness_pct: level });
    call.catch(console.error);
  }

  private _onUp = () => {
    if (this._resize) {
      const rz = this._resize;
      this._resize = undefined;
      if (!rz.moved) this._cycleSize(rz.page, rz.id);
      return;
    }
    const p = this._press;
    this._press = undefined;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.armed && p.moved && this._dim) this._pushDim(p, this._dim.level, true);
    if (!p.moved) this._dim = undefined;
    else if (p.armed) this._dim = undefined;
    if (this._drag) {
      if (!p.moved) this._cycleSize(p.page, p.id);
      this._drag = undefined;
    }
  };

  private _layout(page: string) {
    return this._layouts[page] ?? { order: [], sizes: {} };
  }
  private _save(page: string, layout: Layouts[string]) {
    this._layouts = { ...this._layouts, [page]: layout };
    saveLayouts(this._layouts);
  }
  private _reorder(page: string, from: string, to: string) {
    const ids = this._items(page).map((i) => i.id);
    this._save(page, { ...this._layout(page), order: move(ids, from, to) });
  }
  private _setSize(page: string, id: string, size: Size) {
    const l = this._layout(page);
    if ((l.sizes[id] ?? "S") === size) return;
    this._save(page, { ...l, sizes: { ...l.sizes, [id]: size } });
  }
  private _cycleSize(page: string, id: string) {
    this._setSize(page, id, nextSize(this._layout(page).sizes[id]));
  }
  private _items(page: string): Item[] {
    if (!this.home) return [];
    const base: Item[] = page === "home" ? [{ id: CLOCK }, ...this.home.favorites] : this.home.rooms.find((r) => r.id === page)?.tiles ?? [];
    return orderTiles(base, this._layouts[page]);
  }

  /** While a finger is dimming, the bar follows the finger. At rest a light is full-on or empty. */
  private _withDim(tile: Tile): Tile {
    if (!this._dim || this._dim.id !== tile.id) return tile;
    const level = this._dim.level;
    return {
      ...tile,
      active: level > 0,
      state: level > 0 ? "on" : "off",
      stateText: level > 0 ? `${level}%` : "Off",
      fill: level > 0 ? level : undefined,
    };
  }

  private _icon(tile: Tile): string | undefined {
    const key = `${tile.id}|${tile.state}`;
    const hit = this._icons.get(key);
    if (hit !== undefined) return hit;
    const s = this.states[tile.id];
    if (!s || !this.ha) return undefined;
    this._icons.set(key, ""); // in flight
    resolveIconName(this.ha.conn, tile.entry, s)
      .then((name) => iconPath(name, this.version ?? "0"))
      .then((path) => {
        this._icons.set(key, path ? iconSvg(path) : "");
        this.requestUpdate();
      })
      .catch(console.error);
    return undefined;
  }

  private _grid(page: string, subtitle: "room" | "state") {
    const editing = this._editing === page;
    const sizes = this._layout(page).sizes;
    const spanOf = (id: string): [number, number] => {
      const [c, r] = SPAN[sizes[id] ?? "S"];
      return [Math.min(c, this._cols), r];
    };
    const span = (id: string) => {
      const [c, r] = spanOf(id);
      return `grid-column: span ${c}; grid-row: span ${r}`;
    };
    return html`<div class="grid">
      ${repeat(
        this._items(page),
        (i) => i.id,
        (i) => {
          const [cols, rows] = spanOf(i.id);
          const dragging = this._drag?.id === i.id;
          return html`<div
            class="slot ${editing ? "editing" : ""} ${dragging ? "dragging" : ""}"
            data-id=${i.id}
            data-shape=${rows > cols ? "tall" : "square"}
            style=${span(i.id)}
            @pointerdown=${(e: PointerEvent) => this._onDown(e, i.id, page)}
          >
            ${"name" in i
              ? html`<hv-tile
                  .tile=${this._withDim(i)}
                  .iconPath=${this._icon(i)}
                  .size=${(sizes[i.id] ?? "S") as Size}
                  subtitle=${subtitle}
                  ?editing=${editing}
                  ?dragging=${dragging}
                  ?resizing=${this._resize?.id === i.id}
                  ?readonly=${!this.states[i.id] || !tapAction(this.states[i.id])}
                  @click=${() => this._tap(i)}
                ></hv-tile>`
              : html`<hv-clock
                  .size=${(sizes[i.id] ?? "S") as Size}
                  ?editing=${editing}
                  ?dragging=${dragging}
                  ?resizing=${this._resize?.id === i.id}
                ></hv-clock>`}
          </div>`;
        }
      )}
    </div>`;
  }

  private _ghost() {
    const d = this._drag;
    if (!d || !d.dx && !d.dy) return nothing;
    const item = this._items(d.page).find((i) => i.id === d.id);
    if (!item) return nothing;
    const style = `left:${d.left}px;top:${d.top}px;width:${d.w}px;height:${d.h}px;transform:translate(${d.dx}px,${d.dy}px) scale(1.06)`;
    const sizes = this._layout(d.page).sizes;
    return html`<div class="ghost" style=${style}>
      ${"name" in item
        ? html`<hv-tile .tile=${item} .iconPath=${this._icon(item)} .size=${(sizes[item.id] ?? "S") as Size} subtitle=${d.page === "home" ? "room" : "state"}></hv-tile>`
        : html`<hv-clock></hv-clock>`}
    </div>`;
  }

  private _title(page: string, text: string, extra?: unknown) {
    return html`<h1>
      <span style="font: inherit; color: inherit">${text}</span>
      ${this._editing === page
        ? html`<button class="glass-chip" @click=${() => (this._editing = undefined)}>${glassLayers()}<span>Done</span></button>`
        : extra ?? nothing}
    </h1>`;
  }

  render() {
    if (this.error) return html`<div class="pill">${this.error}</div>`;
    if (!this.home) return html`<div class="pill">Connecting to Home Assistant…</div>`;
    const pages = 1 + this.home.rooms.length;
    return html`
      <div class="pages" @scroll=${this._onScroll}>
        <section class="page">
          ${this._title("home", "Home")}
          ${this._grid("home", "room")}
        </section>
        ${this.home.rooms.map(
          (room) => html`<section class="page">
            ${this._title(room.id, room.name, room.temperature ? html`<span>${room.temperature}</span>` : nothing)}
            ${this._grid(room.id, "state")}
          </section>`
        )}
      </div>
      ${this._ghost()}
      <div class="dots">${[...Array(pages)].map((_, i) => html`<i class=${i === this._page ? "on" : ""}></i>`)}</div>`;
  }
}
customElements.define("hv-app", HvApp);
