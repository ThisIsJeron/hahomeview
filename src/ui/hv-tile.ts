import { LitElement, html, css, nothing } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { glass, glassLayers } from "./glass.ts";
import { editChrome, editHandle } from "./edit-chrome.ts";
import { SIZE_LABEL, type Size } from "../layout.ts";
import type { Tile } from "../rooms.ts";

export class HvTile extends LitElement {
  static properties = { tile: { attribute: false }, iconPath: { attribute: false }, subtitle: {}, size: { reflect: true } };
  declare tile: Tile;
  declare iconPath?: string;
  /** "room" on the Home page, "state" inside a room. */
  declare subtitle: "room" | "state";
  declare size: Size;

  static styles = [
    glass,
    editChrome,
    css`
      :host {
        box-sizing: border-box;
        display: block;
        cursor: pointer;
        -webkit-user-drag: none;
      }
      /* Padding lives here so the level fill's box is the full tile, not the content box. */
      .body {
        position: absolute;
        inset: 0;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        box-sizing: border-box;
        padding: 10px;
        text-align: center;
        pointer-events: none;
      }
      :host([readonly]) { cursor: default; }

      :host([active]) {
        --surface-alpha: var(--glass-opacity-on);
        color: var(--glass-text-on);
        --_icon: var(--glass-text-on);
      }
      :host([active]) .sub { color: var(--glass-secondary-on); }
      .sub { color: var(--glass-secondary-off); }
      @media (prefers-color-scheme: dark) {
        :host(:not([active])) .icon,
        :host(:not([active])) .text {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
        }
      }

      :host([group="lights"]) { --fill-color: rgba(255, 196, 48, 0.88); }
      :host([group="covers"]) { --fill-color: rgba(96, 140, 176, 0.55); }
      :host([group="others"]) { --fill-color: rgba(170, 206, 255, 0.72); }
      :host([group="media"]) { --fill-color: rgba(255, 170, 210, 0.6); }
      :host([group="climate"]) { --fill-color: rgba(255, 150, 90, 0.55); }

      :host([image]) {
        color: #fff;
        --_icon: #fff;
      }
      :host([image]) .body {
        padding: 0;
        justify-content: flex-end;
        align-items: flex-start;
      }
      img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
      }
      :host([image]) .lens,
      :host([image]) .fill { display: none; }
      :host([image]) .surface {
        inset: 0;
        border-radius: inherit;
        box-shadow: none;
        background: linear-gradient(transparent 46%, rgba(0, 0, 0, 0.5));
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        -webkit-mask-image: none;
        mask-image: none;
      }
      :host([image]) .text {
        position: relative;
        z-index: 5;
        padding: 10px 12px;
        width: 100%;
        text-align: left;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
      }
      :host([image]) { --surface-alpha: 0.12; color: #fff; --_icon: #fff; }
      :host([image]) .fill { display: none; }
      :host([image]) .text { filter: none; }

      .icon {
        position: relative;
        z-index: 5;
        width: 38%;
        height: 38%;
        color: var(--_icon);
        margin-bottom: 4px;
        transition: color var(--duration) var(--ease-out);
      }
      .icon svg { width: 100%; height: 100%; }
      .text { position: relative; z-index: 5; width: 100%; min-width: 0; }
      .name {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.15px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .sub {
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .sub:empty { display: none; }

      /* W is a wide 2×1: icon on the left. M is a tall 1×2. L is 2×2. */
      :host([size="W"]) .body { flex-direction: row; gap: 14px; padding: 14px 20px; text-align: left; }
      :host([size="W"]) .icon { width: auto; height: 52%; aspect-ratio: 1; margin: 0; flex: none; }
      :host([size="W"]) .text { width: auto; flex: 1; min-width: 0; text-align: left; }
      :host([size="W"]) .name, :host([size="M"]) .name, :host([size="L"]) .name { font-size: 16px; }
      :host([size="W"]) .sub, :host([size="M"]) .sub, :host([size="L"]) .sub { font-size: 13px; }
      :host([size="M"]) .icon { width: 42%; height: auto; aspect-ratio: 1; margin-bottom: 10px; }
      :host([size="L"]) .icon { width: 32%; height: auto; aspect-ratio: 1; margin-bottom: 10px; }

      /* Edit mode: wiggle, size badge, no browser scrolling on the tile. */
      :host([editing]) { touch-action: none; animation: wiggle 0.35s ease-in-out infinite; }
      :host([editing]:active) { transform: none; filter: none; }
      :host([dragging]) { opacity: 0.35; animation: none; filter: none; }
      :host([resizing]) { animation: none; }
      .badge {
        display: none;
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 6;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 11px;
        background: rgba(28, 28, 30, 0.78);
        color: #f2f2f7;
        font-size: 12px;
        font-weight: 700;
        align-items: center;
        justify-content: center;
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
      }
      @media (prefers-color-scheme: dark) {
        .badge { background: rgba(245, 245, 247, 0.88); color: #1c1c1e; }
      }
      :host([editing]) .badge { display: flex; }

      @keyframes wiggle {
        0%, 100% { transform: rotate(-0.8deg); }
        50% { transform: rotate(0.8deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        :host([editing]) { animation: none; }
      }
    `,
  ];

  willUpdate() {
    const t = this.tile;
    this.toggleAttribute("active", t.active);
    this.toggleAttribute("image", !!t.image);
    this.setAttribute("group", t.group);
  }

  render() {
    const t = this.tile;
    const sub = this.subtitle === "room" ? t.room ?? "" : t.stateText;
    return html`
      ${glassLayers(t.fill ?? 0)}
      ${t.image ? html`<img src=${t.image} alt="" draggable="false" />` : nothing}
      <div class="body">
        ${t.image ? nothing : html`<div class="icon">${this.iconPath ? unsafeSVG(this.iconPath) : nothing}</div>`}
        <div class="text">
          <div class="name">${t.name}</div>
          <div class="sub">${sub}</div>
        </div>
        <div class="badge">${SIZE_LABEL[(this.size ?? "S") as Size]}</div>
      </div>
      ${editHandle}`;
  }
}
customElements.define("hv-tile", HvTile);
