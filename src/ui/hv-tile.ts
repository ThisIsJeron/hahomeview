import { LitElement, html, css, nothing } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { glass } from "./glass.ts";
import type { Tile } from "../rooms.ts";

export class HvTile extends LitElement {
  static properties = { tile: { attribute: false }, iconPath: { attribute: false }, subtitle: {}, size: { reflect: true } };
  declare tile: Tile;
  declare iconPath?: string;
  /** "room" on the Home page, "state" inside a room. */
  declare subtitle: "room" | "state";
  declare size: "S" | "M" | "L";

  static styles = [
    glass,
    css`
      :host {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        -webkit-user-drag: none;
        transition: transform 0.12s ease;
      }
      :host(:active) { transform: scale(0.96); }
      :host([active]) { background: var(--tint); color: var(--tint-text); --icon: var(--tint-text); }
      :host([active][group="actions"]) { background: var(--tint-warm); color: var(--tint-warm-text); --icon: var(--tint-warm-text); }
      :host([readonly]) { cursor: default; }
      :host([image]) { padding: 0; justify-content: flex-end; align-items: flex-start; color: #fff; }
      img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      :host([image]) .text { position: relative; padding: 10px 12px; width: 100%; text-align: left;
        background: linear-gradient(transparent, rgba(0,0,0,0.5)); }
      .icon { width: 38%; height: 38%; color: var(--icon); margin-bottom: 4px; }
      .icon svg { width: 100%; height: 100%; }
      .text { width: 100%; min-width: 0; }
      .name { font-size: 13px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .sub { font-size: 11px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .sub:empty { display: none; }

      /* M = wide: icon left, text right. L = big: larger type. */
      :host([size="M"]) { flex-direction: row; gap: 14px; padding: 14px 20px; text-align: left; }
      :host([size="M"]) .icon { width: 22%; height: 46%; margin: 0; flex: none; }
      :host([size="M"]) .name, :host([size="L"]) .name { font-size: 16px; }
      :host([size="M"]) .sub, :host([size="L"]) .sub { font-size: 13px; }
      :host([size="L"]) .icon { width: 32%; height: 32%; margin-bottom: 10px; }

      /* Edit mode: wiggle, size badge, no browser scrolling on the tile. */
      :host([editing]) { touch-action: none; animation: wiggle 0.35s ease-in-out infinite; }
      :host([editing]:active) { transform: none; }
      :host([dragging]) { opacity: 0.3; animation: none; }
      .badge { display: none; position: absolute; top: 8px; right: 8px; min-width: 22px; height: 22px; padding: 0 6px;
        border-radius: 11px; background: var(--text); color: var(--glass); font-size: 12px; font-weight: 700;
        align-items: center; justify-content: center; opacity: 0.85; }
      :host([editing]) .badge { display: flex; }
      @keyframes wiggle {
        0%, 100% { transform: rotate(-0.8deg); }
        50% { transform: rotate(0.8deg); }
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
      ${t.image ? html`<img src=${t.image} alt="" draggable="false" />` : html`<div class="icon">${this.iconPath ? unsafeSVG(this.iconPath) : nothing}</div>`}
      <div class="text">
        <div class="name">${t.name}</div>
        <div class="sub">${sub}</div>
      </div>
      <div class="badge">${this.size ?? "S"}</div>`;
  }
}
customElements.define("hv-tile", HvTile);
