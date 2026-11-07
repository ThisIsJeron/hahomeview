import { LitElement, html, css, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { HassEntities } from "home-assistant-js-websocket";
import "./hv-clock.ts";
import "./hv-tile.ts";
import type { Home, Tile } from "../rooms.ts";
import { tapAction } from "../rooms.ts";
import type { HA } from "../ha.ts";
import { resolveIconName, iconPath, iconSvg } from "../icons.ts";

export class HvApp extends LitElement {
  static properties = {
    home: { attribute: false },
    states: { attribute: false },
    ha: { attribute: false },
    version: {},
    error: {},
    _page: { state: true },
    _icons: { state: true },
  };
  declare home?: Home;
  declare states: HassEntities;
  declare ha?: HA;
  declare version?: string;
  declare error?: string;
  declare _page: number;
  declare _icons: Map<string, string>; // "entity_id|state" -> svg markup

  constructor() {
    super();
    this.states = {};
    this._page = 0;
    this._icons = new Map();
  }

  static styles = css`
    :host { display: block; height: 100%; }
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
    h1 { display: flex; align-items: baseline; justify-content: space-between; margin: 4px 6px 14px; font-size: 28px; font-weight: 700; letter-spacing: -0.3px; }
    h1 span { font-size: 20px; font-weight: 500; color: var(--text-2); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
    .dots { position: fixed; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom) + 12px); display: flex; justify-content: center; gap: 7px; pointer-events: none; }
    .dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--text); opacity: 0.25; }
    .dots i.on { opacity: 0.8; }
    .pill { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 17px; color: var(--text-2); padding: 24px; text-align: center; }
  `;

  private _onScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    this._page = Math.round(el.scrollLeft / el.clientWidth);
  }

  private _tap(tile: Tile) {
    const s = this.states[tile.id];
    const action = s && tapAction(s);
    if (action && this.ha) this.ha.call(action, tile.id).catch(console.error);
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

  private _tiles(tiles: Tile[], subtitle: "room" | "state") {
    return repeat(
      tiles,
      (t) => t.id,
      (t) => html`<hv-tile
        .tile=${t}
        .iconPath=${this._icon(t)}
        subtitle=${subtitle}
        ?readonly=${!this.states[t.id] || !tapAction(this.states[t.id])}
        @click=${() => this._tap(t)}
      ></hv-tile>`
    );
  }

  render() {
    if (this.error) return html`<div class="pill">${this.error}</div>`;
    if (!this.home) return html`<div class="pill">Connecting to Home Assistant…</div>`;
    const pages = 1 + this.home.rooms.length;
    return html`
      <div class="pages" @scroll=${this._onScroll}>
        <section class="page">
          <h1>Home</h1>
          <div class="grid">
            <hv-clock></hv-clock>
            ${this._tiles(this.home.favorites, "room")}
          </div>
        </section>
        ${this.home.rooms.map(
          (room) => html`<section class="page">
            <h1>${room.name} ${room.temperature ? html`<span>${room.temperature}</span>` : nothing}</h1>
            <div class="grid">${this._tiles(room.tiles, "state")}</div>
          </section>`
        )}
      </div>
      <div class="dots">${[...Array(pages)].map((_, i) => html`<i class=${i === this._page ? "on" : ""}></i>`)}</div>`;
  }
}
customElements.define("hv-app", HvApp);
