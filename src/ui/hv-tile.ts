import { LitElement, html, css, nothing } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { glass } from "./glass.ts";
import type { Tile } from "../rooms.ts";

export class HvTile extends LitElement {
  static properties = { tile: { attribute: false }, iconPath: { attribute: false }, subtitle: {} };
  declare tile: Tile;
  declare iconPath?: string;
  /** "room" on the Home page, "state" inside a room. */
  declare subtitle: "room" | "state";

  static styles = [
    glass,
    css`
      :host {
        aspect-ratio: 1;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        transition: transform 0.12s ease, background-color 0.2s ease;
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
      ${t.image ? html`<img src=${t.image} alt="" />` : html`<div class="icon">${this.iconPath ? unsafeSVG(this.iconPath) : nothing}</div>`}
      <div class="text">
        <div class="name">${t.name}</div>
        <div class="sub">${sub}</div>
      </div>`;
  }
}
customElements.define("hv-tile", HvTile);
